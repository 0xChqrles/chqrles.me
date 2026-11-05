---
id: fiat-shamir
---
Un protocole de vérification au hasard est un dialogue : le prouveur envoie un message, le vérifieur tire un défi au hasard, le prouveur répond, et ainsi de suite jusqu'au contrôle final. On veut une preuve qu'on envoie d'un bloc, sous la forme d'un fichier, et que n'importe qui vérifie seul, plus tard, sans que le prouveur puisse choisir ses défis.

Cette page montre d'abord ce que l'ordre du dialogue protège. Elle remplace ensuite le tirage par un hachage, puis organise les hachages en une **chaîne** qui absorbe tout ce que le prouveur envoie, et elle cherche ce qui doit y entrer. Elle construit ensuite un élément du corps à partir des octets d'un hachage. Elle finit par ce que le hachage change pour un tricheur, qui peut recommencer autant qu'il veut, par la **preuve de travail** qui rend ces essais chers, et par les étiquettes et les sceaux qui séparent les chaînes.

## Ce que protège l'ordre du dialogue

On prend le contrôle le plus simple d'un protocole au hasard. Le prouveur annonce un polynôme $Q$ de degré 2 et affirme qu'il est égal à un polynôme $P$ que le vérifieur ne sait évaluer qu'en un point, par exemple parce que $P$ vient de données engagées. Le vérifieur tire $r$, puis il compare $Q(r)$ et $P(r)$. Si $Q \neq P$, la différence $Q - P$ est un polynôme non nul de degré au plus 2, qui a au plus deux racines, donc le contrôle laisse passer $Q$ avec une probabilité d'au plus $2/|\mathbb{F}|$.

Ce calcul suppose que $Q$ est fixé avant le tirage de $r$.

:::exercice ★
Dans $\mathbb{F}_{97}$, $P = X^2 + 1$ et le prouveur sait d'avance que le vérifieur tirera $r = 5$. Écrivez un polynôme $Q \neq P$ de degré 2 qui passe le contrôle.

:::reponse
Il suffit que $Q - P$ s'annule en 5, par exemple $Q - P = X - 5$ :

$$Q = X^2 + X - 4$$

On vérifie $Q(5) = 25 + 5 - 4 = 26$ et $P(5) = 25 + 1 = 26$. Tout polynôme $P + \lambda (X - 5)$ avec $\lambda \neq 0$ passe aussi : connaître le défi permet de passer le contrôle avec n'importe quel mensonge.
:::
:::

Dans un dialogue, l'ordre des messages garantit cette condition, puisque le vérifieur ne tire $r$ qu'après avoir reçu $Q$. Une preuve écrite d'avance n'a pas de vérifieur pour tirer : si le prouveur choisit lui-même les défis, il les choisit comme dans l'exercice.

## Remplacer le tirage par un hachage

On cherche un défi que le prouveur ne connaît pas avant d'avoir fixé son message, mais que tout le monde sait recalculer ensuite. Une fonction de hachage $H$ donne les deux : on pose

$$r = H(Q)$$

lu comme un élément du corps. Le prouveur ne connaît $r$ qu'après avoir écrit $Q$, et changer $Q$ change $r$ d'une façon qu'il ne sait pas diriger. Le vérifieur recalcule $H(Q)$ à partir de la preuve. Pour que ce raisonnement tienne, on modélise $H$ comme une fonction tirée au hasard que chacun peut interroger, l'**oracle aléatoire** ; c'est le modèle dans lequel les bornes de sécurité de ce cours sont énoncées.

Ce remplacement s'appelle la transformation de **Fiat-Shamir**.

## La chaîne

Un protocole a plusieurs tours, et le défi du tour $i$ doit dépendre de tout ce qui précède, pas seulement du dernier message. On garde donc un état $S$ de 32 octets qui résume tout ce qui a été écrit. On pose un état de départ, puis on absorbe chaque message du prouveur :

$$
\begin{aligned}
S_0 &= H(\text{étiquette}, \text{paramètres}, \text{énoncé}) \\
S_i &= H(S_{i-1}, \text{message}_i)
\end{aligned}
$$

Les défis qui suivent le message $i$ se lisent sur $S_i$ ; pour en tirer plusieurs, on hache $S_i$ avec un compteur. Comme $S_i$ dépend de $S_{i-1}$, qui dépend de $S_{i-2}$, le défi du tour $i$ dépend de l'énoncé et de tous les messages $1, \dots, i$. Le vérifieur refait le même calcul à partir de la preuve, donc il obtient les mêmes défis que le prouveur, sans avoir parlé avec lui.

FlashProve écrit cette chaîne ainsi (`docs/format/FORMAT.md`, R4.6 et R5.2) :

$$
\begin{aligned}
\rho_0 &= H(160, 0, \text{label}, \text{none};\ \text{paramètres}, \text{énoncé}, \dots) \\
C_i(j) &= H(162, \text{label}, i, \rho_{i-1};\ \text{message du prouveur}, \text{kind} + 2^8 \kappa + 2^{16} j, \text{nonce})
\end{aligned}
$$

$\rho_i$ y est la valeur de la chaîne après le tour $i$, notre $S_i$, et $C_i(j)$ l'appel $j$ du tour $i$ (R5.2). Les nombres 160 et 162 séparent les usages du hachage, et $\kappa$ et le nonce servent à la preuve de travail, plus bas ; le format écrit $w$ pour $\kappa$. Le hachage est BLAKE2b (R2.1) ; le notebook du chapitre utilise SHA-256.

## Ce qui entre dans la chaîne

Les messages du prouveur entrent un par un. Pour l'énoncé, on pourrait croire qu'il n'a pas besoin d'entrer dans $S_0$, puisque le vérifieur le connaît déjà. L'exercice suivant montre le contraire sur le [[sumcheck]] du reçu, dont l'énoncé est « le reçu de racine $R$ a pour total $C$ ».

:::exercice ★★
On rend non interactif le sumcheck du reçu, mais $S_0$ ne contient que le total annoncé, pas la racine $R$. À la fin, le vérifieur lit $\tilde p(r_1, r_2)$ et $\tilde q(r_1, r_2)$ dans les données engagées sous $R$ et contrôle $\tilde p(r_1, r_2)\, \tilde q(r_1, r_2) = g_2(r_2)$. Montrez qu'un prouveur peut faire accepter un total faux.

:::reponse
Le prouveur choisit d'abord ses polynômes, puis les données.

1. Il choisit $g_1$ de degré 2 avec $g_1(0) + g_1(1)$ égal au total faux. Il calcule $S_1$ et le défi $r_1$.
2. Il choisit $g_2$ avec $g_2(0) + g_2(1) = g_1(r_1)$. Il calcule $S_2$ et le défi $r_2$.
3. Il lui faut maintenant des données telles que $\tilde p(r_1, r_2)\, \tilde q(r_1, r_2) = g_2(r_2)$. Il garde les prix, ce qui fixe $\tilde p(r_1, r_2)$, supposé non nul, et trois quantités, et il résout pour la quatrième : $\tilde q(r_1, r_2) = \sum_i \eq((r_1, r_2), i)\, q_i$ est une fonction affine de $q_3$, de coefficient $\eq((r_1, r_2), 3) = r_1 r_2$, non nul dès que les deux défis le sont.
4. Il s'engage sur ces données et publie leur racine $R$.

Tous les contrôles passent, alors que le reçu de racine $R$ n'a pas le total annoncé. La racine, choisie après les défis, ne lie rien. Le notebook le fait avec des défis dans $\mathbb{F}_{97}$ : il annonce 60, trouve les défis $(86, 27)$, choisit les quantités $(27, 9, 3, 65)$, dont le vrai total vaut 9 modulo 97, et la preuve passe.
:::
:::

On en déduit la règle. Tout ce sur quoi le vérifieur s'appuie entre dans la chaîne avant le premier tirage qui en dépend : les paramètres et l'énoncé dans $S_0$, et chaque message du prouveur avant le défi suivant. Cette forme s'appelle Fiat-Shamir **fort** ; FlashProve la tient de Dao, Miller, Wright et Grubbs (ePrint 2023/691, cité dans `PUBLISHED-WORKS.md`), et sa règle 5 l'écrit ainsi : tout ce que le prouveur envoie avant un tirage est absorbé, et seules les réponses aux requêtes du vérifieur, colonnes, sels et condensés de chemin, sont dans la preuve sans être absorbées (`blocks/README.md`, règle 5).

Ces réponses n'ont pas besoin d'entrer dans la chaîne, parce que le prouveur ne les choisit pas. Une colonne ouverte doit mener à une racine absorbée avant le tirage des positions, donc elle est fixée avant qu'il l'envoie.

## Des octets aux éléments du corps

Un hachage donne des octets, chacun uniforme sur $0, \dots, 255$. Un défi doit être uniforme sur le corps, et il faut construire l'un à partir de l'autre.

:::exercice ★★
On tire un élément de $\mathbb{F}_{97}$ d'un octet uniforme $u$ en prenant $u \bmod 97$. Quelle loi suit le résultat ? Si l'on n'accepte que $u < 194$ et qu'on prend un autre octet sinon, quelle part des octets rejette-t-on ?

:::reponse
On écrit $256 = 2 \times 97 + 62$. Les restes $0$ à $61$ viennent de trois octets ($r$, $r + 97$, $r + 194$) et les restes $62$ à $96$ de deux. Les premiers ont donc la probabilité $3/256$ et les autres $2/256$ : le tirage favorise les petits restes.

En n'acceptant que $u < 194 = 2 \times 97$, chaque reste vient d'exactement deux octets acceptés, donc $u \bmod 97$ est uniforme. On rejette les $62$ octets de $194$ à $255$, soit $62/256 \approx 24\,\%$.
:::
:::

C'est le **tirage par rejet** : on garde un octet seulement s'il est inférieur au plus grand multiple de $p$ qui tient dans la plage, sinon on prend le suivant. Le notebook tire ainsi ses défis.

:::exercice ★★
FlashProve tire un élément de Goldilocks, $p = 2^{64} - 2^{32} + 1$, d'un mot de 64 bits uniforme. Que vaut $2^{64} - p$ ? Quels restes favoriserait la réduction du mot modulo $p$ ?

:::reponse
$2^{64} - p = 2^{32} - 1$. Les mots de $p$ à $2^{64} - 1$ se réduisent en $0, \dots, 2^{32} - 2$, donc ces $2^{32} - 1$ restes viendraient de deux mots et tous les autres d'un seul : ils auraient le double du poids.
:::
:::

FlashProve rejette donc le mot s'il n'est pas sous $p$, avec ce commentaire : « A word is never reduced modulo p here: that would give the residues below 2^32 - 1 twice the weight of the others » (`blocks/field/gl64.h:115-122`). Un rejet arrive avec une probabilité de $(2^{32} - 1)/2^{64} \approx 2^{-32}$. Un élément de $\mathbb{F}$ prend au plus six essais, sur les mots suivants, et vaut 0 si les six échouent ; un élément de $\mathbb{E}$ est trois éléments de $\mathbb{F}$ tirés à la suite (`FORMAT.md`, R6.3 et R6.4).

## Recommencer jusqu'à un bon défi

Dans un dialogue, un tour donne au tricheur une seule chance : s'il a menti, le défi le laisse passer avec une probabilité $\varepsilon$, l'**erreur** du tour, et sinon il est pris. Après Fiat-Shamir, le tricheur calcule les défis lui-même. Il peut changer un détail de son message, hacher à nouveau, regarder le défi, et recommencer jusqu'à en obtenir un qui l'arrange ; il ne publie que cet essai. Chaque essai réussit avec une probabilité $\varepsilon$, donc il lui en faut environ $1/\varepsilon$, et avec $q$ hachages sa chance vaut environ $q \varepsilon$.

Pour qu'un essai coûte cher, on exige avant le tirage une **preuve de travail** : le prouveur ajoute à son message un nombre, le **nonce**, et l'état qui suit doit finir par $\kappa$ bits nuls. Il ne connaît pas d'autre moyen que d'essayer des nonces un par un.

:::exercice ★
Chaque essai de nonce donne un état dont les $\kappa$ derniers bits sont uniformes. Combien d'essais faut-il en moyenne pour $\kappa = 4$ ? Pour $\kappa = 20$ ? Pour $\kappa = 32$ ?

:::reponse
Un essai réussit avec la probabilité $2^{-\kappa}$, donc il en faut $2^\kappa$ en moyenne : $2^4 = 16$, $2^{20} = 1\,048\,576 \approx 10^6$ et $2^{32} \approx 4{,}3 \times 10^9$. Le notebook trouve 244 essais en moyenne sur 200 recherches à $\kappa = 8$, pour $2^8 = 256$.
:::
:::

Le prouveur honnête paie ce prix une fois par tour. Le tricheur le paie à chaque essai, donc un tour dont l'erreur vaut $\varepsilon$ se comporte, face à lui, comme un tour d'erreur $\varepsilon / 2^\kappa$.

:::exercice ★★★
Un tour de positions a une erreur $2^{-96}$, et le tricheur peut calculer $2^{60}$ hachages. Quelle est sa chance sans preuve de travail ? Avec 32 bits de travail avant ce tour ?

:::reponse
Sans travail, chaque hachage donne un essai : $2^{60} \times 2^{-96} = 2^{-36}$.

Avec 32 bits de travail, un essai coûte environ $2^{32}$ hachages, donc il n'en fait que $2^{60}/2^{32} = 2^{28}$, et sa chance vaut $2^{28} \times 2^{-96} = 2^{-68}$.
:::
:::

FlashProve met du travail avant chaque tour qui tire des positions, et nulle part ailleurs : 20 bits dans les chaînes propres à une requête, 28 dans la chaîne partagée d'un lot, 32 dans les fichiers faits une fois (`prover/examples/target_full_f2/policy.txt`, ligne `work positions 20 28 32`, que `prover/examples/TARGET-KITS.md` lit ainsi). Ce sont les tours dont l'erreur est la plus grande, comme le montre [[securite]]. Que $w$ bits de travail divisent l'erreur d'un tour par $2^w$ est une hypothèse pour ces chaînes ; elle est démontrée dans un autre cadre, ethSTARK (ePrint 2021/582, théorème 6), comme le dit `prover/examples/TARGET-KITS.md`.

## Étiquettes et sceaux

Deux protocoles différents peuvent hacher les mêmes octets. Ils tireraient alors les mêmes défis, et un morceau de preuve fait pour l'un pourrait passer dans l'autre. Une **étiquette**, un entier qui nomme le protocole et le type de fichier, entre dans $S_0$ et dans chaque appel d'un tour, donc deux chaînes d'étiquettes différentes ne hachent jamais les mêmes octets (`docs/protocol.md` §5.6). Chacune des sept chaînes des fichiers de clé, de feuille et de preuve de FlashProve a sa propre étiquette ; `blocks/frame/heads.h:112` en définit quatre, de `LABEL_FIRST_CHAIN = 0x46524d01` à `LABEL_PROOF_SECOND_CHAIN = 0x46524d04`, et le commentaire au-dessus dit où sont les autres.

Une preuve de FlashProve enchaîne plusieurs chaînes, et une chaîne qui en suit une autre doit dépendre de tout ce que la première contient. La première finit donc par un tour qui produit un condensé, son **sceau**, et la chaîne suivante met ce sceau dans son énoncé, donc dans son $S_0$ (`FORMAT.md`, R6.8 et R4.7).

:::piege
**Fiat-Shamir faible.** Oublier l'énoncé ou les paramètres dans $S_0$ laisse le prouveur choisir après coup ce dont il parle (exercice 2).

**Lire ses comptes dans la preuve.** Les tailles, les nombres de tours et de positions viennent des paramètres et du plan du vérifieur, jamais du fichier (`docs/protocol.md` §6.4). Pour les colonnes ouvertes, FlashProve le dit ainsi : le vérifieur « takes no index, count or direction from the file » (`FORMAT.md`, R7.10).

**Compter la preuve de travail comme gratuite.** Les bits de travail reposent sur une hypothèse. Sans eux, le tour le plus faible de FlashProve vaut 96,23 bits (`docs/protocol.md` §6.4).
:::
