---
id: sumcheck
---
On veut vérifier une affirmation de la forme

$$C = \sum_{x \in \{0,1\}^n} F(x)$$

où $F$ est un polynôme en $n$ variables de petit degré en chaque variable, par exemple le produit de deux [[multilineaire|extensions multilinéaires]]. La somme a $2^n$ termes, et on veut que le vérifieur n'évalue $F$ qu'une seule fois, en un point tiré au hasard. Cette page construit le protocole tour par tour, puis montre pourquoi une fausse somme est rejetée. Elle donne ensuite trois variantes qui servent dans la suite du cours : le coefficient qu'on n'envoie pas, le tour d'égalité et le zéro-test.

## Un tour

Le cube $\{0, 1\}^n$ se coupe en deux moitiés selon la valeur de $x_1$. On laisse $x_1$ libre et on somme sur les autres variables, ce qui définit le **polynôme du tour** 1 :

$$g_1(X) = \sum_{x_2, \dots, x_n \in \{0,1\}} F(X, x_2, \dots, x_n)$$

$g_1(0)$ est la somme sur la moitié où $x_1 = 0$, et $g_1(1)$ la somme sur la moitié où $x_1 = 1$. On en déduit l'équation du tour :

$$g_1(0) + g_1(1) = C$$

Le degré de $g_1$ est au plus le degré de $F$ en $x_1$. On note $d$ le plus grand degré de $F$ en une variable : 1 si $F$ est multilinéaire, 2 si $F$ est le produit de deux extensions multilinéaires. Le prouveur envoie les $d + 1$ coefficients de $g_1$, et le vérifieur contrôle l'équation. Comme le vérifieur attend exactement $d + 1$ coefficients, le prouveur ne peut pas envoyer un polynôme de degré plus grand.

## Réduire à $n - 1$ variables

Le vérifieur ne sait pas si $g_1$ est le vrai polynôme du tour. Il tire un **défi** $r_1$ dans un ensemble $S$, après avoir reçu $g_1$, et il garde l'affirmation

$$C_1 = g_1(r_1) = \sum_{x_2, \dots, x_n} F(r_1, x_2, \dots, x_n)$$

C'est le problème de départ, avec $n - 1$ variables et la fonction $F(r_1, \cdot)$. Le tour 2 laisse $x_2$ libre, contrôle $g_2(0) + g_2(1) = C_1$ et tire $r_2$, et chaque tour suivant fait de même avec la variable suivante.

## La fin

Après $n$ tours, il ne reste aucune variable sur laquelle sommer, et la dernière affirmation est

$$C_n = g_n(r_n) = F(r_1, \dots, r_n)$$

Le vérifieur a besoin de cette seule valeur de $F$. Il la calcule lui-même si $F$ est publique. Sinon il la reçoit comme une nouvelle affirmation, par exemple sur des colonnes engagées, que la suite du protocole doit vérifier. Le sumcheck s'arrête donc sur une affirmation qu'il reste à vérifier.

:::exercice ★
La colonne $f = (3, 1, 4, 1)$ a pour extension multilinéaire $\tilde f = 3 - 2x_1 + x_2 - x_1 x_2$, avec $x_1$ le bit de poids faible, et sa somme vaut $C = 9$. Déroulez le sumcheck de $F = \tilde f$ dans $\F_{97}$ avec $r_1 = 5$ et $r_2 = 11$.
:::reponse
Tour 1 : $g_1(X) = \tilde f(X, 0) + \tilde f(X, 1) = (3 - 2X) + (4 - 3X) = 7 - 5X$, et $g_1(0) + g_1(1) = 7 + 2 = 9$. L'affirmation suivante est $C_1 = g_1(5) = -18 \equiv 79$.

Tour 2 : $g_2(X) = \tilde f(5, X) = 3 - 10 + X - 5X = -7 - 4X$, et $g_2(0) + g_2(1) = -7 - 11 = -18 = C_1$. La dernière affirmation est $C_2 = g_2(11) = -7 - 44 = -51 \equiv 46$.

Contrôle final : $\tilde f(5, 11) = 3 - 10 + 11 - 55 = -51 \equiv 46$.
:::
:::

## Pourquoi une fausse somme est rejetée

:::exercice ★★
Le prouveur annonce $C = 10$ pour la même colonne. Écrivez un $g_1'$ de degré 1 qui passe le premier contrôle, suivez la triche avec $r_1 = 5$, et dites à quelle condition sur les défis elle réussit.
:::reponse
Par exemple $g_1' = 8 - 6X$, puisque $8 + 2 = 10$. L'affirmation suivante est $g_1'(5) = -22$, alors que la vraie vaut $-18$.

Au tour 2, il faut un $g_2'$ avec $g_2'(0) + g_2'(1) = -22$, par exemple $g_2' = g_2 - 2$. Le contrôle final compare $g_2'(11) = -53$ à $\tilde f(5, 11) = -51$, et la triche est rejetée.

Pour réussir, $d = g_2' - g_2$ doit vérifier $d(0) + d(1) = -4$ et $d(r_2) = 0$. Le prouveur fixe $d$ avant de connaître $r_2$, et un $d$ non nul de degré au plus 1 a au plus une racine : il réussit avec une probabilité d'au plus $1/97$. Il a une autre chance au premier tour. Si $r_1$ est la racine de $g_1' - g_1 = 1 - X$, soit $r_1 = 1$, l'affirmation $g_1'(1) = g_1(1)$ est juste et il finit honnêtement. En tout, il passe avec une probabilité d'au plus $2/97$.
:::
:::

L'exercice suit un tricheur particulier. Pour le cas général, on suppose $C$ fausse, et on note $s_j$ le vrai polynôme du tour $j$, celui qu'un prouveur honnête enverrait avec les défis déjà tirés :

$$s_j(X) = \sum_{x_{j+1}, \dots, x_n} F(r_1, \dots, r_{j-1}, X, x_{j+1}, \dots, x_n)$$

Par construction, $s_j(0) + s_j(1)$ vaut la vraie valeur de la somme du tour $j$, et $s_j(r_j)$ celle de la somme du tour suivant.

Au tour 1, $s_1(0) + s_1(1)$ vaut la vraie somme, différente de $C$. Donc $s_1$ ne passe pas le contrôle, et le prouveur envoie un $g_1 \neq s_1$. Les deux sont de degré au plus $d$, donc ils coïncident en au plus $d$ points ([[schwartz-zippel]]). Comme $r_1$ est tiré après l'envoi de $g_1$, la probabilité que $g_1(r_1) = s_1(r_1)$ est d'au plus $d/|S|$. En dehors de ce cas, $C_1 = g_1(r_1)$ diffère de la vraie valeur $s_1(r_1)$, et l'affirmation du tour 2 est fausse à son tour.

Le même argument s'applique à chaque tour. Si aucune des $n$ coïncidences ne se produit, la dernière affirmation $C_n$ est fausse, et le contrôle final $C_n = F(r_1, \dots, r_n)$ la rejette. En additionnant les probabilités des $n$ tours, on obtient :

$$\Pr[\text{une fausse somme passe}] \le \frac{n d}{|S|}$$

L'ordre des messages compte : si le prouveur connaissait $r_j$ avant d'envoyer $g_j$, il choisirait un $g_j$ faux qui coïncide avec $s_j$ en $r_j$.

:::exercice ★
FlashProve tire ses défis dans $\E$, le [[extension|corps des défis]] de Goldilocks, qui a $p^3 \approx 2^{192}$ éléments. Bornez la probabilité qu'une fausse somme passe un sumcheck à $n$ tours de degré $d$, puis appliquez la borne à $n = 23$ et $d = 2$.
:::reponse
La borne est $nd/|\E|$. Avec $n = 23$ et $d = 2$, elle vaut $46/2^{192}$, et comme $\log_2 46 \approx 5{,}5$, environ $2^{-186{,}5}$.
:::
:::

## Un produit de deux colonnes

Quand $F = \tilde p\, \tilde q$ est le produit de deux extensions multilinéaires, chaque facteur est de degré 1 en $x_j$, donc $g_j$ est de degré 2, et le prouveur envoie 3 coefficients par tour. Pour préparer le tour suivant, il plie chaque colonne en $r_j$ ([[multilineaire]]). La dernière affirmation est $\tilde p(r)\, \tilde q(r) = C_n$, au point $r = (r_1, \dots, r_n)$ : il faut une valeur de chaque colonne, au même point. Le chapitre [[sommes]] déroule ce cas sur le reçu.

## Le coefficient qu'on n'envoie pas

:::exercice ★★
On écrit $g = a_0 + a_1 X + a_2 X^2$ un polynôme de tour de degré 2, et $C$ l'affirmation qu'il doit respecter. Écrivez l'équation $g(0) + g(1) = C$ avec les coefficients. Au premier tour du sumcheck du reçu, $C = 50$, et le prouveur n'envoie que $a_0 = 71$ et $a_2 = 57$ : retrouvez $a_1$.
:::reponse
$g(0) = a_0$ et $g(1) = a_0 + a_1 + a_2$, donc l'équation s'écrit $2a_0 + a_1 + a_2 = C$, et elle donne $a_1 = C - 2a_0 - a_2$. Sur le reçu, $a_1 = 50 - 142 - 57 = -149 \equiv 45$, le coefficient de $X$ dans $g_1 = 71 + 45X + 57X^2$.
:::
:::

L'équation du tour fixe donc un coefficient en fonction des autres, et le prouveur peut ne pas l'envoyer : le vérifieur le calcule. Le polynôme qu'il reconstruit vérifie l'équation du tour par construction, donc le contrôle du tour ne peut plus échouer, et il n'y a plus rien à contrôler pendant les tours.

La borne $nd/|S|$ reste la même. Le polynôme reconstruit est un polynôme de degré au plus $d$ qui vérifie l'équation, exactement comme un polynôme envoyé qui aurait passé le contrôle. Un mensonge se reporte d'un tour au suivant jusqu'au contrôle final, qui reste le seul. Un tour de degré $d$ envoie ainsi $d$ nombres au lieu de $d + 1$, et envoyer aussi le coefficient fixé pour le contrôler n'ajouterait rien.

## Le tour d'égalité

On rencontre souvent une somme pondérée par $\eq$, pour un point $z$ fixé :

$$C = \sum_{x \in \{0,1\}^n} \eq(z, x)\, F(x)$$

Avec $F = \tilde f$, cette somme vaut $\tilde f(z)$ ([[multilineaire]]) : un sumcheck de cette forme prouve donc la valeur d'une colonne en un point. Le produit $\eq(z, x)\, F(x)$ a un degré de plus que $F$ en chaque variable, puisque $\eq(z, x)$ est de degré 1 en chacune. Le traiter comme un seul polynôme ajouterait donc un coefficient à chaque tour.

On garde $\eq$ hors du polynôme du tour. Le facteur de $\eq(z, x)$ qui porte sur $x_1$ vaut $1 - z_1$ en $x_1 = 0$ et $z_1$ en $x_1 = 1$, et le reste du produit est $\eq\big((z_2, \dots, z_n), (x_2, \dots, x_n)\big)$, qu'on note $\eq(z', x')$. On pose

$$g_1(X) = \sum_{x_2, \dots, x_n} \eq(z', x')\, F(X, x_2, \dots, x_n)$$

On sépare la somme de départ selon la valeur de $x_1$, et chaque moitié fait apparaître $g_1$ :

$$
\begin{aligned}
C &= (1 - z_1) \sum_{x'} \eq(z', x')\, F(0, x') + z_1 \sum_{x'} \eq(z', x')\, F(1, x') \\
&= (1 - z_1)\, g_1(0) + z_1\, g_1(1)
\end{aligned}
$$

C'est l'équation d'un **tour d'égalité**. Après le défi $r_1$, l'affirmation $g_1(r_1)$ porte sur une somme de la même forme, avec $n - 1$ variables et le point $(z_2, \dots, z_n)$, et le degré de $g_1$ reste celui de $F$ en $x_1$. La page [[gkr]] s'en sert pour chaque couche d'un arbre de produits.

:::exercice ★★
Avec $f = (3, 1, 4, 1)$ et $z = (2, 5)$, calculez $C = \sum_x \eq(z, x)\, f_x$. Écrivez $g_1$ pour $F = \tilde f$ et contrôlez l'équation du tour d'égalité. Quel degré aurait $g_1$ si on gardait $\eq$ dans le polynôme du tour ?
:::reponse
$C = \tilde f(2, 5) = 3 - 4 + 5 - 10 = -6 \equiv 91$.

Le facteur de $x_2$ vaut $1 - 5 = -4$ en $x_2 = 0$ et $5$ en $x_2 = 1$, donc :

$$g_1(X) = -4\, \tilde f(X, 0) + 5\, \tilde f(X, 1) = -4(3 - 2X) + 5(4 - 3X) = 8 - 7X$$

L'équation du tour donne $(1 - 2)\, g_1(0) + 2\, g_1(1) = -8 + 2 = -6 = C$.

En gardant $\eq$, le polynôme du tour serait $(2X + (1 - 2)(1 - X))\, g_1(X) = (3X - 1)(8 - 7X)$, de degré 2 au lieu de 1.
:::
:::

## Le zéro-test

On veut montrer qu'un polynôme $P$ s'annule en chaque coin du cube : $P(x) = 0$ pour tout $x \in \{0, 1\}^n$. Le sumcheck prouve une somme, et une somme nulle ne suffit pas.

:::exercice ★
Donnez quatre valeurs, non toutes nulles, dont la somme vaut 0.
:::reponse
Par exemple $(1, -1, 0, 0)$ : la somme est nulle, et deux des valeurs ne le sont pas.
:::
:::

On pondère donc les valeurs par des poids que le prouveur ne connaît pas à l'avance. Une fois les valeurs de $P$ fixées, par exemple par un engagement, le vérifieur tire un point $\zeta$, et le prouveur montre, par un sumcheck à tours d'égalité,

$$\sum_{x \in \{0,1\}^n} \eq(\zeta, x)\, P(x) = 0$$

Le membre de gauche est l'extension multilinéaire du vecteur $v = (P(x))_x$, évaluée en $\zeta$ ([[multilineaire]]). Si une valeur $v_x$ n'est pas nulle, $\tilde v$ n'est pas le polynôme nul, puisqu'il vaut $v_x$ au coin $x$. Chaque monôme de $\tilde v$ a au plus $n$ variables, donc $\tilde v$ est de degré total au plus $n$, et il s'annule en $\zeta$ avec une probabilité d'au plus $n/|S|$ ([[schwartz-zippel]]). C'est le **zéro-test**.

:::exercice ★★
Le vecteur $b = (0, 1, 1, 2)$ devrait ne contenir que des bits. Calculez $\sum_x \eq(\zeta, x)\,(b_x^2 - b_x)$ en fonction de $\zeta = (\zeta_1, \zeta_2)$. Pour quels $\zeta$ le zéro-test passe-t-il à tort ? Comparez leur proportion à la borne.
:::reponse
$b_x^2 - b_x$ vaut $(0, 0, 0, 2)$ : seul le coin 3 n'est pas nul. La somme vaut donc $2\, \eq(\zeta, 3) = 2\zeta_1\zeta_2$. Elle s'annule si $\zeta_1 = 0$ ou $\zeta_2 = 0$, soit en $97 + 97 - 1 = 193$ points de $\F_{97}^2$ sur $9409$. La proportion vaut $193/9409 \approx 0{,}0205$, juste sous la borne $2/97 \approx 0{,}0206$.
:::
:::

## Dans FlashProve

Tous les sumchecks de FlashProve portent sur des extensions multilinéaires, avec des tours simples et des tours d'égalité, et aucun n'envoie le coefficient que fixe l'équation du tour. Pour un polynôme de tour $a_0 + a_1 X + \dots + a_k X^k$ et un tour d'égalité au point $z$, c'est la constante, $a_0 = C - z(a_1 + \dots + a_k)$. Pour un tour simple, c'est le coefficient de $X$, $a_1 = C - 2a_0 - (a_2 + \dots + a_k)$. Le format en conclut qu'aucun tour ne peut échouer (`docs/format/11-1-machinery.md`, « The forms of a round »). `PUBLISHED-WORKS.md` (« Sum-checks and their masks ») rattache ce choix, et le tour d'égalité, à Gruen (ePrint 2024/108, sections 3.1 à 3.3).

FlashProve montre par un zéro-test que les bits de ses multiplicités sont des bits, avec $P = b^2 - b$, par un sumcheck à tours d'égalité de degré 2 (`docs/format/11-1-machinery.md`, étape 9 du lookup, « the bits are bits »). `PUBLISHED-WORKS.md` (« The look-up argument ») donne pour source de ce zéro-test HyperPlonk (ePrint 2022/1355, section 3.2).

Ses sumchecks sont aussi masqués : un polynôme masquant et une variable de plus, qui ne servent qu'au zero-knowledge (`blocks/iop/psc.h`, lignes 6 à 28 ; D2 §1.2). La page [[sumcheck-masque]] les construit.

:::piege
- Le degré de $g_j$ est celui de $F$ en $x_j$, pas 1 : 2 pour un produit de deux colonnes, 3 pour un produit de trois.
- La fin du sumcheck est une affirmation qu'il reste à vérifier, pas un verdict.
- Le défi $r_j$ se tire après l'envoi de $g_j$, jamais avant.
:::
