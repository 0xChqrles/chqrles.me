---
id: schwartz-zippel
---
Deux calculs différents s'écrivent comme deux polynômes différents. On veut la probabilité qu'ils donnent la même valeur en un point tiré au hasard.

La page traite d'abord une variable, où le compte des racines de [[polynomes]] donne la réponse, et l'applique à deux reçus qui ont le même total. Elle passe ensuite à plusieurs variables, dont le cours a besoin à partir du sumcheck, et elle démontre la borne par récurrence sur le nombre de variables. Elle finit par la règle que tout le cours utilise. Les exemples sont dans $\F_{97}$.

## Une variable

Soit $P$ et $Q$ deux polynômes différents de degré au plus $d$, et $S$ un ensemble fini d'éléments du corps. On tire $r$ uniformément dans $S$, après que $P$ et $Q$ sont fixés. $P(r) = Q(r)$ si et seulement si $r$ est une racine de $P - Q$. Ce polynôme est non nul et de degré au plus $d$, donc il a au plus $d$ racines, et au plus $d$ éléments de $S$ sont des racines :

$$\Pr_{r \in S}\big[P(r) = Q(r)\big] \le \frac{d}{|S|}$$

L'ensemble $S$ peut être tout le corps ou une partie du corps : seul son nombre d'éléments compte.

:::exercice ★
Un prouveur triche sur un polynôme de degré 2, et le vérifieur tire le point dans $\{0, 1, \dots, 9\}$ au lieu de tout $\F_{97}$. Quelle borne d'erreur obtient-on ?
:::reponse
$|S| = 10$ et $d = 2$, donc la borne vaut $2/10$. Elle dépend de l'ensemble où l'on tire le point, pas de la taille du corps : tirer dans tout $\F_{97}$ donnerait $2/97$.
:::
:::

## Deux reçus de même total

Le reçu du chapitre [[prouver-sans-refaire]] a quatre lignes, de prix $5, 7, 11, 13$ et de quantités $27, 9, 3, 1$. Les quantités sont les puissances de 3, $3^3, 3^2, 3, 1$, donc le total est la valeur en $t = 3$ du polynôme dont les prix sont les coefficients :

$$P(t) = 5t^3 + 7t^2 + 11t + 13, \qquad P(3) = 135 + 63 + 33 + 13 = 244$$

Un autre reçu, de prix $5, 7, 12, 10$, donne de la même façon le polynôme $P'(t) = 5t^3 + 7t^2 + 12t + 10$.

:::exercice ★
Calculez le total du reçu $(5, 7, 12, 10)$ avec les quantités $27, 9, 3, 1$. Écrivez $P(t) - P'(t)$ et trouvez ses racines.
:::reponse
Le total vaut $135 + 63 + 36 + 10 = 244$, comme celui du premier reçu.

$P(t) - P'(t) = (11 - 12)t + (13 - 10) = -t + 3$, dont la seule racine est $t = 3$.
:::
:::

Comparer les deux totaux revient donc à comparer $P$ et $P'$ en $t = 3$, justement le seul point où ils coïncident. En un $t$ tiré au hasard dans $\F_{97}$, ils coïncident avec probabilité $1/97$ : la borne se calcule avec le degré de $P - P'$, ici 1, et le degré 3 de $P$ et $P'$ ne donnerait que la borne plus large $3/97$.

## Plusieurs variables

Le sumcheck ([[sumcheck]]) compare des polynômes en plusieurs variables, comme $X_1 X_2 + 3 X_1$. Un **monôme** $X_1^{a_1} \cdots X_n^{a_n}$ a pour degré $a_1 + \dots + a_n$, et le **degré total** d'un polynôme est le plus grand degré de ses monômes. On tire chaque variable indépendamment et uniformément dans $S$, ce qui donne un point $r = (r_1, \dots, r_n)$ uniforme dans $S^n$. Pour comparer $P$ et $Q$, on étudie leur différence, et on cherche une borne sur la probabilité qu'un polynôme non nul s'annule en $r$.

:::exercice ★★
Comptez les zéros de $XY - 1$ dans $\F_{97}^2$. Quelle part des $97^2$ points est-ce ?
:::reponse
Pour $X = 0$, $XY - 1 = -1$ ne s'annule jamais. Pour chacun des 96 autres $X$, un seul $Y$ annule le polynôme, $Y = 1/X$. Il y a donc 96 zéros, soit $96/9409 \approx 0{,}0102$ des points, à peu près $1/97$.
:::
:::

Ce polynôme est de degré total 2, et il s'annule sur moins de $2/97 \approx 0{,}0206$ des points. On montre que la borne d'une variable reste vraie avec le degré total : si $P$ est non nul de degré total $d$ et si $r$ est tiré uniformément dans $S^n$, alors

$$\Pr\big[P(r) = 0\big] \le \frac{d}{|S|}$$

C'est le **lemme de Schwartz-Zippel**. On le démontre par récurrence sur le nombre $n$ de variables. Pour $n = 1$, c'est la section « Une variable ». On suppose la borne vraie pour $n - 1$ variables, et on prend $P$ non nul en $n$ variables.

On regroupe les monômes de $P$ selon la puissance de $X_1$ :

$$P = \sum_{i=0}^{k} X_1^i\, P_i(X_2, \dots, X_n)$$

où $k$ est la plus grande puissance de $X_1$ qui apparaît, de sorte que $P_k \neq 0$. Les monômes de $X_1^k P_k$ sont de degré au plus $d$, donc $P_k$ est de degré total au plus $d - k$.

On tire d'abord $r_2, \dots, r_n$, et on distingue deux cas.

1. $P_k(r_2, \dots, r_n) = 0$. $P_k$ est un polynôme non nul en $n - 1$ variables, de degré total au plus $d - k$, donc, par l'hypothèse de récurrence, ce cas arrive avec probabilité au plus $(d - k)/|S|$.
2. $P_k(r_2, \dots, r_n) \neq 0$. Alors $P(X_1, r_2, \dots, r_n)$ est un polynôme en la seule variable $X_1$, dont le coefficient de $X_1^k$ n'est pas nul : il est non nul et de degré $k$. Il a au plus $k$ racines, donc le $r_1$ tiré ensuite l'annule avec probabilité au plus $k/|S|$.

$P(r) = 0$ demande d'être dans le cas 1, ou dans le cas 2 avec un $r_1$ qui est une racine. On additionne les deux probabilités :

$$\Pr\big[P(r) = 0\big] \le \frac{d - k}{|S|} + \frac{k}{|S|} = \frac{d}{|S|}$$

:::exercice ★★★
Donnez un polynôme non nul de degré total 2 à deux variables sur $\F_{97}$ qui s'annule sur exactement $2 \times 97 - 1$ points. Quelle part des points est-ce ?
:::reponse
$XY$ s'annule quand $X = 0$ (97 points) ou quand $Y = 0$ (97 points), et le point $(0, 0)$ est compté deux fois : il y a $97 + 97 - 1 = 193$ zéros. La part vaut $193/9409 \approx 0{,}0205$, presque la borne $2/97 \approx 0{,}0206$.
:::
:::

:::piege
Utiliser le degré en une variable au lieu du degré total. $XY$ est de degré 1 en $X$ et de degré 1 en $Y$, et une borne en $1/97$ serait fausse : l'exercice 4 trouve presque $2/97$.
:::

## La règle

Le lemme donne la règle que tout le cours utilise : **un test en un point tiré au hasard se trompe avec probabilité au plus (degré)/(taille de l'ensemble où l'on tire le point).** Le degré est le degré total de la différence des deux côtés, et le point est tiré après que les polynômes sont fixés.

:::piege
Tirer le point avant que les polynômes soient fixés. La borne compte les racines d'un polynôme donné. Un prouveur qui connaît $r$ à l'avance choisit un $P$ faux qui coïncide avec $Q$ en $r$, par exemple $P = Q + (X - r)$.
:::
