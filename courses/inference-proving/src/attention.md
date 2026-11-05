---
id: attention
---
L'attention compare une requête à toutes les clés précédentes, transforme les scores en poids par une exponentielle normalisée, et fait la moyenne pondérée des valeurs. Rien de cela n'est une somme de produits par des poids fixes : les deux facteurs d'un score sont des données de la passe, et le maximum, l'exponentielle et la division ne sont pas des polynômes. On cherche comment FlashProve écrit l'attention avec des entiers, et comment il la prouve avec les outils du cours.

On part de la fonction en réels et on la récrit en entiers, sur un exemple d'une requête et de trois clés qu'on suit jusqu'au bout. On prouve ensuite chaque étape dans l'ordre du calcul : les scores par un sumcheck, le maximum par deux conditions, l'exponentielle et l'arrondi de l'écart par un seul lookup, la normalisation par une division arrondie. On finit par le masque causal, qui empêche une position de lire les suivantes.

## La fonction en réels

À la position $i$, une tête d'attention a une requête $q_i$, et chaque position $j \le i$ a une clé $k_j$ et une valeur $v_j$. Ce sont des vecteurs de $d_h = 128$ entrées (`docs/model.md` §2). Le score de $j$ est le produit scalaire $s_{ij} = \langle q_i, k_j \rangle$, le poids de $j$ est l'exponentielle de son score divisée par la somme des exponentielles, et la sortie est la moyenne des valeurs avec ces poids :

$$o_i = \frac{\sum_{j \le i} e^{s_{ij}}\, v_j}{\sum_{j \le i} e^{s_{ij}}}$$

Les poids sont positifs et de somme 1 : c'est le **softmax** des scores. Le facteur $1/\sqrt{d_h}$ qu'on applique d'habitude aux scores est déjà dans $W_q$ (`docs/model.md` §6).

:::exercice ★
Montrez que $o_i$ ne change pas si on retire le même nombre $M$ à tous les scores.

:::reponse
$e^{s - M} = e^{-M} e^{s}$. Le facteur $e^{-M}$ multiplie chaque terme du numérateur et chaque terme du dénominateur, donc il se simplifie.
:::
:::

## La fonction en entiers

L'exercice 1 permet de retirer à tous les scores le plus grand d'entre eux, $M(i) = \max_j s_{ij}$. Les écarts $\Delta_{ij} = M(i) - s_{ij}$ sont alors positifs ou nuls, et les poids $e^{-\Delta}$ sont dans $(0, 1]$. On n'a donc besoin de l'exponentielle que pour des arguments positifs, où elle décroît vers 0, et une table suffit. FlashProve lit cette table à l'écart divisé par $2^{sh}$ et arrondi vers le bas (`docs/model.md` §6, étape 4 ; format 11.3, « What the segment computes ») :

$$
\begin{aligned}
\mathrm{sc}(i, j) &= \textstyle\sum_{ch} q_{i, ch}\, k_{j, ch} \\
M(i) &= \max_{j \le i} \mathrm{sc}(i, j) \\
t &= \lfloor (M(i) - \mathrm{sc}(i, j)) / 2^{sh} \rfloor \\
ew(i, j) &= T_t[t] \text{ si } t < u_0, \text{ sinon } 0 \\
Z(i) &= \textstyle\sum_j ew(i, j) \\
\mathrm{acc}(i) &= \textstyle\sum_j ew(i, j)\, v_j \\
o(i) &= \lfloor (2\,\mathrm{acc} + Z) / (2Z) \rfloor
\end{aligned}
$$

Les requêtes et les clés sont des entiers de $[-2047, 2047]$ ([[modele-entier]]), $sh$ est un décalage public fixé pour chaque couche, et la dernière ligne est $\mathrm{acc}/Z$ arrondi au plus proche. La table de FlashProve vaut $T_t[u] = \mathrm{rne}(2^{12} e^{-u/256})$, où rne arrondit à l'entier le plus proche (`docs/model.md` §4, table 2). Elle décroît jusqu'à 0, et $u_0$ est le premier indice où elle vaut 0 : la table s'arrête à $u_0 - 1$, et tout écart plus grand donne un poids nul.

:::exercice ★★
Trouvez $u_0$ pour la table de FlashProve.

:::reponse
$T_t[u]$ vaut 0 quand $2^{12} e^{-u/256} < 1/2$, c'est-à-dire $e^{-u/256} < 2^{-13}$, soit :

$$u > 256 \times 13 \ln 2 \approx 2306{,}8$$

Donc $u_0 = 2\,307$, et la table a 2 307 lignes, le nombre que donne FlashProve (`docs/sources-notes.tsv`, « 2,307, the number of rows of the softmax table »). Une clé dont le score est à plus de $2\,307 \cdot 2^{sh}$ sous le maximum a le poids 0.
:::
:::

Le poids du plus grand score vaut $T_t[0] = 2^{12}$, donc $Z(i) \ge T_t[0] > 0$ et la division est toujours définie (`docs/model.md` §6).

Pour suivre chaque nombre, on prend un jouet : une requête, trois clés de scores $(5, 9, 7)$, les valeurs $(3, 5, 2)$, $sh = 1$, et une table qui divise par 2 à chaque pas, $T_t = (16, 8, 4, 2)$, donc $u_0 = 4$.

:::exercice ★★
Calculez $M$, les écarts, les $t$, les poids, $Z$, $\mathrm{acc}$ et $o$. Comparez $o$ avec $\sum_j 2^{-\Delta_j/2} v_j / \sum_j 2^{-\Delta_j/2}$, le softmax en base 2 dont la table du jouet est l'arrondi.

:::reponse
Le maximum est $M = 9$, atteint en $j = 1$. Les écarts valent $(4, 0, 2)$ et, avec $sh = 1$, $t = (2, 0, 1)$. Les poids sont $(T_t[2], T_t[0], T_t[1]) = (4, 16, 8)$, donc :

$$
\begin{aligned}
Z &= 4 + 16 + 8 = 28 \\
\mathrm{acc} &= 4 \times 3 + 16 \times 5 + 8 \times 2 = 108 \\
o &= \lfloor (216 + 28)/56 \rfloor = \lfloor 244/56 \rfloor = 4
\end{aligned}
$$

En réels, les poids $2^{-\Delta/2}$ valent $(1/4, 1, 1/2)$, et $(3/4 + 5 + 1)/(7/4) = 27/7 \approx 3{,}857$. Les poids entiers sont 16 fois ces poids, donc $\mathrm{acc}/Z = 108/28$ vaut aussi $3{,}857$, et $o = 4$ en est l'arrondi.
:::
:::

## Les scores

Un score est un produit scalaire, donc l'ensemble des scores est un produit de matrices : celle des requêtes par la transposée de celle des clés. La page [[sumcheck-matrices|Produits de matrices]] a prouvé un produit dont un facteur est la matrice des poids, engagée une fois pour toutes. Ici les deux facteurs sont des données de la passe, que le segment feed-forward du même groupe de couches a engagées (format 11.3, « What the segment computes », point 1). Le sumcheck sur l'indice intérieur $ch$ s'applique de la même façon, et il finit par deux affirmations sur des cellules, une sur $q$ et une sur $k$.

Son terme est un produit de trois fonctions multilinéaires, $W \cdot A \cdot B$ : $A$ porte les lignes de $q$, $B$ celles de $k$, et $W$ est un poids public, lui aussi multilinéaire (format 11.3, « The eight kinds of sumcheck » ; D2 §1.3). Les scores eux-mêmes ne sont pas engagés : ils n'entrent que dans les clés de la table, par l'écart $M - \mathrm{sc}$ (D2 §6.6).

:::exercice ★
Quel est le degré du polynôme de chaque tour de ce sumcheck ? Comparez avec un produit par les poids.

:::reponse
Chacune des trois fonctions est de degré au plus 1 dans la variable du tour, donc leur produit est de degré au plus 3 : le polynôme du tour a quatre coefficients. Un produit par les poids n'a que deux facteurs, une lecture de cellules et un facteur des poids, et ses tours sont de degré 2.
:::
:::

## Le maximum

La page [[argmax|Argmax]] a montré qu'il faut deux conditions pour prouver un maximum. Les écarts $M - \mathrm{sc}(i, j) \ge 0$ montrent seulement que $M$ majore les scores. Ici $M$ n'est pas une valeur publique comme la classe d'un réseau : c'est une valeur intermédiaire que le prouveur fournit, et rien n'empêche encore un majorant plus grand que le maximum.

:::exercice ★★
Dans le jouet, le prouveur annonce $M = 10$, puis $M = 11$, puis $M = 15$, et calcule tout le reste honnêtement. Que deviennent les poids et la sortie ? Et avec $M = 17$ ?

:::reponse
- $M = 10$ : écarts $(5, 1, 3)$, $t = (2, 0, 1)$. La division par 2 arrondie vers le bas efface l'unité de trop : mêmes poids, $o = 4$.
- $M = 11$ : écarts $(6, 2, 4)$, $t = (3, 1, 2)$, poids $(2, 8, 4)$, $Z = 14$, $\mathrm{acc} = 54$, $o = \lfloor 122/28 \rfloor = 4$. Les poids ont changé, et la sortie reste 4 par hasard.
- $M = 15$ : $t = (5, 3, 4)$, poids $(0, 2, 0)$, $Z = 2$, $\mathrm{acc} = 10$, $o = \lfloor 22/4 \rfloor = 5$. La sortie change.
- $M = 17$ : $t = (6, 4, 5)$, tous au moins $u_0$ : tous les poids sont nuls, $Z = 0$, et la division n'a plus de sens.
:::
:::

La seconde condition dit que $M$ est atteint. Le prouveur engage les bits d'une position $ib(i)$, et le vérifieur contrôle $M(i) = \mathrm{sc}(i, ib(i))$ (format 11.3, groupes 7 et 8). Un premier sumcheck, `SF`, ramène ce score à une affirmation sur les requêtes et sur les clés lues à la position $ib(i)$. Ces clés ne sont pas engagées à part : un second sumcheck, `SD`, les lit parmi les clés de toutes les positions $j$, en multipliant la clé de chaque $j$ par une indicatrice qui vaut 1 quand les bits de $j$ sont ceux de $ib(i)$. Cette indicatrice est un produit d'un facteur par bit, et le degré des tours de `SD` monte jusqu'à $\log_2 T + 2$, soit 12 pour une fenêtre de $T = 1\,024$ positions (format 11.3, « The sumcheck SD » ; D2 §1.3). Enfin la clé $2^{16 - \log_2 T}(i - ib(i))$, cherchée dans la table de 16 bits, est un contrôle par clé décalée ([[intervalles]]) : elle donne $0 \le i - ib(i) < T$, donc le maximum est pris parmi les positions que $i$ a le droit de lire (format 11.3, « Where the causal mask is », point 4, qui donne ce but comme sa lecture du code).

## L'exponentielle par une table

Le poids demande deux opérations qui ne sont pas des polynômes, la division arrondie $t = \lfloor \Delta / 2^{sh} \rfloor$ et la lecture $T_t[t]$, et un seul lookup fait les deux. Le prouveur engage le reste $rm = \Delta - 2^{sh} t$ et le poids $ew$. Une première table, `KR`, écrit $rm$ en chiffres et lui ajoute une marque qui vaut 1 si $rm \ge 2^{sh}$. Une seconde table, `KFD`, a une ligne pour chaque $t < u_0$, qui empaquette dans un seul nombre le couple $(2^{sh} t,\ T_t[t])$ et une marque nulle. La clé empaquette de la même façon le couple $(\Delta - rm,\ ew)$ et la marque de $rm$ (format 11.1, « Public tables » ; D2 §6.6).

Si la clé est la ligne $t$, la marque est nulle, donc $0 \le rm < 2^{sh}$, et $\Delta - rm = 2^{sh} t$, ce qui est la définition de $t = \lfloor \Delta / 2^{sh} \rfloor$, et $ew = T_t[t]$. Les autres lignes de `KFD` portent le poids 0 et couvrent les écarts à partir de $u_0 2^{sh}$. Le format présente cette lecture comme une description du code, et non comme un argument (format 11.3, « What the tables say of a key »).

:::exercice ★★
Dans le jouet ($sh = 1$, $u_0 = 4$), quelle ligne correspond à l'écart $\Delta = 5$ ? Que valent $t$, $rm$ et le poids ? Et pour $\Delta = 9$ ?

:::reponse
$\Delta = 5$ : $rm = 1$ et $\Delta - rm = 4 = 2 \times 2$, donc la ligne $t = 2$, de couple $(4, T_t[2]) = (4, 4)$ : le poids vaut 4.

$\Delta = 9$ : $rm = 1$ et $\Delta - rm = 8 = 2 \times 4$, donc $t = 4 \ge u_0$. Aucune ligne de poids non nul ne convient, et le poids vaut 0. Dans le jouet, les lignes de poids nul couvrent les écarts à partir de $u_0 \cdot 2^{sh} = 8$.
:::
:::

## La normalisation

$Z$ et $\mathrm{acc}$ sont deux sommes de produits par les mêmes poids $ew$. Un défi $\gamma$ les réunit en une seule somme, que prouve un seul sumcheck (format 11.3, groupe 6 ; D2 §6.6) :

$$\sum_j ew_j\, (\gamma + v_j) = \gamma Z + \mathrm{acc}$$

:::exercice ★★
Le prouveur annonce $Z'$ et $\mathrm{acc}'$. Montrez que si $(Z', \mathrm{acc}') \neq (Z, \mathrm{acc})$, l'égalité $\gamma Z' + \mathrm{acc}' = \gamma Z + \mathrm{acc}$ tient pour au plus une valeur de $\gamma$. Pourquoi $\gamma$ doit-il être tiré après les annonces ?

:::reponse
La différence des deux côtés, $\gamma (Z' - Z) + (\mathrm{acc}' - \mathrm{acc})$, est un polynôme en $\gamma$ de degré au plus 1 qui n'est pas nul, donc il a au plus une racine ([[schwartz-zippel]]). Un $\gamma$ tiré au hasard dans $\mathbb{E}$ est cette racine avec une probabilité d'au plus $1/|\mathbb{E}|$.

Si le prouveur connaît $\gamma$ avant d'annoncer, il choisit n'importe quel $Z'$ et pose $\mathrm{acc}' = \mathrm{acc} + \gamma (Z - Z')$ : l'égalité tient.
:::
:::

Il reste la division. La page [[intervalles|Contrôles d'intervalle]] l'a prouvée par deux écarts : $o = \lfloor (2\,\mathrm{acc} + Z)/(2Z) \rfloor$ si et seulement si le reste $\mathrm{rem} = 2\,\mathrm{acc} + Z - 2Zo$ et l'écart $2Z - 1 - \mathrm{rem}$ sont positifs. FlashProve écrit chacun avec un chiffre de 16 bits et un octet, contrôlés dans des tables (format 11.3, clés `WL` et `WH` ; D2 §6.6), et un autre sumcheck de degré 3 prouve le produit $Z \cdot o$. Dans le jouet, $\mathrm{acc} = 108$ et $Z = 28$ donnent $o = 4$, le reste $244 - 224 = 20$ et l'écart $55 - 20 = 35$.

## Le masque causal

La position $i$ ne lit que les positions $j \le i$. FlashProve range les paires $(i, j)$ par carreaux. Les carreaux au-dessus de la diagonale n'existent pas : aucune cellule ne leur correspond. Dans un carreau de la diagonale, toutes les paires ont des cellules, y compris celles où $j > i$. Pour celles-là, la clé ajoute à l'écart une marge publique (format 11.3, « Where the causal mask is », point 2) :

$$\Omega = 2 S_{\max} + u_0\, 2^{sh}$$

où $S_{\max}$ borne la valeur absolue de tout score. Avec des requêtes et des clés dans $[-2047, 2047]$, $S_{\max} = d_h \cdot 2047^2$ (format 11.3, « Notation »).

:::exercice ★★
Montrez que pour une paire masquée, $\Delta + \Omega \ge u_0\, 2^{sh}$, donc que son poids est nul. Dans le jouet, une quatrième clé $j = 3$, après $i$, a le score 20, avec $S_{\max} = 20$ : que valent $\Omega$, l'écart augmenté et $t$ ? Que se passerait-il si $M$ pouvait valoir ce score 20 ?

:::reponse
Par la seconde condition, $M$ est un score, donc $M \ge -S_{\max}$, et tout score vérifie $\mathrm{sc} \le S_{\max}$. Donc $\Delta = M - \mathrm{sc} \ge -2 S_{\max}$, et $\Delta + \Omega \ge u_0\, 2^{sh}$. Alors $t \ge u_0$, et le poids vaut 0.

Dans le jouet, $\Omega = 40 + 4 \times 2 = 48$, l'écart vaut $9 - 20 = -11$, l'écart augmenté $37$, et $t = 18 \ge 4$ : poids nul.

Si $M$ valait 20, les trois clés permises auraient les écarts $(15, 11, 13)$, donc $t = (7, 5, 6)$, tous au moins $u_0$ : tous les poids seraient nuls et $Z = 0$. C'est la condition $ib(i) \le i$, donnée par la clé décalée, qui l'exclut : le maximum est pris parmi les clés permises.
:::
:::

Le format présente l'effet de cette marge comme sa lecture du code : le code l'ajoute là où $j > i$, et le format en déduit que le poids de ces paires est nul, sous des conditions de non-débordement (format 11.3, « Where the causal mask is »).

## D'où vient cette construction

FlashProve cite ses sources pour chaque morceau (`PUBLISHED-WORKS.md`). Le softmax qui retire le maximum, lit l'exponentielle dans une table et divise avec un arrondi au plus proche vient de ZKML (§5.1 et §6.1) et de zkGPT (§4.1 et §4.3), qui donne aussi la forme causale et la division unique de la somme pondérée par la somme des poids (§5.3). La lecture de la table après avoir retiré le bas de l'écart, avec un poids nul à partir d'un écart fixé, vient de zkLLM (§5.1 et §5.1.1), qui mesure l'écart autrement et ne divise pas. Le maximum prouvé par deux conditions vient de zkCNN (ePrint 2021/673, §4.3) et de ZKML (§5.1) ; FlashProve en change la seconde condition, puisqu'il engage les bits de la position du maximum.

:::piege
**Un majorant à la place du maximum.** Des écarts positifs ne montrent que $M \ge \mathrm{sc}$. Sans la condition « $M$ est atteint en une position permise », le prouveur baisse les poids, change la sortie (exercice 5), et peut même annuler $Z$.
:::

:::piege
**Le masque n'est pas seulement l'absence de carreaux.** Dans un carreau de la diagonale, les paires $j > i$ ont des cellules. C'est la marge $\Omega$ ajoutée à leur clé qui annule leur poids.
:::

:::piege
**La sortie n'est bornée par aucun lookup.** Aucune clé de lookup ne contient $o$, et le format ne connaît aucun test qui montre la borne que ses conditions de non-débordement supposent pour $o$ (format 11.3, « No overflow », dernier paragraphe).
:::
