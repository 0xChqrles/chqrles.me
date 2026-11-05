---
id: polynomes
---
On veut un objet qui contient une liste de valeurs et qu'on peut interroger en des points qui ne sont pas dans la liste. On veut aussi savoir combien de fois deux tels objets différents peuvent donner la même réponse.

La page définit les polynômes sur un corps $\F_p$ ([[modulo]]) et montre comment on les évalue. Elle construit ensuite le polynôme qui passe par des points donnés, d'abord par deux points, puis par $d + 1$ points. Elle compte enfin les racines d'un polynôme, ce qui répond à la seconde question : deux polynômes différents de degré au plus $d$ coïncident en au plus $d$ points. Les exemples sont dans $\F_{97}$.

## Un polynôme et ses valeurs

Un **polynôme** à coefficients dans $\F_p$ s'écrit

$$P(X) = c_0 + c_1 X + c_2 X^2 + \dots + c_d X^d$$

avec $c_0, \dots, c_d \in \F_p$. Son **degré** est le plus grand $i$ tel que $c_i \neq 0$. Pour **évaluer** $P$ en un point $a \in \F_p$, on remplace $X$ par $a$ et on calcule dans $\F_p$, ce qui donne un élément $P(a)$ de $\F_p$.

Pour qu'un polynôme contienne une liste $(y_0, \dots, y_d)$, on lui demande de valoir $y_i$ en $i$. On peut ensuite l'évaluer en n'importe quel autre point du corps. Les deux sections suivantes montrent qu'un tel polynôme existe.

On peut évaluer $P$ en ne gardant qu'une valeur : on part de $c_d$, et à chaque coefficient suivant on multiplie ce qu'on a par $a$ et on ajoute ce coefficient. C'est la méthode de Horner ([[horner]]), qui coûte $d$ multiplications :

$$P(a) = (\dots((c_d\, a + c_{d-1})\, a + c_{d-2})\, a + \dots)\, a + c_0$$

:::exercice ★
Évaluez $P(X) = X^3 + 2X + 1$ en 3, puis en 10, dans $\F_{97}$, par la méthode de Horner. Notez les valeurs gardées.
:::reponse
Les coefficients, du plus haut degré au terme constant, sont $1, 0, 2, 1$.

En 3, on garde $1$, puis $1 \times 3 + 0 = 3$, puis $3 \times 3 + 2 = 11$, puis $11 \times 3 + 1 = 34$. Donc $P(3) = 34$.

En 10, on garde $1$, puis $10$, puis $10 \times 10 + 2 = 102 \equiv 5$, puis $5 \times 10 + 1 = 51$. Donc $P(10) = 51$.
:::
:::

## La droite par deux points

On cherche le polynôme de degré au plus 1 qui vaut $f_0$ en 0 et $f_1$ en 1. On l'écrit $P(X) = c_0 + c_1 X$. La première condition donne $P(0) = c_0 = f_0$, et la seconde $P(1) = c_0 + c_1 = f_1$, donc $c_1 = f_1 - f_0$ :

$$P(X) = f_0 + (f_1 - f_0) X = (1 - X) f_0 + X f_1$$

La dernière forme multiplie chaque valeur par un facteur qui vaut 1 en son point et 0 en l'autre : $1 - X$ vaut 1 en 0 et 0 en 1, et $X$ vaut 0 en 0 et 1 en 1. La page [[multilineaire]] et les suivantes écrivent toujours la droite sous cette forme.

:::exercice ★
Écrivez la droite qui vaut 5 en 0 et 7 en 1. Que vaut-elle en 2, en 10 et en $-1$ ?
:::reponse
$P(X) = 5(1 - X) + 7X = 5 + 2X$. Donc $P(2) = 9$, $P(10) = 25$ et $P(-1) = 3$.
:::
:::

## Le polynôme qui passe par $d + 1$ points

On a maintenant $d + 1$ points $(x_0, y_0), \dots, (x_d, y_d)$ dont les abscisses $x_i$ sont distinctes, et on cherche un polynôme de degré au plus $d$ qui vaut $y_i$ en $x_i$ pour chaque $i$.

On procède point par point. On part d'un polynôme qui passe par le premier point. Pour ajouter le point suivant, on ajoute un terme qui s'annule aux points déjà traités, donc qui ne change pas leurs valeurs, et on choisit son coefficient pour obtenir la nouvelle valeur.

:::exercice ★
Trouvez le polynôme de degré au plus 2 qui passe par $(0, 5)$, $(1, 7)$ et $(2, 11)$. Écrivez-le $P(X) = 5 + bX + cX(X - 1)$ : le terme $bX$ s'annule en 0, et le terme $cX(X - 1)$ s'annule en 0 et en 1.
:::reponse
$P(0) = 5$ quels que soient $b$ et $c$. Ensuite $P(1) = 5 + b = 7$, donc $b = 2$. Enfin $P(2) = 5 + 2 \times 2 + 2c = 9 + 2c = 11$, donc $c = 1$. Ainsi :

$$P(X) = 5 + 2X + X(X - 1) = X^2 + X + 5$$
:::
:::

La même idée donne une formule qui traite tous les points d'un coup, la **formule de Lagrange**. Pour chaque $i$, on construit un polynôme $L_i$ qui vaut 1 en $x_i$ et 0 en chaque autre $x_j$. Le produit $\prod_{j \neq i} (X - x_j)$ s'annule en chaque $x_j$ pour $j \neq i$. En $x_i$, il vaut $\prod_{j \neq i}(x_i - x_j)$, qui n'est pas nul puisque les abscisses sont distinctes, et on divise par cette valeur :

$$L_i(X) = \prod_{j \neq i} \frac{X - x_j}{x_i - x_j}$$

Chaque $L_i$ est de degré $d$. Dans la somme $\sum_i y_i L_i$, seul le terme $i$ n'est pas nul en $x_i$, et il y vaut $y_i$. Le polynôme cherché est donc :

$$P(X) = \sum_{i=0}^{d} y_i L_i(X)$$

La division demande que chaque $x_i - x_j$ ait un inverse, ce que garantit un corps. Avec $d = 1$ et les points 0 et 1, on retrouve $L_0 = (X - 1)/(0 - 1) = 1 - X$ et $L_1 = X$, la droite de la section précédente.

:::piege
Interpoler avec deux abscisses égales. Le dénominateur $x_i - x_j$ s'annule, et deux valeurs différentes en un même point ne peuvent pas venir d'un même polynôme.
:::

## Les racines

Une **racine** de $P$ est un $a$ tel que $P(a) = 0$. On montre d'abord que chaque racine donne un facteur de $P$.

Pour tout $k \ge 1$, $X^k - a^k$ est un multiple de $X - a$. En développant le produit suivant, les termes s'annulent deux à deux sauf le premier et le dernier :

$$X^k - a^k = (X - a)(X^{k-1} + a X^{k-2} + \dots + a^{k-2} X + a^{k-1})$$

Comme $P(X) - P(a) = \sum_k c_k (X^k - a^k)$, c'est aussi un multiple de $X - a$. Il existe donc un polynôme $Q$, de degré $\deg P - 1$, tel que :

$$P(X) = (X - a)\, Q(X) + P(a)$$

Si $a$ est une racine, $P(X) = (X - a)\, Q(X)$ : $X - a$ divise $P$.

:::exercice ★
Quelles sont les racines de $X^2 - 1$ dans $\F_{97}$ ?
:::reponse
$X^2 - 1 = (X - 1)(X + 1)$. Dans un corps, $(a - 1)(a + 1) = 0$ impose $a - 1 = 0$ ou $a + 1 = 0$, donc les racines sont 1 et $-1 = 96$, et il n'y en a pas d'autre.
:::
:::

:::exercice ★★
Divisez $P(X) = X^3 + 2X + 1$ par $X - 3$ dans $\F_{97}$ : cherchez $Q(X) = X^2 + q_1 X + q_0$ et un nombre $R$ tels que $P = (X - 3)\, Q + R$, en comparant les coefficients. Vérifiez que $R = P(3)$, et comparez $Q$ aux valeurs gardées de l'exercice 1.
:::reponse
On développe :

$$(X - 3)(X^2 + q_1 X + q_0) + R = X^3 + (q_1 - 3) X^2 + (q_0 - 3q_1) X + (R - 3q_0)$$

Les coefficients de $P$ sont $1, 0, 2, 1$, donc $q_1 - 3 = 0$, puis $q_0 - 9 = 2$, puis $R - 33 = 1$, ce qui donne $q_1 = 3$, $q_0 = 11$ et $R = 34$. Le quotient est $X^2 + 3X + 11$, et le reste vaut $34 = 27 + 6 + 1 = P(3)$.

Les valeurs gardées par Horner en 3 étaient $1, 3, 11, 34$. Les trois premières sont les coefficients du quotient, et la dernière est le reste : Horner divise par $X - a$ en même temps qu'il évalue.
:::
:::

On peut maintenant compter les racines. Soit $P \neq 0$ de degré $d$, et $a_1, \dots, a_k$ des racines distinctes de $P$. La première donne $P = (X - a_1)\, Q_1$. En $a_2$ :

$$0 = P(a_2) = (a_2 - a_1)\, Q_1(a_2)$$

Le facteur $a_2 - a_1$ n'est pas nul. Dans un corps, un produit n'est nul que si l'un des facteurs l'est ([[modulo]]), donc $Q_1(a_2) = 0$ et $Q_1 = (X - a_2)\, Q_2$. On continue avec $a_3, \dots, a_k$, et on obtient :

$$P = (X - a_1)(X - a_2) \cdots (X - a_k)\, Q_k$$

avec $Q_k \neq 0$ puisque $P \neq 0$. Le degré du côté droit vaut au moins $k$ et celui du côté gauche vaut $d$, donc $k \le d$ : **un polynôme non nul de degré $d$ a au plus $d$ racines.**

:::exercice ★★
On calcule modulo 8, qui n'est pas premier. Trouvez les racines de $X^2 - 1$ parmi $0, \dots, 7$. Où le raisonnement précédent échoue-t-il ?
:::reponse
$1^2 = 1$, $3^2 = 9 \equiv 1$, $5^2 = 25 \equiv 1$ et $7^2 = 49 \equiv 1$ : il y a quatre racines, 1, 3, 5 et 7, pour un polynôme de degré 2.

Le raisonnement écrit $X^2 - 1 = (X - 1)(X + 1)$, puis évalue en $a_2 = 3$ : $(3 - 1)(3 + 1) = 2 \times 4 = 8 \equiv 0$. Les deux facteurs sont non nuls et leur produit est nul, donc on ne peut pas conclure que le second facteur s'annule en 3. C'est cette étape qui demande un corps.
:::
:::

## Deux polynômes qui coïncident

On revient à la seconde question. Deux polynômes $P$ et $Q$ de degré au plus $d$ coïncident en $a$ si et seulement si $a$ est une racine de $P - Q$, qui est de degré au plus $d$. Si $P \neq Q$, $P - Q$ est non nul et a au plus $d$ racines, donc :

**Deux polynômes différents de degré au plus $d$ coïncident en au plus $d$ points.**

Si deux polynômes de degré au plus $d$ coïncident en $d + 1$ points, ils sont donc égaux. Le polynôme de Lagrange est ainsi le seul polynôme de degré au plus $d$ qui passe par $d + 1$ points donnés.

Si l'on compare $P$ et $Q$ en un point tiré au hasard parmi les $p$ éléments du corps, ils coïncident avec probabilité au plus $d/p$. La page [[schwartz-zippel]] fait ce calcul et l'étend à plusieurs variables.

:::piege
Oublier que les coefficients sont dans $\F_p$. Le polynôme $P - Q$ est nul quand chacun de ses coefficients vaut 0 modulo $p$, et son degré se lit après réduction : dans $\F_{97}$, $97X^2 + X + 1$ est de degré 1. La borne utilise ce vrai degré.
:::

## La borne est atteinte

Un polynôme de degré $d$ peut avoir exactement $d$ racines.

:::exercice ★★
Vérifiez que $47^2 = 75$, $47^4 = 96$ et $47^8 = 1$ dans $\F_{97}$. Déduisez-en huit racines de $X^8 - 1$.
:::reponse
Avec $100 \equiv 3$ :

$$
\begin{aligned}
47^2 &= 2209 = 22 \times 100 + 9 \equiv 22 \times 3 + 9 = 75 \\
47^4 &= 75^2 = 5625 = 56 \times 100 + 25 \equiv 56 \times 3 + 25 = 193 \equiv 96 \\
47^8 &= 96^2 \equiv (-1)^2 = 1
\end{aligned}
$$

Pour tout $k$, $z = 47^k$ vérifie $z^8 = (47^8)^k = 1$. Les puissances $47^0, \dots, 47^7$ valent :

$$1,\ 47,\ 75,\ 33,\ 96,\ 50,\ 22,\ 64$$

($47^3 = 75 \times 47 \equiv 33$, puis $47^{4+k} = -47^k$.) Ce sont huit valeurs distinctes, donc huit racines de $X^8 - 1$. Ce polynôme de degré 8 n'en a pas d'autre.
:::
:::

Un polynôme peut aussi n'avoir aucune racine : $X^3 - 2$ n'en a pas dans $\F_{97}$, parce que 2 n'y est le cube d'aucun nombre. La page [[extension]] le montre, et elle s'en sert pour construire un corps plus grand.
