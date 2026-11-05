---
id: multilineaire
---
On a une colonne de $2^n$ valeurs, $f = (f_0, \dots, f_{2^n - 1})$, dans un corps fini. On cherche un polynôme qui redonne ces valeurs sur les indices et qu'on peut évaluer en n'importe quel point avec un calcul court. Cette page montre d'abord pourquoi un polynôme à une seule variable ne convient pas. Elle construit ensuite un polynôme avec une variable par bit de l'indice, l'**extension multilinéaire**, montre qu'il est unique et qu'il s'évalue en pliant la colonne, et elle finit par la convention d'ordre des bits, que le prouveur et le vérifieur doivent partager.

## Une seule variable ne suffit pas

On peut chercher un polynôme $F$ à une variable avec $F(i) = f_i$ pour $i = 0, \dots, 2^n - 1$. Il en existe un seul de degré au plus $2^n - 1$ ([[polynomes]]), et c'est ce degré qui pose problème.

On veut comparer deux colonnes par leurs polynômes en un point tiré au hasard. Deux colonnes différentes donnent deux polynômes différents, et leur différence, de degré au plus $2^n - 1$, a au plus $2^n - 1$ racines ([[polynomes]]). Le test laisse donc passer deux colonnes différentes avec une probabilité qui peut atteindre $(2^n - 1)/97$ dans $\F_{97}$. Avec 64 lignes, elle vaut déjà $63/97$. Au-delà de 97 lignes, on ne peut même plus définir $F$, puisque les indices 0 et 97 sont le même point du corps. Il faut un polynôme de plus petit degré, et on le trouve en donnant plus de variables au polynôme.

## Une variable par bit

On écrit l'indice en binaire, $i = \sum_{k=1}^{n} 2^{k-1} i_k$, où $i_k$ est le bit $k - 1$ : le bit de poids faible est $i_1$. On donne une variable $x_k$ à chaque bit, et on cherche un polynôme de degré au plus 1 en chaque variable qui vaut $f_i$ au point $(i_1, \dots, i_n)$. Ces $2^n$ points sont les **coins** du cube $\{0, 1\}^n$.

Avec un seul bit, la colonne a deux valeurs, et la droite

$$(1 - x_1)\, f_0 + x_1 f_1$$

vaut $f_0$ en 0 et $f_1$ en 1 ([[polynomes]]).

Avec deux bits, on applique la droite deux fois. Les indices 0 et 1 ont $x_2 = 0$, et la droite en $x_1$ qui passe par $f_0$ et $f_1$ les relie. Les indices 2 et 3 ont $x_2 = 1$, et la droite qui passe par $f_2$ et $f_3$ les relie. Une droite en $x_2$ relie ensuite ces deux droites :

$$\tilde f(x_1, x_2) = (1 - x_2)\big[(1 - x_1) f_0 + x_1 f_1\big] + x_2 \big[(1 - x_1) f_2 + x_1 f_3\big]$$

En développant, chaque $f_i$ est multiplié par un produit de deux facteurs :

$$\tilde f(x_1, x_2) = (1 - x_1)(1 - x_2)\, f_0 + x_1 (1 - x_2)\, f_1 + (1 - x_1)\, x_2\, f_2 + x_1 x_2\, f_3$$

Le poids de $f_i$ a un facteur par bit : $x_k$ si le bit $i_k$ vaut 1, et $1 - x_k$ s'il vaut 0. L'expression $x_k i_k + (1 - x_k)(1 - i_k)$ couvre les deux cas, et le produit de ces facteurs s'appelle $\eq$ :

$$\eq(x, i) = \prod_{k=1}^{n} \big(x_k i_k + (1 - x_k)(1 - i_k)\big)$$

En un coin $x = j$, le facteur $k$ vaut 1 si $j_k = i_k$ et 0 sinon. Donc $\eq(j, i)$ vaut 1 si $j = i$ et 0 sinon, d'où son nom.

On pose, pour $n$ bits et un point $z$ quelconque :

$$\tilde f(z) = \sum_{i=0}^{2^n - 1} \eq(z, i)\, f_i$$

Au coin $j$, seul le terme $i = j$ reste, donc $\tilde f(j) = f_j$. Chaque $\eq(z, i)$ est de degré au plus 1 en chaque variable, donc $\tilde f$ aussi. On dit que $\tilde f$ est **multilinéaire**, et on l'appelle l'**extension multilinéaire** de $f$. Son degré total est au plus $n$, au lieu de $2^n - 1$.

Deux colonnes différentes diffèrent en un coin, donc leurs extensions aussi, et la différence des extensions est de degré total au plus $n$. Le test en un point tiré au hasard dans $\F_{97}^n$ laisse donc passer deux colonnes différentes avec une probabilité d'au plus $n/97$ ([[schwartz-zippel]]) : $6/97$ pour 64 lignes, au lieu de $63/97$.

:::exercice ★
Calculez $\eq((5, 3), i)$ pour $i = 0, 1, 2, 3$, et vérifiez que leur somme vaut 1.
:::reponse
$i = 0$ : $(1 - 5)(1 - 3) = 8$. $i = 1$ : $5 \times (1 - 3) = -10$. $i = 2$ : $(1 - 5) \times 3 = -12$. $i = 3$ : $5 \times 3 = 15$. La somme vaut $8 - 10 - 12 + 15 = 1$.
:::
:::

:::exercice ★
Les prix d'un reçu sont $p = (5, 7, 11, 13)$. Calculez $\tilde p(5, 3)$ par la somme pondérée.
:::reponse
Avec les poids de l'exercice précédent : $8 \times 5 - 10 \times 7 - 12 \times 11 + 15 \times 13 = 40 - 70 - 132 + 195 = 33$.
:::
:::

## Les coefficients

Un polynôme de degré au plus 1 en $x_1$ et en $x_2$ s'écrit $a + b x_1 + c x_2 + d x_1 x_2$. Le terme $x_1 x_2$ est permis, puisqu'il est de degré 1 en chaque variable : « multilinéaire » ne veut pas dire « linéaire ».

:::exercice ★★
Développez $\tilde p$ pour $p = (5, 7, 11, 13)$, et montrez que son terme en $x_1 x_2$ est nul. Que dit cette absence sur les prix ?
:::reponse
La forme développée donne la constante $f_0$, le coefficient $f_1 - f_0$ pour $x_1$, $f_2 - f_0$ pour $x_2$ et $f_3 - f_2 - f_1 + f_0$ pour $x_1 x_2$. Donc :

$$\tilde p = 5 + (7 - 5)\, x_1 + (11 - 5)\, x_2 + (13 - 11 - 7 + 5)\, x_1 x_2 = 5 + 2x_1 + 6x_2$$

Le coefficient de $x_1 x_2$ s'annule parce que $13 - 11 = 7 - 5$ : le pas d'un indice au suivant le long de $x_1$ est le même pour $x_2 = 0$ et pour $x_2 = 1$.
:::
:::

:::exercice ★★
Écrivez $\tilde q$ pour les quantités $q = (27, 9, 3, 1)$. Montrez qu'aucun autre polynôme de degré au plus 1 en chaque variable ne prend ces quatre valeurs aux coins.
:::reponse
Les coefficients de l'exercice précédent donnent $27$, $9 - 27 = -18$, $3 - 27 = -24$ et $1 - 3 - 9 + 27 = 16$, donc $\tilde q = 27 - 18x_1 - 24x_2 + 16x_1x_2$.

Soit $a + b x_1 + c x_2 + d x_1 x_2$ un polynôme qui prend ces valeurs. Au coin $(0, 0)$ il vaut $a$, donc $a = 27$. Au coin $(1, 0)$ il vaut $a + b$, donc $b = -18$, et au coin $(0, 1)$ il vaut $a + c$, donc $c = -24$. Au coin $(1, 1)$ il vaut $a + b + c + d$, donc $d = 16$. Chaque valeur fixe un coefficient, donc il n'y a qu'une solution.
:::
:::

Le même raisonnement vaut pour $n$ variables. Un polynôme multilinéaire a un coefficient par ensemble de variables, soit $2^n$ coefficients. Au coin $j$, la variable $x_k$ vaut le bit $j_k$, donc il ne reste que les coefficients des ensembles formés de variables qui valent 1 en $j$. L'un d'eux est l'ensemble de toutes ces variables, et les autres sont plus petits. En prenant les coins par nombre croissant de bits à 1, les coefficients des ensembles plus petits sont déjà fixés, et chaque valeur fixe un nouveau coefficient. L'extension multilinéaire est donc le seul polynôme multilinéaire qui prend les valeurs de $f$ aux coins. Ses $2^n$ valeurs suffisent à la décrire, et on n'a jamais besoin de ses coefficients.

## Évaluer en pliant

La somme pondérée demande $2^n$ poids de $n$ facteurs chacun. On cherche un calcul plus court, en fixant les variables une à une.

On sépare dans $\eq(z, i)$ le facteur du premier bit :

$$\eq(z, i) = \big(z_1 i_1 + (1 - z_1)(1 - i_1)\big)\, \eq\big((z_2, \dots, z_n), (i_2, \dots, i_n)\big)$$

Les indices $2b$ et $2b + 1$ ont les mêmes bits $i_2, \dots, i_n$, ceux de $b$, et ils diffèrent par $i_1$, qui vaut 0 pour $2b$ et 1 pour $2b + 1$. En groupant les termes par paires, on obtient :

$$\tilde f(z) = \sum_{b=0}^{2^{n-1} - 1} \eq\big((z_2, \dots, z_n), b\big)\, \big[(1 - z_1)\, f_{2b} + z_1 f_{2b+1}\big]$$

C'est l'extension multilinéaire, au point $(z_2, \dots, z_n)$, de la colonne de $2^{n-1}$ valeurs $(1 - z_1)\, f_{2b} + z_1 f_{2b+1}$. Remplacer chaque paire voisine $(f_{2b}, f_{2b+1})$ par $(1 - r)\, f_{2b} + r f_{2b+1}$ s'appelle **plier** la colonne en $r$. Plier en $z_1$ ramène donc le calcul de $\tilde f(z)$ au même calcul sur une colonne deux fois plus courte, et $n$ pliages laissent une seule valeur, $\tilde f(z)$.

Chaque nouvelle valeur s'écrit $f_{2b} + r\,(f_{2b+1} - f_{2b})$, avec une seule multiplication. Les pliages successifs en demandent $2^{n-1} + 2^{n-2} + \dots + 1 = 2^n - 1$ en tout.

:::exercice ★
Calculez $\tilde p(5, 3)$ pour $p = (5, 7, 11, 13)$ par deux pliages, et comparez avec la somme pondérée.
:::reponse
Plier en 5 donne $(-4 \times 5 + 5 \times 7,\ -4 \times 11 + 5 \times 13) = (15, 21)$. Plier en 3 donne $-2 \times 15 + 3 \times 21 = 33$, la valeur de la somme pondérée.
:::
:::

## Une somme de poids égale à 1

Les poids de $(5, 3)$ ont pour somme 1. Ce n'est pas propre à ce point.

:::exercice ★★★
Montrez que $\sum_i \eq(z, i) = 1$ pour tout point $z$. Déduisez-en que $\tilde f(z)$ est une moyenne pondérée des $f_i$, et dites ce qui la distingue d'une moyenne au sens habituel.
:::reponse
La somme porte sur tous les choix des bits $i_1, \dots, i_n$, et chaque terme est un produit d'un facteur par bit. Elle se factorise donc bit par bit :

$$\sum_i \eq(z, i) = \prod_{k=1}^{n} \sum_{i_k \in \{0, 1\}} \big(z_k i_k + (1 - z_k)(1 - i_k)\big) = \prod_{k=1}^{n} \big((1 - z_k) + z_k\big) = 1$$

$\tilde f(z)$ est donc une somme des $f_i$ avec des poids de somme 1. Ces poids peuvent être négatifs, comme $-10$ et $-12$ en $(5, 3)$, donc $\tilde f(z)$ peut être hors de l'intervalle des $f_i$. Sur les entiers, $\tilde q(5, 3) = 105$ pour les quantités $(27, 9, 3, 1)$.
:::
:::

## L'ordre des bits

Tout ce qui précède suppose que $x_1$ est le bit de poids faible, de sorte que plier en $x_1$ combine deux entrées voisines. L'autre convention, où $x_1$ est le bit de poids fort, est aussi cohérente, mais elle ne donne pas la même valeur au même point.

:::exercice ★★
Calculez $\tilde p(5, 3)$ pour $p = (5, 7, 11, 13)$ avec la convention inverse, où $x_1$ est le bit de poids fort.
:::reponse
Avec cette convention, le point $(5, 3)$ met 5 sur le bit de poids fort et 3 sur le bit de poids faible : c'est le point $(3, 5)$ de notre convention. Avec $\tilde p = 5 + 2x_1 + 6x_2$, on trouve $\tilde p(3, 5) = 5 + 6 + 30 = 41$, et non 33. Un prouveur et un vérifieur qui n'ont pas la même convention forment des affirmations différentes sur les mêmes données, et le vérifieur rejette une preuve honnête.
:::
:::

## Dans FlashProve

FlashProve lit chaque vecteur engagé par son extension multilinéaire. Son format définit la valeur d'un vecteur $a$ au point $z$ comme $\sum_i \eq(z, i)\, a(i)$, « le seul polynôme de degré au plus 1 en chaque coordonnée qui coïncide avec $a$ sur les points de zéros et de uns » (`docs/format/11-1-machinery.md`, « Notation » ; D2 §1.1).

Son cadre suit notre convention : le bit 0 d'un indice est le bit de poids faible et appartient à la première variable, et plier en $g$ remplace les lignes $2b$ et $2b + 1$ par $(1 - g)$ fois la ligne $2b$ plus $g$ fois la ligne $2b + 1$ (`blocks/README.md`, règle 3). Ses sous-preuves écrivent au contraire un point avec la coordonnée du bit de poids fort en premier, et le format place ce passage d'une convention à l'autre en tête des erreurs faciles (`docs/format/11-1-machinery.md`, « The order of bits » et « Easy to get wrong »).

La réponse de FlashProve à un [[hors-domaine|échantillon hors domaine]] sur la table des poids est aussi une extension multilinéaire, évaluée, à pleine taille, en un point de 29 coordonnées, à laquelle s'ajoute un terme masqué (article, définition 4.3 et preuve du lemme A.25, d'après D1 §5.2).
