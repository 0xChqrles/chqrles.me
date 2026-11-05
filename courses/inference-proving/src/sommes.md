---
id: sommes
---
Le total du reçu est une somme de produits, $\sum_i p_i q_i$, et chaque couche du réseau en est une aussi, puisque chaque entrée d'un produit d'une matrice par un vecteur additionne des produits d'un poids par une entrée. Ce chapitre construit un protocole qui vérifie une telle somme en ne lisant qu'une valeur de chaque colonne, prise en un point tiré au hasard. Il faut d'abord savoir lire une colonne en un point qui n'est pas une de ses lignes : c'est l'[[multilineaire|extension multilinéaire]]. Le protocole lui-même s'appelle le [[sumcheck]]. On le déroule sur le reçu, dans $\F_{97}$, puis on suit un prouveur qui triche jusqu'au contrôle qui le rejette, et on compte ce que le protocole coûte.

## Ce que le vérifieur peut lire

Dans le corps jouet $\F_{97}$ du chapitre [[nombres]], l'énoncé du reçu s'écrit :

$$\sum_{i=0}^{3} p_i q_i = 244 \equiv 50 \pmod{97}$$

Le vérifieur connaît la valeur annoncée, 50, et la racine $R$ qui désigne le reçu. Il ne lit pas les quatre lignes, puisque la première exigence du [[prouver-sans-refaire|chapitre 1]] lui interdit de lire autant de données que le calcul en manipule. Le chapitre [[engager]] lui donnera une seule lecture par colonne : la valeur de la colonne en un point qu'il choisit, reliée à $R$.

Une ligne ne peut pas servir de lecture. Le montant d'une ligne ne dit rien des trois autres, donc un prouveur qui fausse une ligne que le vérifieur ne lit pas n'est pas détecté. La valeur lue doit dépendre de toutes les lignes à la fois, et c'est le cas d'une colonne lue en un point qui n'est pas une de ses lignes.

## Les colonnes du reçu en polynômes

On numérote les quatre lignes par deux bits, $i = x_1 + 2x_2$, où $x_1$ est le bit de poids faible :

| ligne $i$ | $x_1$ | $x_2$ | prix $p_i$ | quantité $q_i$ |
|---:|---:|---:|---:|---:|
| 0 | 0 | 0 | 5 | 27 |
| 1 | 1 | 0 | 7 | 9 |
| 2 | 0 | 1 | 11 | 3 |
| 3 | 1 | 1 | 13 | 1 |

La page [[multilineaire]] construit, pour une colonne $f$ de quatre valeurs, le seul polynôme $\tilde f(x_1, x_2)$ de degré au plus 1 en chaque variable qui vaut $f_i$ au coin $(x_1, x_2)$ de la ligne $i$, et ses exercices le calculent pour les deux colonnes du reçu :

$$
\begin{aligned}
\tilde p(x_1, x_2) &= 5 + 2x_1 + 6x_2 \\
\tilde q(x_1, x_2) &= 27 - 18x_1 - 24x_2 + 16x_1x_2
\end{aligned}
$$

En un point qui n'est pas un coin, $\tilde p$ vaut une somme pondérée des quatre prix. Quand aucune coordonnée du point ne vaut 0 ou 1, aucun poids n'est nul, donc la valeur dépend des quatre prix.

:::exercice ★
Vérifiez que $\tilde p$ et $\tilde q$ redonnent les lignes du reçu aux quatre coins du carré $\{0, 1\}^2$.
:::reponse
Aux coins $(0, 0)$, $(1, 0)$, $(0, 1)$ et $(1, 1)$, $\tilde p$ vaut $5$, $5 + 2 = 7$, $5 + 6 = 11$ et $5 + 2 + 6 = 13$, et $\tilde q$ vaut $27$, $27 - 18 = 9$, $27 - 24 = 3$ et $27 - 18 - 24 + 16 = 1$.
:::
:::

L'énoncé devient une somme sur les quatre coins :

$$\sum_{x \in \{0,1\}^2} \tilde p(x)\, \tilde q(x) = 50$$

## Le premier tour

On a une affirmation sur une somme de quatre termes. On cherche à la remplacer par une affirmation sur une somme de deux termes, à laquelle le vérifieur puisse se fier autant.

On sépare les quatre termes selon la valeur de $x_1$ : les lignes 0 et 2 ont $x_1 = 0$, les lignes 1 et 3 ont $x_1 = 1$. On laisse $x_1$ libre et on somme sur $x_2$ seul, ce qui définit le **polynôme du tour** 1 :

$$g_1(X) = \tilde p(X, 0)\, \tilde q(X, 0) + \tilde p(X, 1)\, \tilde q(X, 1)$$

$g_1(0)$ vaut la somme des montants des lignes 0 et 2, et $g_1(1)$ celle des lignes 1 et 3. Chaque ligne est donc comptée une fois dans

$$g_1(0) + g_1(1) = 50$$

Chaque facteur est de degré au plus 1 en $X$, donc $g_1$ est de degré au plus 2, et trois coefficients le décrivent.

:::exercice ★★
Écrivez $\tilde p(X, 0)$, $\tilde p(X, 1)$, $\tilde q(X, 0)$ et $\tilde q(X, 1)$, puis $g_1$ sur les entiers et modulo 97. Contrôlez $g_1(0) + g_1(1)$.
:::reponse
On remplace $x_2$ par 0 puis par 1 : $\tilde p(X, 0) = 5 + 2X$, $\tilde p(X, 1) = 11 + 2X$, $\tilde q(X, 0) = 27 - 18X$ et $\tilde q(X, 1) = 3 - 2X$. Donc :

$$
\begin{aligned}
g_1(X) &= (5 + 2X)(27 - 18X) + (11 + 2X)(3 - 2X) \\
&= (135 - 36X - 36X^2) + (33 - 16X - 4X^2) \\
&= 168 - 52X - 40X^2 \\
&\equiv 71 + 45X + 57X^2
\end{aligned}
$$

$g_1(0) = 168 \equiv 71$, les lignes 0 et 2 ($135 + 33$), et $g_1(1) = 168 - 52 - 40 = 76$, les lignes 1 et 3 ($63 + 13$). Leur somme vaut $244 \equiv 50$.
:::
:::

Le prouveur envoie les trois coefficients de $g_1$, et le vérifieur contrôle $g_1(0) + g_1(1) = 50$. Ce contrôle ne suffit pas, parce qu'un autre polynôme peut avoir la même somme en 0 et en 1. Il faut encore s'assurer que $g_1$ est le vrai polynôme du tour.

Le vérifieur ne peut pas calculer le vrai polynôme, ni même sa valeur en un point, puisqu'il ne lit pas les lignes. Mais la valeur du vrai polynôme en un point $r_1$ est une somme de deux termes, $\tilde p(r_1, 0)\, \tilde q(r_1, 0) + \tilde p(r_1, 1)\, \tilde q(r_1, 1)$. Le vérifieur tire donc un **défi** $r_1$ dans $\F_{97}$, après avoir reçu $g_1$, et il garde l'affirmation que cette somme vaut $g_1(r_1)$ :

$$C_1 = g_1(r_1) = \tilde p(r_1, 0)\, \tilde q(r_1, 0) + \tilde p(r_1, 1)\, \tilde q(r_1, 1)$$

C'est l'affirmation sur deux termes qu'on cherchait. Deux polynômes différents de degré au plus 2 coïncident en au plus 2 points ([[schwartz-zippel]]). Si $g_1$ est faux, $C_1$ est donc fausse à son tour, sauf si $r_1$ est l'un des au plus 2 points où $g_1$ coïncide avec le vrai polynôme, ce qui arrive avec une probabilité d'au plus $2/97$. Le défi est tiré après l'envoi de $g_1$, parce qu'un prouveur qui connaîtrait $r_1$ choisirait un $g_1$ faux qui coïncide avec le vrai en $r_1$.

Le défi est tiré dans tout le corps, parce qu'un défi pris dans $\{0, 1\}$ ne porterait que sur la moitié des lignes. Un prouveur peut envoyer un $g_1$ juste en 0 et faux en 1, de façon que la somme soit la valeur annoncée. Avec $r_1 = 0$, l'affirmation suivante ne porte que sur les lignes 0 et 2, qui sont justes, et la triche passe. Avec des défis pris dans $\{0, 1\}$, elle passerait donc au moins une fois sur deux.

On prend $r_1 = 5$, et l'affirmation suivante est $C_1 = g_1(5)$.

## Plier les colonnes

L'affirmation $C_1$ porte sur une somme de deux termes, indexés par $x_2$, avec deux colonnes de deux valeurs, $(\tilde p(5, 0), \tilde p(5, 1))$ et $(\tilde q(5, 0), \tilde q(5, 1))$. C'est le problème de départ avec deux fois moins de lignes.

Ces colonnes se calculent sans les coefficients de $\tilde p$. Pour $x_2 = 0$, $\tilde p(x_1, 0)$ est de degré au plus 1 en $x_1$ et vaut $p_0$ en 0 et $p_1$ en 1, donc c'est la droite $(1 - x_1)\, p_0 + x_1\, p_1$ ([[polynomes]]). Pour $x_2 = 1$, c'est la droite qui passe par $p_2$ et $p_3$. On en déduit :

$$
\begin{aligned}
\tilde p(5, 0) &= (1 - 5)\, p_0 + 5\, p_1 \\
\tilde p(5, 1) &= (1 - 5)\, p_2 + 5\, p_3
\end{aligned}
$$

Chaque paire de lignes voisines, $(0, 1)$ puis $(2, 3)$, est remplacée par une seule valeur. On dit qu'on **plie** la colonne en 5 ([[multilineaire]]).

:::exercice ★
Pliez les deux colonnes en 5. Calculez $C_1 = g_1(5)$ avec les coefficients de $g_1$, puis avec les colonnes pliées, et comparez.
:::reponse
$\tilde p(5, \cdot) = (-4 \times 5 + 5 \times 7,\ -4 \times 11 + 5 \times 13) = (15, 21)$ et $\tilde q(5, \cdot) = (-4 \times 27 + 5 \times 9,\ -4 \times 3 + 5 \times 1) = (-63, -7) \equiv (34, 90)$.

Avec les coefficients, $g_1(5) = 168 - 260 - 1000 = -1092 \equiv 72$. Avec les colonnes pliées, $15 \times 34 + 21 \times 90 = 510 + 1890 = 2400 \equiv 72$. Les deux calculs donnent la même valeur, puisque $g_1(5)$ est par définition la somme des produits des colonnes pliées.
:::
:::

## Le second tour

On recommence avec la variable $x_2$. Il ne reste aucune autre variable sur laquelle sommer, donc le polynôme du tour 2 est le produit des deux colonnes pliées, lues comme des fonctions de $x_2$ :

$$g_2(X) = \tilde p(5, X)\, \tilde q(5, X)$$

Le vérifieur contrôle $g_2(0) + g_2(1) = C_1$, tire $r_2$, ici $r_2 = 3$, et garde $C_2 = g_2(3)$. Il ne reste plus de somme : l'affirmation porte sur un seul produit,

$$\tilde p(5, 3)\, \tilde q(5, 3) = C_2$$

:::exercice ★★
Écrivez $\tilde p(5, X)$ et $\tilde q(5, X)$ à partir des colonnes pliées, puis $g_2$ modulo 97. Contrôlez $g_2(0) + g_2(1) = 72$ et calculez $C_2 = g_2(3)$. Pliez ensuite les colonnes en 3 et faites le contrôle final.
:::reponse
La droite qui passe par $(0, 15)$ et $(1, 21)$ est $15 + 6X$, et celle qui passe par $(0, 34)$ et $(1, 90)$ est $34 + 56X$. Donc :

$$
\begin{aligned}
g_2(X) &= (15 + 6X)(34 + 56X) \\
&= 510 + 1044X + 336X^2 \\
&\equiv 25 + 74X + 45X^2
\end{aligned}
$$

$g_2(0) = 25$ et $g_2(1) = 25 + 74 + 45 = 144 \equiv 47$, de somme 72. Ensuite $g_2(3) = 25 + 222 + 405 = 652 \equiv 70$.

Plier en 3 donne $\tilde p(5, 3) = -2 \times 15 + 3 \times 21 = 33$ et $\tilde q(5, 3) = -2 \times 34 + 3 \times 90 = 202 \equiv 8$. Le contrôle final passe : $33 \times 8 = 264 \equiv 70$.
:::
:::

:::figure Le reçu sur le carré $\{0,1\}^2$, chaque point portant $(\tilde p, \tilde q)$. Le tour 1 plie le carré en un segment à $x_1 = 5$, le tour 2 plie le segment en un point à $x_2 = 3$.
<svg viewBox="0 0 480 250" role="img" aria-label="À gauche, les quatre lignes du reçu aux coins d'un carré : ligne 0 (5, 27) et ligne 1 (7, 9) en bas, ligne 2 (11, 3) et ligne 3 (13, 1) en haut. Plier en 5 remplace chaque paire horizontale par un point : le segment du milieu porte (15, 34) en bas et (21, 90) en haut. Plier en 3 laisse un seul point, (33, 8), et 33 × 8 ≡ 70."><text x="100" y="16" class="b mid">les 4 lignes</text><text x="270" y="16" class="b mid">après le tour 1</text><text x="420" y="16" class="b mid">après le tour 2</text><text x="50" y="40" class="m s mid">ligne 2</text><text x="150" y="40" class="m s mid">ligne 3</text><text x="50" y="58" class="b s mid">(11, 3)</text><text x="150" y="58" class="b s mid">(13, 1)</text><rect x="50" y="70" width="100" height="110" class="lm"/><circle cx="50" cy="70" r="5" class="box"/><circle cx="150" cy="70" r="5" class="box"/><circle cx="50" cy="180" r="5" class="box"/><circle cx="150" cy="180" r="5" class="box"/><text x="50" y="202" class="b s mid">(5, 27)</text><text x="150" y="202" class="b s mid">(7, 9)</text><text x="50" y="218" class="m s mid">ligne 0</text><text x="150" y="218" class="m s mid">ligne 1</text><text x="100" y="242" class="m s mid">x₁ : 0 → 1</text><text x="22" y="129" class="m s mid">x₂</text><line x1="178" y1="125" x2="228" y2="125" class="lc" marker-end="url(#fac)"/><text x="203" y="115" class="c s mid">plier en 5</text><line x1="270" y1="70" x2="270" y2="180" class="lm"/><circle cx="270" cy="70" r="5" class="box"/><circle cx="270" cy="180" r="5" class="box"/><text x="270" y="40" class="m s mid">x₂ = 1</text><text x="270" y="58" class="b s mid">(21, 90)</text><text x="270" y="202" class="b s mid">(15, 34)</text><text x="270" y="218" class="m s mid">x₂ = 0</text><line x1="302" y1="125" x2="382" y2="125" class="lc" marker-end="url(#fac)"/><text x="342" y="115" class="c s mid">plier en 3</text><circle cx="420" cy="125" r="6" class="hot"/><text x="420" y="152" class="b s mid">(33, 8)</text><text x="420" y="170" class="m s mid">33 × 8 ≡ 70</text></svg>
:::

## Ce qui reste à vérifier

Le vérifieur finit avec deux affirmations, $\tilde p(5, 3) = 33$ et $\tilde q(5, 3) = 8$, qu'il ne peut pas contrôler seul, puisqu'il ne lit pas les colonnes. Le chapitre [[engager]] les relie à la racine $R$. Si elles tiennent, le contrôle $33 \times 8 \equiv 70$ établit la somme. Le sumcheck réduit donc la lecture des données à une valeur par colonne, en un point $(r_1, r_2)$ que le prouveur ne connaissait pas quand il a envoyé ses polynômes.

Dans notre prouveur, les défis sont tirés dans $\E_{97}$ ([[extension]]), et chaque probabilité de $2/97$ devient $2/97^3$. Les exemples les prennent dans $\F_{97}$ pour que tout se calcule à la main.

## Suivre un prouveur qui triche

:::exercice ★★
Le prouveur annonce 245, soit 51 modulo 97, et il envoie $g_1' = g_1 + X$. Vérifiez que le premier contrôle passe, et calculez l'affirmation $C_1'$ qui passe au second tour avec $r_1 = 5$. Que doit envoyer le prouveur au second tour pour passer le contrôle du tour et le contrôle final ? Avec quelle probabilité y arrive-t-il s'il ne connaît pas les défis à l'avance ?
:::reponse
$g_1'(0) + g_1'(1) = 71 + 77 = 148 \equiv 51$, donc le premier contrôle passe. L'affirmation suivante est $C_1' = g_1'(5) = 72 + 5 = 77$, alors que la vraie valeur est 72.

Au second tour, il faut un $g_2'$ avec $g_2'(0) + g_2'(1) = 77$. On écrit $g_2' = g_2 + d$ : il faut $d(0) + d(1) = 5$. Le contrôle final compare $g_2'(3)$ à $\tilde p(5, 3)\, \tilde q(5, 3) = 70 = g_2(3)$, donc il faut aussi $d(3) = 0$.

S'il connaissait $r_2 = 3$ à l'avance, il prendrait $d = 3 - X$, puisque $d(0) + d(1) = 3 + 2 = 5$ et $d(3) = 0$. Sans le connaître, il fixe $d$ avant le tirage. Ce $d$ n'est pas nul, puisque $d(0) + d(1) = 5$, et il est de degré au plus 2, donc il a au plus 2 racines : le prouveur passe avec une probabilité d'au plus $2/97$.

Il a une autre chance au premier tour. Si $r_1$ est une racine de $g_1' - g_1 = X$, c'est-à-dire $r_1 = 0$, l'affirmation $C_1'$ est juste, et il peut finir honnêtement. En tout, il passe avec une probabilité d'au plus $1/97 + 2/97$. Le notebook essaie les $97^2 = 9409$ paires de défis avec un $d$ de racines 3 et 4, et il en compte 289 qui passent, soit environ $0{,}031$.
:::
:::

Le raisonnement de l'exercice vaut pour tout prouveur qui annonce une fausse somme. Le vrai $g_1$ ne passe pas le premier contrôle, donc le prouveur envoie un $g_1$ faux. À chaque tour, une affirmation fausse ne devient juste que si le défi est l'un des au plus 2 points où le polynôme envoyé coïncide avec le vrai. Sinon elle reste fausse jusqu'au contrôle final, qui la rejette. Sur deux tours, une fausse somme passe donc avec une probabilité d'au plus $2/97 + 2/97$. La page [[sumcheck]] fait ce raisonnement pour $n$ variables et un degré quelconque.

## Ce que coûte le protocole

:::exercice ★
Une somme porte sur $2^n$ produits de deux colonnes. Combien de nombres le prouveur envoie-t-il ? Combien d'opérations le vérifieur fait-il, sans compter la lecture des deux colonnes ?
:::reponse
Il y a un tour par variable, donc $n$ tours, et chaque tour envoie un polynôme de degré 2, soit 3 coefficients : $3n$ nombres. La page [[sumcheck]] montre que l'un des trois se déduit des deux autres, ce qui donne $2n$.

À chaque tour, le vérifieur calcule $g_j(0) + g_j(1)$ et $g_j(r_j)$, soit un nombre fixe d'opérations, puis une multiplication à la fin : de l'ordre de $n$ opérations en tout. Pour $n = 23$, le nombre de variables du sumcheck de FlashProve que cite la comparaison plus bas, le prouveur envoie 69 nombres au lieu de $2^{23} = 8\,388\,608$ produits.
:::
:::

:::piege
**L'ordre des bits.** On a posé $i = x_1 + 2x_2$, avec $x_1$ le bit de poids faible, et plier en $x_1$ combine deux lignes voisines. Avec l'autre convention, le même point $(5, 3)$ désigne le point $(3, 5)$ de la nôtre, où $\tilde p$ vaut 41 et non 33. Un prouveur et un vérifieur qui n'ont pas la même convention forment des affirmations différentes sur les mêmes données ([[multilineaire]]).
:::

## Notre prouveur et FlashProve

FlashProve vérifie ses sommes par des sumchecks de la même forme, sur les extensions multilinéaires de ses vecteurs, avec des défis dans le corps des défis $\E$ de Goldilocks :

| | notre reçu | FlashProve |
|---|---|---|
| variables | 2 | 23 pour le sumcheck de l'étape 11 d'un segment de feed-forward, à pleine taille (`docs/format/11-2-feed-forward-segment.md`, configuration complète) |
| degré d'un tour | 2 | 2 pour les couches denses et la tête, 3 pour les produits $W \cdot A \cdot B$ de l'attention, davantage dans le sumcheck SD de l'attention, qui multiplie des indicatrices de bits (`docs/format/11-3-attention-segment.md`, « The sumcheck SD » ; D2 §1.3) |
| coefficients envoyés par tour | 3 | autant que le degré : le coefficient que fixe l'équation du tour n'est pas envoyé (`docs/format/11-1-machinery.md`, « The forms of a round ») |
| contrôle pendant les tours | à chaque tour | aucun : chaque contrôle devient une affirmation, testée à la fin ; le format nomme deux exceptions, l'étape 9 de 11.2 et le jeton suivant de 11.4 (`docs/format/11-1-machinery.md`, « Nothing is tested during the rounds ») |

La page [[sumcheck]] explique pourquoi on peut ne pas envoyer un coefficient et ne rien contrôler pendant les tours. Les sumchecks de FlashProve sont aussi masqués, pour ne rien laisser lire des poids, ce que le chapitre [[cacher]] construit. Le chapitre suivant, [[matrices]], applique le même protocole à une couche du réseau.

:::quiz
1. Que vaut $g_1(0)$ dans le sumcheck du reçu, en mots ?
2. Pourquoi le vérifieur tire-t-il $r_1$ dans tout le corps, et pas dans $\{0, 1\}$ ?
3. Que reste-t-il à vérifier à la fin du sumcheck ?
4. Combien de tours faut-il pour une somme sur $2^{10}$ lignes ?
5. Le sumcheck peut-il détecter un prix faux dans le reçu ?
:::reponse Réponses
1. La somme des montants des lignes où $x_1 = 0$, les lignes 0 et 2 : $135 + 33 = 168 \equiv 71$.
2. Avec un défi dans $\{0, 1\}$, l'affirmation suivante ne porterait que sur la moitié des lignes, et une erreur dans l'autre moitié passerait au moins une fois sur deux. Dans le corps, un $g_1$ faux ne passe qu'avec une probabilité d'au plus $2/97$.
3. Une valeur de chaque colonne au point des défis, $\tilde p(r_1, r_2)$ et $\tilde q(r_1, r_2)$, que l'engagement doit relier à la racine.
4. 10, un par variable.
5. Non. Le sumcheck prouve la somme des données que désigne la racine. Si le prouveur s'engage sur un reçu avec un prix faux, la racine désigne ce reçu-là, et le sumcheck prouve fidèlement sa somme, qui peut d'ailleurs rester 244 : le reçu $(5, 7, 12, 10)$ avec les mêmes quantités a ce total. C'est l'engagement qui fixe les données.
:::
:::
