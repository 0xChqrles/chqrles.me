---
id: modele-entier
---
FlashProve ne prouve pas Llama 4 Maverick en virgule flottante. Il prouve une fonction à nombres entiers qui a la forme de ce modèle, définie dans `docs/model.md` : des poids entiers, des activations en [[virgule-fixe|virgule fixe]] et des tables pour les fonctions non linéaires. On cherche quelles opérations cette fonction contient au-delà d'un produit, d'un arrondi, d'une activation par table et d'un [[argmax|argmax]], et comment chacune devient des égalités et des contrôles d'intervalle.

On fixe d'abord la taille des nombres et la façon dont FlashProve les écrit en octets. On prend ensuite les opérations dans l'ordre d'une couche : les produits et leurs arrondis, la norme, qui demande une somme plus grande que $p$, une racine carrée et une division, puis la fonction SiLU, la rotation RoPE et le routeur des experts. On finit par la tête et par l'écart entre ce modèle et le modèle en virgule flottante.

## Les nombres

Chaque matrice de poids est convertie avec un exposant par tenseur. Pour une valeur décodée $\pi$, le poids vaut $w = \mathrm{RNE}(2^e \pi)$, où RNE arrondit à l'entier le plus proche, et $e$ est le plus grand exposant pour lequel le plus grand $|\pi|$ du tenseur donne au plus 4 095 (`docs/model.md` §11.4). Chaque poids vaut donc au plus 4 095 en valeur absolue : c'est un entier de 13 bits avec signe. Les entrées de la table de plongement, qui associe un vecteur à chaque token, sont des nombres de quatre octets signés (§3). Les sorties des normes, les requêtes, les clés et les valeurs de l'attention sont ramenées dans $[-2047, 2047]$, soit 12 bits avec signe, par $\mathrm{clamp}(x; 2047) = \min(\max(x, -2047), 2047)$ (§1).

Le prouveur ne s'engage pas sur ces nombres directement. Il écrit chaque valeur en base 256 avec des chiffres signés, les **limbes** :

$$v = \sum_{lb} 256^{lb}\, c_{lb}$$

Chaque limbe $c_{lb}$ est une **cellule**, un entier que le prouveur engage (format 11.2, « Tensors and cells »). Chez le prouveur honnête, une cellule est un octet signé, de $-128$ à 127 (format 11.1, « The honest prover »). Les valeurs du flux résiduel, la somme qui traverse toutes les couches, ont 5 limbes, et la plupart des autres valeurs en ont 2 (D2 §6.1).

:::exercice ★
Quelle est la plus grande valeur qu'on écrit avec 2 limbes ? Avec 5 limbes ? Comparez la seconde à $2^{39}$.

:::reponse
La valeur est la plus grande quand chaque limbe vaut 127 :

$$
\begin{aligned}
127 \times (1 + 256) &= 32\,639 \\
127 \times (1 + 256 + 256^2 + 256^3 + 256^4) &= 547\,599\,908\,735
\end{aligned}
$$

La seconde est juste sous $2^{39} = 549\,755\,813\,888$. Ce sont les bornes que les prouveurs de FlashProve acceptent (`docs/model.md` §9). Pour les valeurs que le modèle borne, comme le quotient d'une norme, il est défini jusqu'à 32 767, et entre 32 640 et 32 767 les prouveurs ne font pas de preuve.
:::
:::

FlashProve ne donne pas de raison pour ce choix des octets ; le cours le lit à partir des égalités à prouver. Le vérifieur les contrôle modulo $p$, et une égalité modulo $p$ n'est une égalité entre entiers que si ses deux côtés sont petits devant $p$ ([[entiers-signes]]). Or une affirmation multiplie souvent deux cellules et additionne beaucoup de ces produits.

:::exercice ★★
Dans Goldilocks, $p \approx 2^{64}$. Combien de produits de deux cellules peut-on additionner avant que la somme risque de dépasser $p/2$, si les cellules sont des octets signés ? Si ce sont des entiers signés de 32 bits ? De 64 bits ?

:::reponse
Avec des octets, un produit vaut au plus $128^2 = 2^{14}$ en valeur absolue. Une somme de $n$ produits reste sous $p/2 \approx 2^{63}$ tant que $n \cdot 2^{14} < 2^{63}$, soit environ $2^{49}$ produits.

Avec 32 bits, un produit atteint $2^{31} \times 2^{31} = 2^{62}$, et deux produits atteignent $2^{63}$, au-delà de $p/2$ : un seul produit est sûr. Avec 64 bits, un seul produit dépasse déjà $p$ de très loin.
:::
:::

FlashProve écrit donc toute valeur en octets. Son test de petitesse ([[test-petitesse]]) montre que chaque cellule reste sous $2^{18}$ en valeur absolue, une borne plus large qu'un octet mais assez petite pour que ces sommes ne fassent pas le tour du corps. Le vérifieur contrôle aussi, sur les paramètres publics, des conditions de non-débordement de ce type (format 11.1, « The relations among the constants »).

## Les produits et leurs arrondis

Un produit par une matrice de poids est suivi d'un arrondi par décalage :

$$\rq(A, k) = \lfloor (A + 2^{k-1}) / 2^k \rfloor$$

C'est la division par $2^k$ arrondie au plus proche, les moitiés vers le haut (`docs/model.md` §1). La page [[intervalles|Contrôles d'intervalle]] l'a prouvée par un quotient engagé et un reste $A + 2^{k-1} - 2^k \rq(A, k)$ montré dans $[0, 2^k)$ ; FlashProve appelle chacun de ces arrondis un *rounding site* (format 11.2, « A rounding site »). Le produit $A$ lui-même n'a pas de cellule. Il n'existe que dans la clé qui contrôle le reste, et un sumcheck sur l'indice intérieur ([[sumcheck-matrices]]) le ramène à une affirmation sur les poids (D2 §2.1).

## La norme

Chaque couche commence par une norme, qui ramène une ligne $x$ de $d$ valeurs du flux à une échelle fixe. En réels, elle divise chaque valeur par la racine de la somme des carrés. FlashProve l'écrit ainsi en entiers (`docs/model.md` §5) :

$$
\begin{aligned}
V_x &= \textstyle\sum_k x_k^2 \\
\sigma &= \mathrm{isqrt}(V_x + \epsilon) \\
R_c &= \lfloor (2^M + \lfloor \sigma/2 \rfloor) / \sigma \rfloor \\
w_k &= \rq(x_k R_c, K) \\
n_k &= \mathrm{clamp}(w_k; 2047)
\end{aligned}
$$

$\mathrm{isqrt}(a)$ est le plus grand entier $r$ tel que $r^2 \le a$, et $\epsilon \ge 1$, $M$ et $K$ sont des paramètres publics de la couche. $R_c$ vaut $2^M/\sigma$ arrondi au plus proche, donc la ligne fait une seule division : chaque valeur est ensuite multipliée par $R_c$, et le décalage de $K$ bits ramène l'échelle. Trois étapes demandent plus que ce qu'on a : $V_x$ ne tient pas dans le corps, et la racine et la division ne sont pas des polynômes.

### Une somme plus grande que p

D'après l'exercice 1, une valeur du flux vaut moins de $2^{39}$ en valeur absolue, donc son carré peut approcher $2^{78}$, bien au-delà de $p < 2^{64}$. Le modèle n'est défini que si $V_x + \epsilon < 2^{78}$ (`docs/model.md` §9, condition 1). Cette somme ne tient pas dans le corps, et une égalité modulo $p$ sur $V_x$ ne dirait rien de l'entier.

On calcule donc $V_x$ comme une multiplication posée, en base 256. On part des limbes $x = \sum_{lb} 256^{lb} x_{lb}$. En développant le carré, les produits $x_{lb}\, x_{lb'}$ de même rang $s = lb + lb'$ se regroupent :

$$x^2 = \sum_s 256^s\, W_s, \qquad W_s = \sum_{lb + lb' = s} x_{lb}\, x_{lb'}$$

Cette suite $W_s$ s'appelle la **convolution** des limbes. Pour une ligne, on additionne aussi sur $k$, et $W_s$ devient $\sum_k \sum_{lb + lb' = s} x_{k, lb}\, x_{k, lb'}$. Chaque $W_s$ est une somme de produits d'octets, donc il reste petit devant $p$ (exercice 2). C'est la somme pondérée $\sum_s 256^s W_s$ qui déborde.

Le prouveur engage les octets $D_s$ de $V_x$ et des retenues $c_s$, et on contrôle l'addition posée chiffre par chiffre, avec $c_0 = 0$ (format 11.2, groupe 5 ; D2 §6.2) :

$$W_s + c_s - D_s - 256\, c_{s+1} = 0$$

Chaque terme de cette égalité est petit, donc elle tient entre entiers. On multiplie la ligne $s$ par $256^s$ et on additionne toutes les lignes. Le terme $256^s c_s$ apparaît avec le signe $+$ dans la ligne $s$ et avec le signe $-$ dans la ligne $s - 1$, donc les retenues s'annulent deux à deux. Si la dernière retenue est nulle, il reste :

$$\sum_s 256^s\, W_s = \sum_s 256^s\, D_s$$

$V_x$ est donc l'entier dont les octets sont les $D_s$, et chaque octet est contrôlé dans une table de 256 lignes. Toutes les $W_s$ d'une ligne se prouvent d'un coup : en remplaçant 256 par un défi $\gamma$, le produit de $\sum_{lb} \gamma^{lb} x_{lb}$ par lui-même vaut $\sum_s \gamma^s W_s$, et un seul sumcheck de produit contrôle cette égalité en un point (format 11.2, étape 6 dans « The start forms and the equality points of the sumchecks », et groupe 2 des affirmations).

:::exercice ★★
Prenez une seule valeur, $x = 300$, de limbes $(44, 1)$. Calculez $W_0$, $W_1$, $W_2$, les octets de $300^2$ et les retenues, puis vérifiez les trois égalités $W_s + c_s - D_s - 256\, c_{s+1} = 0$.

:::reponse
$W_0 = 44^2 = 1936$, $W_1 = 2 \times 44 \times 1 = 88$, $W_2 = 1^2 = 1$.

$300^2 = 90\,000 = 1 \times 65\,536 + 95 \times 256 + 144$, donc les octets sont $(D_0, D_1, D_2) = (144, 95, 1)$.

$$
\begin{aligned}
1936 + 0 &= 144 + 256 \times 7 && c_1 = 7 \\
88 + 7 &= 95 + 256 \times 0 && c_2 = 0 \\
1 + 0 &= 1 + 256 \times 0 && c_3 = 0
\end{aligned}
$$
:::
:::

:::exercice ★★
Même calcul pour $x = 200$, écrit avec les limbes signés $(-56, 1)$. Que remarquez-vous sur les retenues ?

:::reponse
$W_0 = (-56)^2 = 3136$, $W_1 = 2 \times (-56) \times 1 = -112$, $W_2 = 1$. On a $200^2 = 40\,000 = 156 \times 256 + 64$, donc les octets sont $(64, 156, 0)$.

$$
\begin{aligned}
3136 + 0 &= 64 + 256 \times 12 && c_1 = 12 \\
-112 + 12 &= 156 + 256 \times (-1) && c_2 = -1 \\
1 - 1 &= 0 + 256 \times 0 && c_3 = 0
\end{aligned}
$$

Une retenue peut être négative, puisqu'un limbe signé donne des $W_s$ négatifs.
:::
:::

Une retenue a donc un signe. FlashProve écrit chacune en six octets, moins un décalage de $2^{47}$ (format 11.2, « A norm's row of digits », ligne $c_s$).

### La racine et la division

La page [[intervalles|Contrôles d'intervalle]] a prouvé une racine entière par deux écarts : $\sigma = \mathrm{isqrt}(V)$ si et seulement si $l_1 = V - \sigma^2 \ge 0$ et $h_1 = 2\sigma - l_1 \ge 0$, puisque $(\sigma + 1)^2 - 1 - \sigma^2 = 2\sigma$. FlashProve prend ces deux écarts avec $V = V_x + \epsilon$ et les écrit en octets, donc ils sont positifs (format 11.2, « A norm's row of digits »). Pour $V = 50$, ils valent $\sigma = 7$, $l_1 = 1$ et $h_1 = 13$.

Il reste la division $R_c = \lfloor N/\sigma \rfloor$, avec $N = 2^M + \lfloor \sigma/2 \rfloor$. On cherche, comme pour la racine, deux écarts positifs qui encadrent le résultat. Le reste de la division est le premier candidat : on pose $rr = N - R\sigma$ et $rq = \sigma - 1 - rr$.

:::exercice ★
Avec $V = 50$ et $M = 6$, calculez $N$, $R = \lfloor N/\sigma \rfloor$, $rr$ et $rq$. Comparez $R$ à $2^M/\sigma$.

:::reponse
$\sigma = 7$, donc $N = 64 + 3 = 67$ et $R = \lfloor 67/7 \rfloor = 9$. Alors $rr = 67 - 63 = 4$ et $rq = 7 - 1 - 4 = 2$, tous deux positifs. $2^M/\sigma = 64/7 \approx 9{,}14$, dont l'arrondi au plus proche est bien 9.
:::
:::

:::exercice ★★★
Montrez que $rr \ge 0$ et $rq \ge 0$ si et seulement si $R = \lfloor N/\sigma \rfloor$.

:::reponse
$rq \ge 0$ s'écrit $rr \le \sigma - 1$. Les deux conditions disent donc :

$$0 \le N - R\sigma \le \sigma - 1$$

c'est-à-dire $R\sigma \le N < (R + 1)\sigma$, ou encore $R \le N/\sigma < R + 1$. C'est la définition de $R = \lfloor N/\sigma \rfloor$. Réciproquement, si $R$ est ce quotient, $rr$ est le reste de la division de $N$ par $\sigma$, qui est dans $[0, \sigma - 1]$.
:::
:::

FlashProve engage ces deux écarts en octets, sous les noms `rr` et `rq` (format 11.2, « A norm's row of digits » ; D2 §6.2). La fin de la norme ne demande rien de nouveau : $w_k = \rq(x_k R_c, K)$ est un arrondi par décalage, et le `clamp` est lu dans une table à deux colonnes (format 11.2, clés `CN1` et `CN2`).

## SiLU, une fonction lue dans une table

Le bloc feed-forward applique la fonction SiLU, $z / (1 + e^{-z})$, à une clé entière. FlashProve la donne par une table de 65 536 lignes, calculée une fois en double précision (`docs/model.md` §4, table 3). La paire (argument, valeur) doit être une ligne de la table. Pour réunir ses deux colonnes en une seule clé, FlashProve ne tire pas de défi : il les empaquette dans un seul nombre. La ligne $t$ vaut $t + 2^{28}(s(t) + 4096)$, où $s(t)$ est la valeur de la table en $t - 2^{15}$, et la clé $(y + 2^{15}) + 2^{28}(sl + 2^{12})$, où $y$ est l'argument et $sl$ la valeur lue (format 11.1, « Public tables » ; format 11.2, clé `F`).

Avec les décalages $2^{15}$ et $2^{12}$, les deux colonnes sont positives, et la première vaut moins de $2^{16}$, donc moins que $2^{28}$ : un nombre de la table donne une seule paire. Cela ne vaut que si la clé ne fait pas le tour du corps, et c'est la borne sur les cellules qui l'assure ([[test-petitesse]] ; le [[tables|chapitre 7]] montre l'attaque sans cette borne).

## RoPE, une rotation sans table

Avant l'attention, les requêtes et les clés tournent d'un angle qui dépend de la position. Dans chaque tête, la paire d'entrées $(A_0, A_1)$ devient (`docs/model.md` §6, étape 2) :

$$p_0 = C A_0 - S A_1, \qquad p_1 = S A_0 + C A_1$$

$C$ et $S$ sont un cosinus et un sinus multipliés par $2^{12}$ et arrondis, lus dans des tables publiques. La rotation n'a pas besoin de lookup, parce qu'elle est linéaire. $A_0$ et $A_1$ sont deux colonnes d'un produit par $W_q$, $A_0 = \sum_k a_k W_q[k][2i]$ et $A_1 = \sum_k a_k W_q[k][2i+1]$, donc :

$$p_0 = \sum_k a_k \big( C\, W_q[k][2i] - S\, W_q[k][2i+1] \big)$$

$p_0$ est le produit de $a$ par une combinaison publique de deux colonnes de $W_q$. FlashProve place $C$ et $S$ dans le facteur public de l'affirmation sur les poids (format 11.2, « The factors of the queries and keys » ; D2 §2.3), et la rotation ne demande aucune cellule.

## Le routeur des experts

Les couches impaires sont des couches à experts. Un routeur calcule un score $lr_e$ pour chacun des 128 experts, et la couche n'utilise que l'expert $e^*$ de plus grand score, le premier en cas d'égalité (`docs/model.md` §7). Ce choix est une valeur intermédiaire : il est engagé comme les autres cellules et le vérifieur ne le lit pas. La page [[argmax|Argmax]] a construit la condition pour ce cas, avec un vecteur engagé $sel$ tel que $sel_e \in \{0, 1\}$ et $\sum_e sel_e = 1$, la valeur $m = \sum_e sel_e\, lr_e$, et pour tout $e$ :

$$m - lr_e - \sum_{e' > e} sel_{e'} \ge 0$$

(format 11.2, ligne 17). Le même $sel$ choisit les poids de l'expert : le produit qui donne la porte de son bloc s'écrit $\sum_e \sum_k sel_e\, W_e[k][j]\, x_k$, une somme sur tous les experts où seul $e^*$ a un coefficient non nul (format 11.2, ligne 20).

FlashProve montre $sel_e \in \{0, 1\}$ en cherchant la clé $128\, sel_e$ dans la table des octets $\{0, \dots, 255\}$ (format 11.2, clé `SEL`).

:::exercice ★★
Montrez qu'entre entiers, $128\, sel \in [0, 255]$ donne $sel \in \{0, 1\}$. Dans Goldilocks, calculez la clé de $sel = 1/2$. Que permettrait cette valeur, et qu'est-ce qui l'exclut ?

:::reponse
Si $sel$ est un entier, $0 \le 128\, sel \le 255$ donne $0 \le sel < 2$, donc $sel \in \{0, 1\}$.

Dans le corps, $1/2 = (p + 1)/2$, et $128 \times (p+1)/2 = 64(p + 1) \equiv 64$, une ligne de la table. Deux experts avec $sel = 1/2$ chacun vérifient aussi $\sum sel = 1$, et ce produit mélangerait leurs poids à moitié.

Ce qui l'exclut, c'est que $(p+1)/2 \approx 2^{63}$ n'est pas une petite cellule. Le test de petitesse montre que chaque cellule vaut moins de $2^{18}$ en valeur absolue, donc $128\, sel$ est un entier de $(-2^{25}, 2^{25})$ qui ne fait pas le tour du corps, et le premier argument s'applique.
:::
:::

L'entrée de l'expert choisi est multipliée par $sc = \mathrm{Sig}[lr_{e^*}]$, lu dans une table de sigmoïde, puis arrondie : $xr_k = \rq(sc \cdot m_k, 16)$ (`docs/model.md` §7, étape 3).

## La tête

La dernière norme donne une ligne $aF_t$ à chaque position $t$, et les logits $\lambda_t = aF_t\, W_h$ donnent un score à chacun des $V = 202\,048$ tokens du vocabulaire. FlashProve ne s'engage pas sur ces logits : les tableaux qu'engage la tête n'en contiennent pas (`docs/format/11-4-output-head.md`, « The arrays that the segment commits to »). Il montre que le token $win$ annoncé à la position $t$ a toutes ses marges positives, comme la page [[argmax|Argmax]] le fait pour une classe :

$$\lambda_t[win] - \lambda_t[v] - [v < win] \ge 0 \quad \text{pour tout } v$$

avec en plus des termes que fixe la politique d'acceptation ([[politiques]]). Chaque marge est écrite en trois chiffres contrôlés par des tables, donc elle est positive, et un sumcheck ramène toutes les marges à une seule affirmation sur $W_h$ (format 11.4 ; D2 §7).

## Le modèle entier n'est pas le modèle en virgule flottante

Toute preuve porte sur ce modèle entier, et aucune preuve ne contrôle la conversion des fichiers du modèle en entiers (`docs/model.md` §11 : « No proof checks this conversion »). FlashProve part d'une quantification sur 4 bits faite par un tiers (Unsloth), pas des poids de Meta (paper p.40, §7.1). Il a compté, sur 84 893 positions de 216 textes, où le token de plus grand score diffère entre trois versions du modèle (`docs/limits.md`, « The integer model is not the floating-point model » ; paper p.46, §7.7) :

| comparaison | positions | taux |
|---|---:|---:|
| modèle entier et poids de 16 bits | 5 779 | 6,81 % |
| fichiers de 4 bits et poids de 16 bits | 5 643 | 6,65 % |
| modèle entier et fichiers de 4 bits | 2 638 | 3,11 % |

:::exercice ★★★
Les trois taux sont comptés aux mêmes positions. Montrez qu'à au moins 4 392 des 5 779 positions où le modèle entier diffère des poids de 16 bits, les fichiers de 4 bits en diffèrent déjà.

:::reponse
On note $a$ le nombre de positions où le modèle entier diffère des poids de 16 bits et où les fichiers de 4 bits sont d'accord avec eux, $b$ celles où le modèle entier est d'accord avec les poids de 16 bits et où les fichiers de 4 bits en diffèrent, et $c$ celles où les deux en diffèrent. Alors :

$$a + c = 5\,779, \qquad b + c = 5\,643$$

Aux positions comptées dans $a$, le modèle entier diffère des fichiers de 4 bits, puisque ceux-ci donnent le token des poids de 16 bits ; de même aux positions comptées dans $b$. Donc $a + b \le 2\,638$. En soustrayant les deux égalités, $a - b = 136$, donc :

$$2a = (a + b) + (a - b) \le 2\,638 + 136 = 2\,774$$

d'où $a \le 1\,387$ et $c = 5\,779 - a \ge 4\,392$, plus des trois quarts. C'est le nombre que donne `docs/limits.md`.
:::
:::

L'essentiel de l'écart vient donc du passage des poids de 16 bits aux fichiers de 4 bits, avant toute arithmétique entière. Ces mesures ont été faites avec une implémentation Python du modèle entier qui n'est pas celle des programmes publiés, et sur des textes de WikiText-2 seulement (`docs/limits.md`).

:::piege
**Le modèle entier n'est pas Llama 4 Maverick.** Une preuve établit que le modèle entier, sur les poids engagés, a donné la réponse. Elle ne dit pas que le modèle en virgule flottante aurait donné la même : le token de tête diffère à 6,81 % des positions mesurées.
:::

:::piege
**Les poids engagés ne sont pas contrôlés contre un fichier.** La conversion des fichiers du modèle en entiers n'est vérifiée par aucune preuve (`docs/model.md` §11). Une preuve porte sur les entiers engagés, quels qu'ils soient.
:::
