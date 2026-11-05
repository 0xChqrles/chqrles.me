---
id: gkr
---
On veut prouver qu'un nombre $Z$ est le produit de $2^d$ valeurs $L_0, \dots, L_{2^d - 1}$ que le vérifieur ne voit pas :

$$Z = \prod_{i < 2^d} L_i$$

C'est ce que demande un [[lookups|lookup]], dont les deux côtés sont des produits de valeurs cachées, par exemple les $\alpha - K_i$. Le vérifieur doit finir par une seule affirmation sur l'extension multilinéaire $\tilde L$ en un point tiré au hasard, à laquelle un engagement répondra.

Cette page coupe d'abord le produit en un arbre de produits de deux valeurs. Elle écrit ensuite chaque étage de l'arbre comme une somme, que vérifie un [[sumcheck]]. Chaque sumcheck laisse deux affirmations sur l'étage du dessous, et on construit la « ligne », qui les réunit en une seule. On descend ainsi jusqu'aux feuilles, sur un exemple à quatre feuilles, puis on suit un tricheur et on compte les tours. Ce protocole est celui de Goldwasser, Kalai et Rothblum, qu'on appelle **GKR**, appliqué à un arbre de multiplications sous la forme que lui donne Thaler.

## Pourquoi un produit pose problème

Le sumcheck vérifie une somme $\sum_x F(x)$ quand $F$ a un petit degré en chaque variable. Un produit de $2^d$ valeurs n'est pas une somme, et l'écrire comme un seul polynôme des $L_i$ donnerait un degré $2^d$.

Un produit de **deux** valeurs, lui, a le degré 2. On coupe donc le grand produit en produits de deux valeurs, étage par étage, et on vérifie chaque étage séparément.

## L'arbre des produits

On range les feuilles dans l'étage $V_d = L$, puis on construit chaque étage en multipliant les entrées de l'étage du dessous deux par deux. L'étage $V_\ell$ a $2^\ell$ entrées, et l'entrée $i$ est le produit des entrées $i$ et $i + 2^\ell$ de l'étage $\ell + 1$ :

$$V_\ell(i) = V_{\ell+1}(i) \cdot V_{\ell+1}(i + 2^\ell), \qquad i < 2^\ell$$

L'étage $V_0$ a une seule entrée, le produit de toutes les feuilles, donc $Z = V_0(0)$.

On écrit les indices en bits, avec la convention du cours : la variable $x_1$ est le bit de poids faible. L'indice $i + 2^\ell$ ne diffère de $i$ que par le bit de poids $2^\ell$, le plus fort de l'étage $\ell + 1$. En écrivant un indice de l'étage $\ell + 1$ comme $(x, x_{\ell+1})$, où $x$ porte les $\ell$ bits du bas, la règle devient :

$$V_\ell(x) = V_{\ell+1}(x, 0) \cdot V_{\ell+1}(x, 1), \qquad x \in \{0, 1\}^\ell$$

:::exercice ★
Avec 8 feuilles, quelles feuilles sont multipliées entre elles pour former l'étage 2 ? Quelles entrées de l'étage 2 sont multipliées pour former l'étage 1 ?

:::reponse
L'étage 2 a 4 entrées, et l'entrée $i$ multiplie les feuilles $i$ et $i + 4$ : $(0, 4)$, $(1, 5)$, $(2, 6)$, $(3, 7)$. L'étage 1 multiplie les entrées $i$ et $i + 2$ de l'étage 2 : $(0, 2)$ et $(1, 3)$.
:::
:::

:::exercice ★
Les feuilles sont $L = (9, 7, 7, 10)$ dans $\F_{97}$. Calculez l'étage 1 et $Z$.

:::reponse
$V_1 = (L_0 L_2,\ L_1 L_3) = (63, 70)$, puis $Z = 63 \cdot 70 = 4410 = 45 \cdot 97 + 45$, donc $Z = 45$.
:::
:::

Ces feuilles sont les $\alpha - K_i$ du lookup de la table $(0, 1, 2, 3)$, avec les clés $(1, 3, 3, 0)$ et $\alpha = 10$. On les garde comme exemple pour toute la page.

:::figure L'arbre des feuilles $(9, 7, 7, 10)$ dans $\F_{97}$. Chaque nœud multiplie les deux nœuds de l'étage du dessous dont les indices ne diffèrent que par le bit le plus fort : les feuilles 0 et 2, puis 1 et 3.
<svg viewBox="0 0 480 222" role="img" aria-label="Un arbre de produits. En bas, les quatre feuilles 9, 7, 7 et 10, d'indices 0 à 3. À l'étage 1, 63 est le produit des feuilles 0 et 2, et 70 celui des feuilles 1 et 3 : les traits se croisent. En haut, la racine 45, le produit 63 fois 70 réduit modulo 97."><text x="0" y="45" class="m">étage 0</text><text x="0" y="115" class="m">étage 1</text><text x="0" y="185" class="m">feuilles</text><rect x="242" y="26" width="56" height="28" class="ring"/><text x="270" y="45" class="b mid">45</text><rect x="202" y="96" width="56" height="28" class="box"/><text x="230" y="115" class="b mid">63</text><rect x="282" y="96" width="56" height="28" class="box"/><text x="310" y="115" class="b mid">70</text><line x1="230" y1="96" x2="262" y2="54" class="l"/><line x1="310" y1="96" x2="278" y2="54" class="l"/><rect x="122" y="166" width="56" height="28" class="box"/><text x="150" y="185" class="b mid">9</text><rect x="202" y="166" width="56" height="28" class="box"/><text x="230" y="185" class="b mid">7</text><rect x="282" y="166" width="56" height="28" class="box"/><text x="310" y="185" class="b mid">7</text><rect x="362" y="166" width="56" height="28" class="box"/><text x="390" y="185" class="b mid">10</text><line x1="150" y1="166" x2="222" y2="124" class="l"/><line x1="310" y1="166" x2="238" y2="124" class="l"/><line x1="230" y1="166" x2="302" y2="124" class="lc"/><line x1="390" y1="166" x2="318" y2="124" class="lc"/><text x="150" y="214" class="m s mid">i = 0</text><text x="230" y="214" class="m s mid">i = 1</text><text x="310" y="214" class="m s mid">i = 2</text><text x="390" y="214" class="m s mid">i = 3</text><text x="380" y="45" class="m s">4410 ≡ 45</text></svg>
:::

## Un étage est une somme

Le vérifieur ne voit aucun étage. Il reçoit des affirmations, et la première est $Z = V_0(0)$. On cherche à ramener une affirmation sur l'étage $\ell$ à une affirmation sur l'étage $\ell + 1$, jusqu'aux feuilles.

Une affirmation sur l'étage $\ell$ porte sur son extension multilinéaire en un point $z$ de $\ell$ coordonnées : $\tilde V_\ell(z) = C$. Par définition de l'extension ([[multilineaire]]), puis par la règle de l'arbre :

$$
\begin{aligned}
\tilde V_\ell(z) &= \sum_{x \in \{0,1\}^\ell} \eq(z, x)\, V_\ell(x) \\
&= \sum_{x \in \{0,1\}^\ell} \eq(z, x)\, \tilde V_{\ell+1}(x, 0)\, \tilde V_{\ell+1}(x, 1)
\end{aligned}
$$

La seconde ligne remplace $V_{\ell+1}$ par son extension, ce qui ne change rien aux points du cube, où les deux coïncident. L'affirmation sur l'étage $\ell$ est donc une somme sur $2^\ell$ points d'un produit de deux fonctions multilinéaires de l'étage $\ell + 1$.

## Un sumcheck par étage

On vérifie cette somme par un sumcheck à **tours d'égalité** ([[sumcheck]]) : le facteur $\eq(z, x)$ reste hors du polynôme du tour, et le tour $j$ contrôle

$$(1 - z_j)\, g_j(0) + z_j\, g_j(1) = C_{j-1}$$

Le polynôme $g_j$ ne contient que le produit $\tilde V_{\ell+1}(\cdot, 0)\, \tilde V_{\ell+1}(\cdot, 1)$, où la variable libre apparaît au degré 1 dans chaque facteur, donc $g_j$ a le degré 2. Un faux $g_j$ coïncide avec le vrai en au plus 2 points, donc il passe le défi avec une probabilité au plus $2/|\E|$.

Après les $\ell$ tours, de défis $r = (r_1, \dots, r_\ell)$, il reste l'affirmation :

$$\tilde V_{\ell+1}(r, 0) \cdot \tilde V_{\ell+1}(r, 1) = C_\ell$$

Pour $\ell = 0$, il n'y a pas de variable, donc pas de tour, et l'affirmation est directement $V_1(0) \cdot V_1(1) = Z$.

Le vérifieur ne peut pas calculer le côté gauche, qui porte sur l'étage du dessous. Le prouveur envoie donc les deux valeurs $v_0 = \tilde V_{\ell+1}(r, 0)$ et $v_1 = \tilde V_{\ell+1}(r, 1)$, et le vérifieur contrôle $v_0 \cdot v_1 = C_\ell$. Il lui reste deux affirmations sur l'étage $\ell + 1$, en deux points.

## La ligne

:::exercice ★★
Pourquoi ne garde-t-on pas les deux affirmations $\tilde V_{\ell+1}(r, 0) = v_0$ et $\tilde V_{\ell+1}(r, 1) = v_1$ jusqu'aux feuilles, en lançant un sumcheck pour chacune ?

:::reponse
Chaque affirmation sur un étage en donne deux sur l'étage du dessous. Le nombre d'affirmations doublerait donc à chaque étage, et il y en aurait $2^d$ sur les feuilles, autant que de feuilles : le vérifieur lirait toutes les feuilles.
:::
:::

Il faut donc réunir les deux affirmations en une seule. Les deux points $(r, 0)$ et $(r, 1)$ sont sur la droite $X \mapsto (r, X)$. Le long de cette droite, $\tilde V_{\ell+1}(r, X)$ est un polynôme de degré 1 en $X$, puisque l'extension est multilinéaire, et ses valeurs en 0 et 1 le fixent :

$$\tilde V_{\ell+1}(r, X) = (1 - X)\, v_0 + X\, v_1 \quad \text{si } v_0 \text{ et } v_1 \text{ sont justes}$$

Le vérifieur tire un défi $\xi$ et garde une seule affirmation, au point $(r, \xi)$ de $\ell + 1$ coordonnées :

$$\tilde V_{\ell+1}(r, \xi) = (1 - \xi)\, v_0 + \xi\, v_1$$

Si $v_0$ ou $v_1$ est faux, le polynôme $(1 - X) v_0 + X v_1$ diffère du vrai $\tilde V_{\ell+1}(r, X)$. Deux polynômes différents de degré 1 coïncident en au plus un point, donc la nouvelle affirmation est fausse, sauf avec une probabilité au plus $1/|\E|$. Le point $(r, \xi)$ devient le point $z$ de l'étage suivant, avec $\xi$ comme coordonnée du bit le plus fort.

## Jusqu'aux feuilles

On recommence étage par étage. Après l'étage $d - 1$, la dernière affirmation porte sur les feuilles, en un point $\rho$ de $d$ coordonnées : $\tilde L(\rho) = C$. Une seule valeur des feuilles est lue, en un point tiré au hasard, ce qu'on cherchait.

Dans un lookup, les feuilles du côté des clés valent $L_i = \alpha - K_i$. L'extension est linéaire et $\sum_i \eq(\rho, i) = 1$, donc :

$$\tilde L(\rho) = \sum_i \eq(\rho, i)\,(\alpha - K_i) = \alpha - \tilde K(\rho)$$

L'affirmation finale porte donc sur l'extension des clés, et c'est à l'engagement des clés d'y répondre.

## L'exemple

On reprend $L = (9, 7, 7, 10)$, avec $Z = 45$.

À l'étage 0, il n'y a pas de tour. Le prouveur envoie $v_0 = 63$ et $v_1 = 70$, et le vérifieur contrôle $63 \cdot 70 = 4410 \equiv 45$. Il tire $\xi_1 = 4$ et garde l'affirmation sur l'étage 1 au point $z = (4)$ :

$$\tilde V_1(4) = (1 - 4) \cdot 63 + 4 \cdot 70 = -189 + 280 = 91$$

:::exercice ★★
Faites l'étage 1. Écrivez $g(X) = \tilde L(X, 0)\, \tilde L(X, 1)$ et contrôlez le tour d'égalité en $z_1 = 4$. Le défi du tour est 7 : calculez $g(7)$, puis les valeurs $v_0 = \tilde L(7, 0)$ et $v_1 = \tilde L(7, 1)$ que le prouveur envoie, et le contrôle $v_0 v_1 = g(7)$. Avec $\xi_2 = 2$, quelle affirmation reste-t-il sur $\tilde L$, puis sur $\tilde K$ ?

:::reponse
Avec $x_1$ pour bit de poids faible, $\tilde L(X, 0)$ relie $L_0 = 9$ et $L_1 = 7$, et $\tilde L(X, 1)$ relie $L_2 = 7$ et $L_3 = 10$ :

$$
\begin{aligned}
\tilde L(X, 0) &= (1 - X) \cdot 9 + X \cdot 7 = 9 - 2X \\
\tilde L(X, 1) &= (1 - X) \cdot 7 + X \cdot 10 = 7 + 3X \\
g(X) &= (9 - 2X)(7 + 3X) = 63 + 13X - 6X^2
\end{aligned}
$$

Le tour d'égalité : $g(0) = 63$, $g(1) = 70$, et $(1 - 4) \cdot 63 + 4 \cdot 70 = 91$, l'affirmation de l'étage.

Au défi 7 : $g(7) = 63 + 91 - 294 = -140 \equiv 54$. Le prouveur envoie $v_0 = 9 - 14 = -5 \equiv 92$ et $v_1 = 7 + 21 = 28$, et $(-5) \cdot 28 = -140 \equiv 54$.

La ligne en $\xi_2 = 2$ : $\tilde L(7, 2) = (1 - 2)(-5) + 2 \cdot 28 = 61$. Comme $\tilde L = 10 - \tilde K$, l'affirmation sur les clés est $\tilde K(7, 2) = 10 - 61 = -51 \equiv 46$.
:::
:::

:::exercice ★
Vérifiez $\tilde K(7, 2) \equiv 46$ directement à partir des clés $(1, 3, 3, 0)$, en calculant $\eq((7, 2), i)$ pour $i = 0, 1, 2, 3$.

:::reponse
Avec $i = (i_1, i_2)$ et $i_1$ le bit de poids faible :

$$
\begin{aligned}
\eq((7,2), 0) &= (1 - 7)(1 - 2) = 6 \\
\eq((7,2), 1) &= 7\,(1 - 2) = -7 \\
\eq((7,2), 2) &= (1 - 7) \cdot 2 = -12 \\
\eq((7,2), 3) &= 7 \cdot 2 = 14
\end{aligned}
$$

Donc $\tilde K(7, 2) = 6 \cdot 1 - 7 \cdot 3 - 12 \cdot 3 + 14 \cdot 0 = -51 \equiv 46$, la valeur que GKR a laissée.
:::
:::

## Un tricheur

:::exercice ★★★
Le prouveur annonce $Z = 46$ au lieu de 45. À l'étage 0, il envoie $v_0 = 63$ et le $v_1$ qui fait passer $v_0 v_1 = 46$. Calculez ce $v_1$, puis l'affirmation qu'il doit défendre sur $\tilde V_1(4)$, et dites où il est attrapé.

:::reponse
Il faut $v_1 = 46/63$. L'algorithme d'Euclide ([[modulo]]) donne $1/63 = 77$, et on vérifie $63 \cdot 77 = 4851 = 50 \cdot 97 + 1$. Donc $v_1 = 46 \cdot 77 = 3542 = 36 \cdot 97 + 50$, soit $v_1 = 50$.

Avec $\xi_1 = 4$, il doit défendre :

$$\tilde V_1(4) = (1 - 4) \cdot 63 + 4 \cdot 50 = 11$$

alors que la vraie valeur est 91. Le vrai polynôme du tour vérifie $(1 - 4)\, g(0) + 4\, g(1) = 91$, donc pour passer le tour d'égalité il doit envoyer un $g'$ différent de $g$. Les deux ont le degré 2, donc ils coïncident en au plus 2 points, et le défi tombe sur l'un d'eux avec une probabilité au plus $2/|\E|$.

Sinon, $g'(r)$ est faux, donc l'un des $v_0, v_1$ qu'il envoie ensuite est faux, et la ligne le garde faux sauf avec une probabilité au plus $1/|\E|$. L'affirmation finale sur $\tilde K$ est alors fausse, et l'engagement des clés la rejette.

Le notebook essaie une stratégie : décaler $g$ d'une constante, puis garder le vrai $v_0$. Elle passe sur 96 des $97^2$ couples de défis $(r, \xi)$ de $\F_{97}$, tous avec $\xi = 0$ : comme $v_0$ est juste, le faux polynôme $(1 - X) v_0 + X v_1$ et le vrai coïncident en $X = 0$.
:::
:::

## Le coût

:::exercice ★★
L'étage $\ell$ demande $\ell$ tours de sumcheck. Combien de tours en tout pour un arbre de $2^{20}$ feuilles ?

:::reponse
Les étages vont de 0 à 19, donc $0 + 1 + \dots + 19 = \dfrac{19 \cdot 20}{2} = 190$ tours.
:::
:::

Pour $2^d$ feuilles, il y a donc $d(d-1)/2$ tours, chacun de trois valeurs au plus, et $d$ lignes. Chaque tour laisse passer une fausse affirmation avec une probabilité au plus $2/|\E|$ et chaque ligne avec une probabilité au plus $1/|\E|$, donc une fausse valeur de $Z$ passe avec une probabilité au plus :

$$\sum_{\ell = 0}^{d - 1} \frac{2\ell + 1}{|\E|} = \frac{d^2}{|\E|}$$

Le prouveur calcule chaque étage une fois, et l'étage $\ell$ a $2^\ell$ entrées, donc son travail est de l'ordre de $2^d$, le nombre de feuilles.

:::piege
**La convention d'appariement.** Ici, l'étage multiplie les entrées $i$ et $i + 2^\ell$, qui ne diffèrent que par le bit le plus fort. L'arbre de Thaler multiplie des voisines, $2i$ et $2i + 1$, qui diffèrent par le bit le plus faible. Les deux arbres ont la même racine, mais la coordonnée que chaque ligne ajoute n'est pas la même : $\xi$ est celle du bit le plus fort ici, celle du bit le plus faible chez Thaler. Un vérifieur qui suit l'autre convention lit les feuilles au mauvais point et rejette une preuve juste.
:::

:::piege
**Le contrôle $v_0 v_1 = C_\ell$.** Sans lui, les valeurs envoyées à la fin d'un étage n'ont aucun lien avec la somme que le sumcheck vient de vérifier, et le prouveur peut choisir n'importe quelle affirmation sur l'étage suivant.
:::

## Dans FlashProve

Chaque côté de chaque lookup de FlashProve est un arbre de produits prouvé étage par étage. Un étage de $m$ variables est un sumcheck de $m$ tours d'égalité de degré 2, suivi du tour `LINE`, qui forme $C' = (1 - \xi)\, v_L + \xi\, v_R$ (format 11.1, « A product level »). Ses arbres multiplient, comme ici, les entrées qui diffèrent par le bit le plus fort, et le code signale que l'arbre de Thaler multiplie celles qui diffèrent par le bit le plus faible (`blocks/iop/lkp.h`, lignes 106 à 113, qui citent GKR, ECCC TR17-108, §1.8 et §3.2, et Thaler, arXiv:1304.3812, §5.3.1).

Du côté de la table, les racines $G_j$ des 32 plans sont reliées par la méthode « élever au carré et multiplier » : $P_{31} = G_{31}$, puis $P_j = P_{j+1}^2\, G_j$, et $Z = a\, P_0$. Chaque valeur que le lookup envoie est cachée sous un masque, donc le vérifieur ne calcule pas ces produits lui-même. Chaque égalité $P_j = P_{j+1}^2\, G_j$ (et $Z = a\, P_1^2\, G_0$ pour la première) est prouvée par un sumcheck sans variable de somme, de degré 3 en les valeurs envoyées : 31 sumchecks pour 32 plans (`lkp.h`, lignes 60 à 66 ; `docs/format/11-1-machinery.md`, « Step 3: the tie »).
