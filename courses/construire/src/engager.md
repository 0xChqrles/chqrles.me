---
id: engager
---
Les chapitres précédents laissent au vérifieur des affirmations sur les poids, comme $\tilde W_2((2,5),(6,9)) = 31$, et des affirmations semblables sur les cellules. Le vérifieur n'a pas les poids. Ce chapitre construit un **engagement** : une racine que le prouveur publie avant tout défi, et qui le lie à ses poids.

On montre d'abord pourquoi un [[merkle|arbre de Merkle]] sur les poids ne suffit pas. On encode ensuite chaque ligne d'une table avec un code de [[reed-solomon|Reed-Solomon]], sur un [[domaine]] bien choisi, et on hache les colonnes. Le vérifieur obtient alors une valeur de $\tilde w$ en ouvrant quelques colonnes. Chaque étape s'applique à la table des poids du [[reseau|petit réseau]].

## Ce que le vérifieur a en main

Le chapitre [[matrices|Les produits de matrices]] a laissé deux affirmations sur les poids, au point $z = (2, 5)$. Pour la couche 1, l'entrée $x$ est publique, et l'affirmation $\sum_k \tilde W_1(z, k)\, x_k = 94$ est une combinaison linéaire des poids, de coefficients publics. Pour la couche 2, le sumcheck finit sur l'affirmation $\tilde W_2((2,5),(6,9)) = 31$, une valeur de l'extension multilinéaire des poids en un point que le vérifieur a tiré. Le même sumcheck a laissé l'affirmation $\tilde a(6, 9) = 6$ sur la couche cachée, que le prouveur engage dans une seconde table, de la même façon (chapitre [[prouveur-complet]]).

Le vérifieur ne peut contrôler aucune de ces affirmations sans les poids, et le prouveur ne doit pas pouvoir les choisir après coup. S'il voyait le point $z$ avant de fixer ses poids, il pourrait choisir des poids qui donnent la valeur annoncée : c'est le mensonge « un autre reçu » du chapitre [[prouver-sans-refaire|1]]. Le prouveur publie donc une racine $R_w$ avant tout défi, et l'énoncé devient « avec les poids engagés sous la racine $R_w$, l'entrée $x$ donne la classe $c$ ».

## Première idée : un arbre de Merkle sur les poids

Un arbre de Merkle sur les 32 poids lie le prouveur à chaque poids, et permet d'ouvrir un poids à la fois avec son chemin ([[merkle]]).

:::exercice ★
Avec un arbre de Merkle sur les 32 poids, combien de poids le vérifieur doit-il ouvrir pour contrôler $\tilde w(z)$ en un point $z$ tiré au hasard ? Combien de condensés demande le chemin d'une seule ouverture ?
:::reponse
$\tilde w(z) = \sum_i \eq(z, i)\, w_i$, et pour un $z$ tiré au hasard, aucun coefficient $\eq(z, i)$ n'est nul (il faudrait qu'une coordonnée vaille 0 ou 1). La valeur dépend donc des 32 poids, et il faut les ouvrir tous. L'arbre a 32 feuilles, donc la profondeur 5, et une ouverture demande 5 condensés.
:::
:::

Le vérifieur lirait donc toutes les données, ce qui contredit la première exigence du chapitre [[prouver-sans-refaire|1]]. Il verrait aussi tous les poids, que le chapitre [[cacher]] veut lui cacher.

## Deuxième idée : envoyer une seule combinaison

La page [[engagement-colonnes]] montre qu'une valeur de $\tilde w$ se lit sur une seule ligne, à condition de ranger les poids en table. Le vecteur des 32 poids a pour indice $i = k + 4 \cdot \text{ligne} + 16 \cdot \text{couche}$, avec la colonne $k$ dans les deux bits de poids faible. La table a 4 lignes de 8 places, et l'entrée (ligne $b$, place $c$) est $w_{b + 4c}$. La ligne $b$ de la table contient donc les poids de colonne $k = b$ : c'est la **colonne** $b$ de $W_1$, puis la colonne $b$ de $W_2$.

| ligne de table | message $m^{(b)}$ |
|---|---|
| 0 | $(0, 0, -1, 1, -1, 1, 0, 0)$ |
| 1 | $(1, -1, 1, 0, 0, 0, 1, 1)$ |
| 2 | $(1, -1, 1, 1, 0, 0, 1, 0)$ |
| 3 | $(1, 1, 0, 1, 1, 1, 1, -1)$ |

L'extension $\tilde w$ a 5 variables : deux pour la colonne $k$, deux pour la ligne de la matrice, une pour la couche. L'affirmation de la couche 2 porte sur la ligne $(2, 5)$, la colonne $(6, 9)$ et la couche 1 :

$$\tilde W_2((2,5),(6,9)) = \tilde w(6, 9, 2, 5, 1)$$

Les deux premières coordonnées forment $z_{\text{bas}} = (6, 9)$, qui plie les lignes de la table, et les trois autres $z_{\text{haut}} = (2, 5, 1)$, qui lisent la ligne pliée :

$$\tilde w(6, 9, 2, 5, 1) = \langle \eq((2, 5, 1), \cdot),\ u \rangle \quad\text{avec}\quad u = \sum_b \eq((6, 9), b)\, m^{(b)}$$

:::exercice ★★
Pliez la table des poids en $\gamma = (6, 9)$ : calculez $\eq((6, 9), b)$ pour $b = 0, \dots, 3$, puis $u$, puis $\langle \eq((2, 5, 1), \cdot), u \rangle$. Le notebook du chapitre fait le calcul si vous voulez vérifier.
:::reponse
Le bit 0 de $b$ va avec 6, le bit 1 avec 9 :

$$\eq((6, 9), \cdot) = \big((-5)(-8),\ 6 \cdot (-8),\ (-5) \cdot 9,\ 6 \cdot 9\big) = (40, -48, -45, 54)$$

La place 0 de $u$ vaut $40 \cdot 0 - 48 \cdot 1 - 45 \cdot 1 + 54 \cdot 1 = -39 \equiv 58$, et les huit places donnent :

$$u \equiv (58, 50, 61, 49, 14, 94, 58, 92)$$

Dans $\eq((2, 5, 1), c)$, le facteur de la couche vaut $1 - 1 = 0$ pour les places 0 à 3, et $1$ pour les places 4 à 7, où il reste $\eq((2, 5), \cdot) = (4, -8, -5, 10)$ :

$$4 \cdot 14 - 8 \cdot 94 - 5 \cdot 58 + 10 \cdot 92 = 56 - 752 - 290 + 920 = -66 \equiv 31$$

C'est la valeur laissée par le sumcheck de la couche 2.
:::
:::

Le prouveur pourrait donc envoyer $u$, 8 nombres au lieu de 32, et le vérifieur contrôlerait la valeur 31 sur $u$. Mais rien ne relie $u$ à la racine : le prouveur peut envoyer n'importe quel $u$ qui donne la valeur annoncée.

## Relier $u$ à la racine

Le vérifieur doit comparer $u$ aux poids engagés en quelques endroits seulement, et une erreur sur $u$ doit se voir presque partout. On encode donc chaque ligne de la table avec un code de Reed-Solomon, où chaque symbole dépend de toute la ligne ([[reed-solomon]]). Plier les mots des lignes donne le mot de la ligne pliée ([[engagement-colonnes]]), donc le pli de chaque colonne doit valoir le symbole de $\Enc(u)$ à la même position. Un faux $u$ a un autre mot, qui diffère de $\Enc(u)$ en presque toutes les positions.

On hache ensuite les **colonnes** de la table : chaque feuille de l'arbre est la colonne d'une position, le symbole de chaque ligne à cette position.

:::exercice ★★
Pourquoi hacher les colonnes plutôt que les lignes ?
:::reponse
Le contrôle a besoin, à une position $x$, du symbole de chaque ligne, pour les plier. Avec une colonne par feuille, une seule ouverture les donne tous, avec un seul chemin. Avec un arbre par ligne, il faudrait une ouverture par ligne pour chaque position, soit 4 ouvertures et 4 chemins par position pour la table du réseau.
:::
:::

## Le domaine et la table du réseau

Le code a besoin de $n$ points où l'encodage est rapide, une classe $7 \cdot H_n$ avec $n$ une puissance de 2 qui divise $p - 1$ ([[domaine]]). Dans $\F_{97}$, $96 = 2^5 \times 3$, donc $n$ vaut au plus 32. Un mot plus long donne une distance plus grande, et le cours prend le plus long : chaque ligne de 8 places est encodée en un mot de 32 symboles sur $7 \cdot H_{32}$.

| | table des poids du réseau |
|---|---|
| lignes | 4 ($v = 2$) |
| message $\ell$ | 8 |
| longueur $n$ | 32 |
| rendement $\rho$ | $8/32 = 1/4$ |
| distance minimale $d$ | $32 - 8 + 1 = 25$ |
| feuilles | 32 colonnes de 4 symboles |
| profondeur de l'arbre | 5 |

## Le contrôle sur la table du réseau

Le prouveur envoie $u$. Le vérifieur contrôle $\langle \eq((2, 5, 1), \cdot), u \rangle = 31$, tire $t = 8$ positions, reçoit les colonnes avec leurs chemins, contrôle les chemins, plie chaque colonne en $\gamma = (6, 9)$ et compare chaque pli au symbole de $\Enc(u)$.

:::figure La table des poids encodée : 4 lignes, chacune un mot de 32 symboles. La colonne 13 est une feuille de l'arbre. Le vérifieur plie chaque colonne qu'il ouvre et compare le pli au symbole de $\Enc(u)$, qu'il calcule à partir du $u$ reçu. La ligne des plis n'est jamais calculée en entier.
<svg viewBox="0 0 480 246" role="img" aria-label="La table des poids encodée : 4 lignes de 32 symboles, chaque ligne un mot du code. La colonne de la position 13, (19, 76, 71, 25), est une feuille de l’arbre de Merkle. Pliée en gamma = (6, 9), elle vaut 20. Le prouveur envoie u, 8 valeurs ; son encodage sur 7·H32 vaut aussi 20 en position 13, au point 68. Le vérifieur compare les deux à chaque position ouverte."><text x="78" y="18" class="m s mid">0</text><text x="174" y="18" class="m s mid">8</text><text x="270" y="18" class="m s mid">16</text><text x="366" y="18" class="m s mid">24</text><text x="450" y="18" class="m s mid">31</text><text x="234" y="18" class="c s mid">13</text><text x="0" y="37" class="m s">ligne 0</text><rect x="72" y="26" width="12" height="14" class="box"/><rect x="84" y="26" width="12" height="14" class="box"/><rect x="96" y="26" width="12" height="14" class="box"/><rect x="108" y="26" width="12" height="14" class="box"/><rect x="120" y="26" width="12" height="14" class="box"/><rect x="132" y="26" width="12" height="14" class="box"/><rect x="144" y="26" width="12" height="14" class="box"/><rect x="156" y="26" width="12" height="14" class="box"/><rect x="168" y="26" width="12" height="14" class="box"/><rect x="180" y="26" width="12" height="14" class="box"/><rect x="192" y="26" width="12" height="14" class="box"/><rect x="204" y="26" width="12" height="14" class="box"/><rect x="216" y="26" width="12" height="14" class="box"/><rect x="228" y="26" width="12" height="14" class="box"/><rect x="240" y="26" width="12" height="14" class="box"/><rect x="252" y="26" width="12" height="14" class="box"/><rect x="264" y="26" width="12" height="14" class="box"/><rect x="276" y="26" width="12" height="14" class="box"/><rect x="288" y="26" width="12" height="14" class="box"/><rect x="300" y="26" width="12" height="14" class="box"/><rect x="312" y="26" width="12" height="14" class="box"/><rect x="324" y="26" width="12" height="14" class="box"/><rect x="336" y="26" width="12" height="14" class="box"/><rect x="348" y="26" width="12" height="14" class="box"/><rect x="360" y="26" width="12" height="14" class="box"/><rect x="372" y="26" width="12" height="14" class="box"/><rect x="384" y="26" width="12" height="14" class="box"/><rect x="396" y="26" width="12" height="14" class="box"/><rect x="408" y="26" width="12" height="14" class="box"/><rect x="420" y="26" width="12" height="14" class="box"/><rect x="432" y="26" width="12" height="14" class="box"/><rect x="444" y="26" width="12" height="14" class="box"/><text x="0" y="53" class="m s">ligne 1</text><rect x="72" y="42" width="12" height="14" class="box"/><rect x="84" y="42" width="12" height="14" class="box"/><rect x="96" y="42" width="12" height="14" class="box"/><rect x="108" y="42" width="12" height="14" class="box"/><rect x="120" y="42" width="12" height="14" class="box"/><rect x="132" y="42" width="12" height="14" class="box"/><rect x="144" y="42" width="12" height="14" class="box"/><rect x="156" y="42" width="12" height="14" class="box"/><rect x="168" y="42" width="12" height="14" class="box"/><rect x="180" y="42" width="12" height="14" class="box"/><rect x="192" y="42" width="12" height="14" class="box"/><rect x="204" y="42" width="12" height="14" class="box"/><rect x="216" y="42" width="12" height="14" class="box"/><rect x="228" y="42" width="12" height="14" class="box"/><rect x="240" y="42" width="12" height="14" class="box"/><rect x="252" y="42" width="12" height="14" class="box"/><rect x="264" y="42" width="12" height="14" class="box"/><rect x="276" y="42" width="12" height="14" class="box"/><rect x="288" y="42" width="12" height="14" class="box"/><rect x="300" y="42" width="12" height="14" class="box"/><rect x="312" y="42" width="12" height="14" class="box"/><rect x="324" y="42" width="12" height="14" class="box"/><rect x="336" y="42" width="12" height="14" class="box"/><rect x="348" y="42" width="12" height="14" class="box"/><rect x="360" y="42" width="12" height="14" class="box"/><rect x="372" y="42" width="12" height="14" class="box"/><rect x="384" y="42" width="12" height="14" class="box"/><rect x="396" y="42" width="12" height="14" class="box"/><rect x="408" y="42" width="12" height="14" class="box"/><rect x="420" y="42" width="12" height="14" class="box"/><rect x="432" y="42" width="12" height="14" class="box"/><rect x="444" y="42" width="12" height="14" class="box"/><text x="0" y="69" class="m s">ligne 2</text><rect x="72" y="58" width="12" height="14" class="box"/><rect x="84" y="58" width="12" height="14" class="box"/><rect x="96" y="58" width="12" height="14" class="box"/><rect x="108" y="58" width="12" height="14" class="box"/><rect x="120" y="58" width="12" height="14" class="box"/><rect x="132" y="58" width="12" height="14" class="box"/><rect x="144" y="58" width="12" height="14" class="box"/><rect x="156" y="58" width="12" height="14" class="box"/><rect x="168" y="58" width="12" height="14" class="box"/><rect x="180" y="58" width="12" height="14" class="box"/><rect x="192" y="58" width="12" height="14" class="box"/><rect x="204" y="58" width="12" height="14" class="box"/><rect x="216" y="58" width="12" height="14" class="box"/><rect x="228" y="58" width="12" height="14" class="box"/><rect x="240" y="58" width="12" height="14" class="box"/><rect x="252" y="58" width="12" height="14" class="box"/><rect x="264" y="58" width="12" height="14" class="box"/><rect x="276" y="58" width="12" height="14" class="box"/><rect x="288" y="58" width="12" height="14" class="box"/><rect x="300" y="58" width="12" height="14" class="box"/><rect x="312" y="58" width="12" height="14" class="box"/><rect x="324" y="58" width="12" height="14" class="box"/><rect x="336" y="58" width="12" height="14" class="box"/><rect x="348" y="58" width="12" height="14" class="box"/><rect x="360" y="58" width="12" height="14" class="box"/><rect x="372" y="58" width="12" height="14" class="box"/><rect x="384" y="58" width="12" height="14" class="box"/><rect x="396" y="58" width="12" height="14" class="box"/><rect x="408" y="58" width="12" height="14" class="box"/><rect x="420" y="58" width="12" height="14" class="box"/><rect x="432" y="58" width="12" height="14" class="box"/><rect x="444" y="58" width="12" height="14" class="box"/><text x="0" y="85" class="m s">ligne 3</text><rect x="72" y="74" width="12" height="14" class="box"/><rect x="84" y="74" width="12" height="14" class="box"/><rect x="96" y="74" width="12" height="14" class="box"/><rect x="108" y="74" width="12" height="14" class="box"/><rect x="120" y="74" width="12" height="14" class="box"/><rect x="132" y="74" width="12" height="14" class="box"/><rect x="144" y="74" width="12" height="14" class="box"/><rect x="156" y="74" width="12" height="14" class="box"/><rect x="168" y="74" width="12" height="14" class="box"/><rect x="180" y="74" width="12" height="14" class="box"/><rect x="192" y="74" width="12" height="14" class="box"/><rect x="204" y="74" width="12" height="14" class="box"/><rect x="216" y="74" width="12" height="14" class="box"/><rect x="228" y="74" width="12" height="14" class="box"/><rect x="240" y="74" width="12" height="14" class="box"/><rect x="252" y="74" width="12" height="14" class="box"/><rect x="264" y="74" width="12" height="14" class="box"/><rect x="276" y="74" width="12" height="14" class="box"/><rect x="288" y="74" width="12" height="14" class="box"/><rect x="300" y="74" width="12" height="14" class="box"/><rect x="312" y="74" width="12" height="14" class="box"/><rect x="324" y="74" width="12" height="14" class="box"/><rect x="336" y="74" width="12" height="14" class="box"/><rect x="348" y="74" width="12" height="14" class="box"/><rect x="360" y="74" width="12" height="14" class="box"/><rect x="372" y="74" width="12" height="14" class="box"/><rect x="384" y="74" width="12" height="14" class="box"/><rect x="396" y="74" width="12" height="14" class="box"/><rect x="408" y="74" width="12" height="14" class="box"/><rect x="420" y="74" width="12" height="14" class="box"/><rect x="432" y="74" width="12" height="14" class="box"/><rect x="444" y="74" width="12" height="14" class="box"/><rect x="227" y="24" width="14" height="66" class="ring"/><text x="246" y="102" class="c s">colonne 13 = (19, 76, 71, 25)</text><line x1="234" y1="94" x2="234" y2="128" class="lc" marker-end="url(#fac)"/><text x="246" y="120" class="s">pliée en γ = (6, 9) : 20</text><text x="0" y="145" class="m s">plis</text><rect x="72" y="134" width="12" height="14" class="dim"/><rect x="84" y="134" width="12" height="14" class="dim"/><rect x="96" y="134" width="12" height="14" class="dim"/><rect x="108" y="134" width="12" height="14" class="dim"/><rect x="120" y="134" width="12" height="14" class="dim"/><rect x="132" y="134" width="12" height="14" class="dim"/><rect x="144" y="134" width="12" height="14" class="dim"/><rect x="156" y="134" width="12" height="14" class="dim"/><rect x="168" y="134" width="12" height="14" class="dim"/><rect x="180" y="134" width="12" height="14" class="dim"/><rect x="192" y="134" width="12" height="14" class="dim"/><rect x="204" y="134" width="12" height="14" class="dim"/><rect x="216" y="134" width="12" height="14" class="dim"/><rect x="228" y="134" width="12" height="14" class="hot"/><rect x="240" y="134" width="12" height="14" class="dim"/><rect x="252" y="134" width="12" height="14" class="dim"/><rect x="264" y="134" width="12" height="14" class="dim"/><rect x="276" y="134" width="12" height="14" class="dim"/><rect x="288" y="134" width="12" height="14" class="dim"/><rect x="300" y="134" width="12" height="14" class="dim"/><rect x="312" y="134" width="12" height="14" class="dim"/><rect x="324" y="134" width="12" height="14" class="dim"/><rect x="336" y="134" width="12" height="14" class="dim"/><rect x="348" y="134" width="12" height="14" class="dim"/><rect x="360" y="134" width="12" height="14" class="dim"/><rect x="372" y="134" width="12" height="14" class="dim"/><rect x="384" y="134" width="12" height="14" class="dim"/><rect x="396" y="134" width="12" height="14" class="dim"/><rect x="408" y="134" width="12" height="14" class="dim"/><rect x="420" y="134" width="12" height="14" class="dim"/><rect x="432" y="134" width="12" height="14" class="dim"/><rect x="444" y="134" width="12" height="14" class="dim"/><line x1="234" y1="150" x2="234" y2="164" class="lc dash"/><text x="246" y="161" class="c s">comparés à la position 13</text><text x="0" y="177" class="m s">Enc(u)</text><rect x="72" y="166" width="12" height="14" class="box"/><rect x="84" y="166" width="12" height="14" class="box"/><rect x="96" y="166" width="12" height="14" class="box"/><rect x="108" y="166" width="12" height="14" class="box"/><rect x="120" y="166" width="12" height="14" class="box"/><rect x="132" y="166" width="12" height="14" class="box"/><rect x="144" y="166" width="12" height="14" class="box"/><rect x="156" y="166" width="12" height="14" class="box"/><rect x="168" y="166" width="12" height="14" class="box"/><rect x="180" y="166" width="12" height="14" class="box"/><rect x="192" y="166" width="12" height="14" class="box"/><rect x="204" y="166" width="12" height="14" class="box"/><rect x="216" y="166" width="12" height="14" class="box"/><rect x="228" y="166" width="12" height="14" class="hot"/><rect x="240" y="166" width="12" height="14" class="box"/><rect x="252" y="166" width="12" height="14" class="box"/><rect x="264" y="166" width="12" height="14" class="box"/><rect x="276" y="166" width="12" height="14" class="box"/><rect x="288" y="166" width="12" height="14" class="box"/><rect x="300" y="166" width="12" height="14" class="box"/><rect x="312" y="166" width="12" height="14" class="box"/><rect x="324" y="166" width="12" height="14" class="box"/><rect x="336" y="166" width="12" height="14" class="box"/><rect x="348" y="166" width="12" height="14" class="box"/><rect x="360" y="166" width="12" height="14" class="box"/><rect x="372" y="166" width="12" height="14" class="box"/><rect x="384" y="166" width="12" height="14" class="box"/><rect x="396" y="166" width="12" height="14" class="box"/><rect x="408" y="166" width="12" height="14" class="box"/><rect x="420" y="166" width="12" height="14" class="box"/><rect x="432" y="166" width="12" height="14" class="box"/><rect x="444" y="166" width="12" height="14" class="box"/><line x1="96" y1="220" x2="96" y2="184" class="l" marker-end="url(#fa)"/><text x="104" y="204" class="s">encoder</text><text x="0" y="233" class="m s">u</text><rect x="72" y="222" width="12" height="14" class="box"/><rect x="84" y="222" width="12" height="14" class="box"/><rect x="96" y="222" width="12" height="14" class="box"/><rect x="108" y="222" width="12" height="14" class="box"/><rect x="120" y="222" width="12" height="14" class="box"/><rect x="132" y="222" width="12" height="14" class="box"/><rect x="144" y="222" width="12" height="14" class="box"/><rect x="156" y="222" width="12" height="14" class="box"/><text x="180" y="233" class="s">8 valeurs envoyées par le prouveur</text><text x="246" y="204" class="c s">en z = 68 : 20</text></svg>
:::

:::exercice ★
Le vérifieur ouvre la position 13, de point $z_{13} = 68$, et reçoit la colonne $(19, 76, 71, 25)$. Pliez-la en $\gamma = (6, 9)$, avec les poids de l'exercice 2. Le symbole de $\Enc(u)$ en position 13 vaut 20 : le contrôle passe-t-il ?
:::reponse
Le pli vaut :

$$40 \cdot 19 - 48 \cdot 76 - 45 \cdot 71 + 54 \cdot 25 = 760 - 3648 - 3195 + 1350 = -4733$$

et $-4733 + 49 \times 97 = 20$. Le pli vaut 20, comme le symbole, donc le contrôle passe. Pour vérifier le symbole, Horner sur $u$ en 68, du coefficient le plus haut au plus bas, garde les valeurs $92, 9, 27, 7, 40, 65, 8, 20$.
:::
:::

:::exercice ★★
On suppose que les lignes engagées sont de vrais mots du code. Le prouveur envoie un $u' \neq u$ pour annoncer une autre valeur que 31. En combien de positions au moins le contrôle échoue-t-il ? Bornez sa chance de passer les $t = 8$ positions, tirées au hasard et indépendamment.
:::reponse
Les plis des colonnes forment $\Enc(u)$, et $\Enc(u')$ en diffère en au moins $d = 25$ positions. Chaque position tirée passe avec une probabilité d'au plus $7/32$, donc le prouveur passe les 8 positions avec une probabilité d'au plus :

$$\left(\frac{7}{32}\right)^8 = \frac{5\,764\,801}{1\,099\,511\,627\,776} \approx 5{,}2 \times 10^{-6} \approx 2^{-17{,}5}$$
:::
:::

:::exercice ★
Que deviendrait cette borne avec un code de longueur 16 au lieu de 32 ?
:::reponse
La distance minimale vaudrait $16 - 8 + 1 = 9$, donc chaque position passerait avec une probabilité d'au plus $7/16$, et les 8 positions avec une probabilité d'au plus $(7/16)^8 \approx 1{,}3 \times 10^{-3}$, $2^8 = 256$ fois la borne précédente.
:::
:::

Il reste l'affirmation de la couche 1, $\sum_k \tilde W_1((2, 5), k)\, x_k = 94$. Ses coefficients sont publics, mais ce n'est pas une valeur de $\tilde w$ : on cherche à la lire, elle aussi, sur une ligne de la table pliée.

:::exercice ★★
Montrez que $\sum_k \tilde W_1((2, 5), k)\, x_k = \langle \eq((2, 5, 0), \cdot),\ u_x \rangle$, avec la ligne $u_x = \sum_b x_b\, m^{(b)}$. Le contrôle par colonnes marche-t-il avec ces coefficients, qui ne sont pas tirés au hasard ?
:::reponse
$\tilde W_1((2, 5), k) = \sum_r \eq((2, 5), r)\, W_1[r][k]$, et le poids $W_1[r][k]$ est l'entrée (ligne $k$, place $r$) de la table, puisque son indice vaut $k + 4r$. Donc :

$$\sum_k x_k\, \tilde W_1((2, 5), k) = \sum_{r < 4} \eq((2, 5), r) \sum_b x_b\, m^{(b)}_r$$

La somme intérieure est la place $r$ de $u_x$. Les places 4 à 7 portent $W_2$, qui n'entre pas dans l'affirmation. Dans $\eq((2, 5, 0), c)$, le facteur du bit de la couche vaut $1 - 0 = 1$ pour $c < 4$ et $0$ pour $c \ge 4$, donc $\eq((2, 5, 0), c)$ vaut $\eq((2, 5), c)$ sur les places 0 à 3 et 0 sur les autres : c'est la somme ci-dessus. Les places 0 à 3 de $u_x$ valent d'ailleurs $W_1 x = h = (5, -3, 2, 6)$, et la lecture donne $4 \cdot 5 + 8 \cdot 3 - 5 \cdot 2 + 10 \cdot 6 = 94$.

Le contrôle marche. La linéarité donne $\sum_b x_b \Enc(m^{(b)}) = \Enc(u_x)$ pour tous coefficients, et un faux $u'_x$ a un mot qui diffère de $\Enc(u_x)$ en au moins $d$ positions. Le hasard du contrôle vient des positions, pas des coefficients.
:::
:::

Le chapitre [[prouveur-complet]] regroupe toutes les affirmations sur les poids en une seule, et ouvre la table une seule fois.

:::piege
**Deux erreurs faciles.** Une ligne de la table n'est pas une ligne de la matrice : la ligne $b$ réunit les poids de colonne $b$. FlashProve le précise de sa propre table : « a row of the table is not a row of M » (`docs/protocol.md` §6.1). Ensuite, ouvrir une colonne ne prouve rien si le vérifieur ne recalcule pas lui-même le condensé de la feuille et le chemin, à partir de positions qu'il a tirées lui-même (FORMAT R7.10).
:::

## Ce qui reste ouvert

L'exercice sur le faux $u'$ suppose que les lignes engagées sont de vrais mots du code. Rien ne l'impose : le prouveur peut engager une table dont les lignes ne sont pas des mots du code, et ces lignes ne fixent alors pas un message unique. Le dernier exercice de [[engagement-colonnes]] en construit une : après avoir vu le point, le prouveur y choisit entre deux lignes pliées qui annoncent deux valeurs différentes, et chacune passe une position tirée avec la probabilité $1/2$, au lieu de $1/8$ pour une fausse ligne sur une table de mots du code. Le chapitre [[proximite|9]] mesure l'écart d'un mot au code et montre ce que le contrôle par colonnes garantit quand les lignes engagées ne sont pas des mots du code.

## Notre prouveur et FlashProve

| | notre réseau | FlashProve |
|---|---|---|
| table | 4 lignes, 8 places, $n = 32$ | $2^{11}$ lignes, $\ell = 402\,653\,184$, $n = 2^{32}$, queue aléatoire de $44\,040\,191$ coefficients (`policy.txt`, ligne `table` ; article p. 14) |
| rendement | $1/4$ | $0{,}1041$ (article p. 14) |
| feuille | une colonne de 4 symboles | une colonne de $2^{11}$ symboles, plus 40 octets de sel (FORMAT R7.3, R7.4) |
| la ligne pliée | envoyée en clair | engagée comme un nouveau message, $G_u$, puis testée (`blocks/iop/foldeq.h:6-20` et `31-35` ; [[lots]]) |
| ce que garde le prouveur | toute la table | un niveau de chaque arbre ; il recalcule les colonnes à partir des fichiers de poids (`docs/protocol.md` §4) |

Le fichier `policy.txt` est `prover/examples/target_full_f2/policy.txt`, dont la ligne `table 11 32 402653184 44040191 0 18` donne, dans l'ordre, l'exposant du nombre de lignes ($2^{11}$), l'exposant de la longueur ($2^{32}$), $\ell$ et la longueur de la queue (`blocks/frame/parameters.h:84-87`).

:::quiz
1. Que lie la racine ?
2. Pourquoi encoder les lignes avant de hacher ?
3. Que contient une feuille de l'arbre ?
4. Combien de points a le domaine du réseau, et pourquoi pas plus ?
5. La ligne de table $b$ du réseau est-elle une ligne de $W_1$ ?
:::reponse Réponses
1. Elle lie le prouveur à toutes les valeurs de la table, avant tout défi.
2. Pour qu'une fausse ligne pliée diffère du pli des colonnes en presque toutes les positions, et soit donc vue en n'en ouvrant que quelques-unes.
3. Une colonne : le symbole de chaque ligne à une position (plus un sel à partir du chapitre [[cacher]]).
4. 32 : c'est la plus grande puissance de 2 qui divise $96 = p - 1$.
5. Non : c'est la colonne $b$ de $W_1$, puis la colonne $b$ de $W_2$.
:::
:::
