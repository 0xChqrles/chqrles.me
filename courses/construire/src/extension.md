---
id: extension
---
Un test au hasard se trompe avec probabilité au plus (degré)/(taille de l'ensemble où l'on tire le défi), d'après [[schwartz-zippel]]. Dans $\F_{97}$, un test de degré 2 se trompe donc avec probabilité $2/97$, et dans Goldilocks avec probabilité $2/p \approx 2^{-63}$, alors que FlashProve vise $2^{-128}$ par tour (`docs/protocol.md` §6.4). On veut un ensemble plus grand où tirer les défis, sans agrandir les données.

La page fixe d'abord ce qu'on demande à cet ensemble. Elle le construit avec des polynômes de degré au plus 2, multipliés en remplaçant $X^3$ par 2, et elle montre pourquoi le polynôme $X^3 - 2$ convient : 2 n'est pas un cube. Elle construit ensuite l'inverse d'un élément, puis elle dit ce qui va dans ce grand ensemble et ce qui reste dans $\F_p$. Les exemples sont dans $\F_{97}$ ; la même construction sur Goldilocks ([[goldilocks]]) donne le corps des défis de FlashProve.

## Ce qu'on demande

On cherche un ensemble $\E$ qui a trois propriétés.

1. $\E$ contient $\F_p$. Les données sont dans $\F_p$ et les défis dans $\E$, et un même calcul les mélange, par exemple $(1 - r) f_0 + r f_1$ où $f_0$ et $f_1$ sont des données et $r$ un défi.
2. On peut y additionner, soustraire, multiplier et diviser avec les règles de $\F_p$. Les protocoles évaluent des polynômes et divisent, et le compte des racines de [[polynomes]], sur lequel repose la borne, demande qu'un produit ne soit nul que si l'un des facteurs l'est.
3. $\E$ est beaucoup plus grand que $\F_p$.

Un ensemble qui a la deuxième propriété est un corps, et un corps qui contient $\F_p$ s'appelle une **extension** de $\F_p$.

## Des polynômes de degré au plus 2

On prend pour éléments les polynômes de degré au plus 2 à coefficients dans $\F_p$ :

$$a = a_0 + a_1 X + a_2 X^2 \qquad a_0, a_1, a_2 \in \F_p$$

Il y en a $p^3$ : $97^3 = 912\,673$ pour le corps jouet, et environ $2^{192}$ pour Goldilocks. Les éléments de $\F_p$ sont ceux où $a_1 = a_2 = 0$.

On additionne coefficient par coefficient. Le produit de deux éléments, calculé comme un produit de polynômes, a des termes en $X^3$ et $X^4$, donc il n'est plus de degré au plus 2. On le ramène au degré 2 avec une règle fixée, $X^3 = 2$, d'où $X^4 = X \cdot X^3 = 2X$. On note $\E_{97} = \F_{97}[X]/(X^3 - 2)$ : les polynômes sur $\F_{97}$, où $X^3 - 2$ compte pour 0.

:::exercice ★★
Développez $(a_0 + a_1 X + a_2 X^2)(b_0 + b_1 X + b_2 X^2)$, puis remplacez $X^3$ par 2 et $X^4$ par $2X$. Écrivez les trois coefficients du produit.
:::reponse
Le développement donne :

$$a_0 b_0 + (a_0 b_1 + a_1 b_0) X + (a_0 b_2 + a_1 b_1 + a_2 b_0) X^2 + (a_1 b_2 + a_2 b_1) X^3 + a_2 b_2 X^4$$

Le terme en $X^3$ ajoute $2(a_1 b_2 + a_2 b_1)$ au coefficient constant, et le terme en $X^4$ ajoute $2 a_2 b_2$ au coefficient de $X$ :

$$
\begin{aligned}
(ab)_0 &= a_0 b_0 + 2(a_1 b_2 + a_2 b_1) \\
(ab)_1 &= a_0 b_1 + a_1 b_0 + 2 a_2 b_2 \\
(ab)_2 &= a_0 b_2 + a_1 b_1 + a_2 b_0
\end{aligned}
$$
:::
:::

:::exercice ★
Calculez $(1 + 2X)(3 + X^2)$, puis $X^2 \cdot X^2$, dans $\E_{97}$.
:::reponse
$(1 + 2X)(3 + X^2) = 3 + 6X + X^2 + 2X^3$, et $2X^3 = 4$, donc le produit vaut $7 + 6X + X^2$.

$X^2 \cdot X^2 = X^4 = X \cdot X^3 = 2X$.
:::
:::

## Pourquoi $X^3 - 2$

N'importe quelle règle $X^3 = c$ définit une multiplication. Il reste à savoir si l'on peut diviser, et la réponse dépend de $c$. On essaie $c = 8$, le cube de 2.

:::exercice ★★
Dans $\F_{97}[X]/(X^3 - 8)$, calculez $(X - 2)(X^2 + 2X + 4)$. Pourquoi est-ce un problème pour diviser ?
:::reponse
Le produit vaut $X^3 + 2X^2 + 4X - 2X^2 - 4X - 8 = X^3 - 8$, et $X^3 = 8$, donc il vaut 0 : deux éléments non nuls ont un produit nul.

Si $X - 2$ avait un inverse $y$, on aurait $X^2 + 2X + 4 = y(X - 2)(X^2 + 2X + 4) = y \cdot 0 = 0$, ce qui est faux. $X - 2$ n'a donc pas d'inverse.
:::
:::

Le problème vient de la factorisation $X^3 - 8 = (X - 2)(X^2 + 2X + 4)$ : chaque facteur est un élément non nul, et leur produit vaut $X^3 - 8$, qui compte pour 0. Il faut donc un polynôme $X^3 - c$ sans facteur de degré 1 ou 2. Un tel polynôme s'appelle **irréductible**.

Une factorisation d'un polynôme de degré 3 a toujours un facteur de degré 1, $\alpha(X - \rho)$, donc une racine $\rho$. Pour un polynôme de degré 3, être irréductible revient donc à n'avoir aucune racine. Une racine de $X^3 - c$ est un $\rho$ tel que $\rho^3 = c$, d'où la condition : **$X^3 - c$ est irréductible si et seulement si $c$ n'est pas un cube dans $\F_p$.**

Il reste à voir qu'un polynôme irréductible ne laisse aucun produit nul de deux éléments non nuls.

:::derivation Pourquoi un polynôme irréductible ne laisse aucun produit nul
On suppose que $X^3 - 2$ n'a pas de facteur de degré 1 ou 2, ce que montre la section suivante. On suppose $x \cdot y = 0$ dans $\E$ avec $y \neq 0$, et on montre que $x = 0$. On considère tous les polynômes $f$, de n'importe quel degré, tels que $f \cdot y$ soit un multiple de $X^3 - 2$. Cet ensemble contient $X^3 - 2$ et $x$. La somme de deux de ses éléments y est encore, et le produit d'un de ses éléments par n'importe quel polynôme aussi.

Soit $g$ un élément non nul de plus petit degré. On divise un élément quelconque $f$ par $g$, comme on a divisé par $X - a$ dans [[polynomes]] : $f = gQ + R$ avec $\deg R < \deg g$ (on divise par le coefficient dominant de $g$, ce qui demande un corps). $R = f - gQ$ est encore dans l'ensemble, et il est de degré plus petit que $g$, donc $R = 0$. Ainsi $g$ divise tous les éléments de l'ensemble, en particulier $X^3 - 2$.

$X^3 - 2$ n'a pas de facteur de degré 1 ou 2, donc $g$ est de degré 0 ou 3. S'il est de degré 0, c'est une constante non nulle, et $g \cdot y$ est un multiple de $X^3 - 2$ de degré au plus 2 : il est nul, donc $y = 0$, ce qui est exclu. Donc $g$ est de degré 3, et il divise $x$, qui est de degré au plus 2 : $x = 0$.
:::

Chaque $x \neq 0$ a alors un inverse. Les produits $x \cdot y$ pour les $p^3 - 1$ éléments $y \neq 0$ sont non nuls, et ils sont deux à deux distincts, puisque $xy = xy'$ donne $x(y - y') = 0$, donc $y = y'$. Ils prennent donc toutes les valeurs non nulles, y compris 1. La section « L'inverse » donne une formule pour le calculer.

## 2 n'est pas un cube

On cherche les cubes de $\F_{97}$. Si $a = b^3$ avec $b \neq 0$, le petit théorème de Fermat ([[modulo]]) donne :

$$a^{32} = b^{96} = 1$$

Les cubes non nuls sont donc des racines de $X^{32} - 1$. Pour les compter, on regarde combien de $b$ ont le même cube. Si $b^3 = b'^3$, alors $(b'/b)^3 = 1$, donc $b' = \zeta b$ où $\zeta$ est une racine cubique de 1.

:::exercice ★★
Calculez $2^{32}$ modulo 97 en élevant au carré cinq fois à partir de 2. Vérifiez que $35^3 \equiv 1$ et $61^3 \equiv 1$.
:::reponse
On élève au carré en réduisant à chaque étape :

$$
\begin{aligned}
2^2 &= 4, \quad 2^4 = 16 \\
2^8 &= 256 \equiv 62 \\
2^{16} &\equiv 62^2 = 3844 = 39 \times 97 + 61 \equiv 61 \\
2^{32} &\equiv 61^2 = 3721 = 38 \times 97 + 35 \equiv 35
\end{aligned}
$$

Ensuite $35^2 = 1225 \equiv 61$ et $35^3 \equiv 61 \times 35 = 2135 = 22 \times 97 + 1 \equiv 1$. Comme $61 = 35^2$, $61^3 = (35^3)^2 \equiv 1$.
:::
:::

$X^3 - 1$ a au plus 3 racines, et l'exercice en donne trois : 1, 35 et 61. Chaque cube non nul est donc le cube d'exactement trois éléments, et les 96 éléments non nuls donnent $96/3 = 32$ cubes. Ces 32 cubes sont des racines de $X^{32} - 1$, qui en a au plus 32 :

**Les cubes non nuls de $\F_{97}$ sont exactement les $a$ tels que $a^{32} = 1$.**

Or $2^{32} \equiv 35 \neq 1$. Donc 2 n'est pas un cube, $X^3 - 2$ est irréductible, et $\E_{97}$ est un corps.

Le même raisonnement vaut pour Goldilocks, où 3 divise $p - 1$ une seule fois : les cubes non nuls sont les $a$ tels que $a^{(p-1)/3} = 1$. Le code de FlashProve justifie son choix ainsi : 2 a pour ordre 192, c'est-à-dire que $2^k = 1$ exactement quand $k$ est un multiple de $192 = 64 \times 3$, et $(p - 1)/3$ n'a plus de facteur 3, donc $2^{(p-1)/3} \neq 1$ et 2 n'est pas un cube (`blocks/field/gl64.h:30-33`).

## Quand aucun $c$ ne convient

Le raisonnement sur les cubes demande que 3 divise $p - 1$. Le corps $\F_{17}$, où $p - 1 = 16$, montre ce qui se passe sinon.

:::exercice ★★
Montrez que tout élément de $\F_{17}$ est un cube. Indication : si $x^3 = y^3$ avec $x, y \neq 0$, posez $z = x/y$ et utilisez $z^{16} = 1$.
:::reponse
$z^3 = 1$ et $z^{16} = 1$. Comme $16 = 5 \times 3 + 1$, on a $z = z^{16} / (z^3)^5 = 1$, donc $x = y$. Deux éléments non nuls différents ont donc des cubes différents. Les 16 éléments non nuls ont ainsi 16 cubes distincts, qui sont tous les éléments non nuls, et $0 = 0^3$.
:::
:::

Dans $\F_{17}$, chaque $c$ est un cube, donc aucun $X^3 - c$ n'est irréductible. C'est pourquoi le corps jouet est $\F_{97}$, où $96 = 2^5 \times 3$, et pas $\F_{17}$.

## L'inverse

On sait que chaque $x \neq 0$ a un inverse, et on cherche une formule. On écrit $x = a + bX + cX^2$. On cherche d'abord un $y = A + BX + CX^2$ tel que le produit $xy$ soit dans $\F_p$, puis on divisera $y$ par ce nombre. D'après la règle du produit, $xy$ est dans $\F_p$ si ses coefficients de $X$ et de $X^2$ sont nuls :

$$
\begin{aligned}
bA + aB + 2cC &= 0 && (1) \\
cA + bB + aC &= 0 && (2)
\end{aligned}
$$

On élimine $A$ en calculant $c \times (1) - b \times (2)$ :

$$(ac - b^2)\, B + (2c^2 - ab)\, C = 0$$

On satisfait cette équation en prenant :

$$B = 2c^2 - ab \qquad C = b^2 - ac$$

L'équation (2) donne alors $cA = -bB - aC = a^2 c - 2bc^2 = c(a^2 - 2bc)$, donc $A = a^2 - 2bc$. En développant, on vérifie que ces trois valeurs satisfont (1) et (2) pour tous $a$, $b$, $c$, même $c = 0$. Le produit $xy$ se réduit alors à son coefficient constant :

$$N = xy = aA + 2(bC + cB) \in \F_p$$

Si $N \neq 0$, on divise par $N$ :

$$x^{-1} = \frac{A + BX + CX^2}{N}$$

:::exercice ★★
Trouvez l'inverse de $X$, puis celui de $1 + X$. Vérifiez par multiplication.
:::reponse
Pour $x = X$ : $a = 0$, $b = 1$, $c = 0$, donc $A = 0$, $B = 0$, $C = 1$ et $N = 2 \times 1 \times 1 = 2$. Avec $1/2 = 49$, $X^{-1} = X^2/2 = 49 X^2$. Vérification : $X \cdot 49X^2 = 49 X^3 = 98 \equiv 1$.

Pour $x = 1 + X$ : $a = 1$, $b = 1$, $c = 0$, donc $A = 1$, $B = -1$, $C = 1$ et $N = 1 + 2(1 + 0) = 3$. Avec $1/3 = 65$ :

$$(1 + X)^{-1} = 65(1 - X + X^2) = 65 + 32X + 65X^2$$

Vérification : $(1 + X)(65 + 32X + 65X^2) = 65 + 97X + 97X^2 + 65X^3 \equiv 65 + 65 \times 2 = 195 \equiv 1$.
:::
:::

:::exercice ★★★
Montrez que $N \neq 0$ quand $x \neq 0$. Montrez d'abord que $(A, B, C) \neq (0, 0, 0)$, en distinguant $c = 0$ et $c \neq 0$ ; utilisez ensuite que $x$ a un inverse.
:::reponse
On suppose $A = B = C = 0$.

Si $c = 0$, $A = a^2 = 0$ donne $a = 0$, et $C = b^2 = 0$ donne $b = 0$, donc $x = 0$.

Si $c \neq 0$, $C = 0$ donne $a = b^2/c$. Si $b = 0$, alors $a = 0$ et $B = 2c^2 = 0$, donc $c = 0$, ce qui est exclu. Si $b \neq 0$, $A = 0$ donne $a^2 = 2bc$, soit $b^4/c^2 = 2bc$, donc $b^3 = 2c^3$ et $(b/c)^3 = 2$ : 2 serait un cube, ce qui est faux.

Donc $y = A + BX + CX^2 \neq 0$ quand $x \neq 0$. Si l'on avait $N = xy = 0$, en multipliant par l'inverse $z$ de $x$ on trouverait $y = z \cdot xy = 0$, une contradiction. Donc $N \neq 0$.
:::
:::

Un inverse dans $\E$ coûte ainsi une inversion dans $\F_p$ et une douzaine de multiplications.

## Ce qui va dans $\E$

Les données, poids et valeurs intermédiaires, restent dans $\F_p$. Un élément de $\E$ prend trois fois plus de place, et un produit de deux éléments de $\E$ coûte 9 produits dans $\F_p$, contre 3 pour un élément de $\E$ multiplié par un élément de $\F_p$.

Le vérifieur tire ses défis dans $\E$, et toute valeur qui dépend d'un défi, comme $(1 - r) f_0 + r f_1$, est alors dans $\E$. La borne de [[schwartz-zippel]] compte les éléments de l'ensemble où l'on tire le défi, donc un test de degré $d$ se trompe avec probabilité au plus $d/p^3$, même si les données n'occupent que $\F_p$.

:::exercice ★★
Un protocole à deux tours, comme le sumcheck du reçu ([[sumcheck]]), fait à chaque tour un test de degré 2, et il se trompe avec probabilité au plus la somme des erreurs de ses tours. Que vaut cette borne avec des défis tirés dans $\F_{97}$ ? Dans $\E_{97}$ ? Combien de bits ?
:::reponse
Dans $\F_{97}$, la borne vaut $2 \times 2/97 = 4/97 \approx 0{,}041$, soit 4,6 bits. Dans $\E_{97}$, elle vaut $4/912\,673 \approx 4{,}4 \times 10^{-6}$, soit environ 17,8 bits.
:::
:::

## Pourquoi le degré 3

:::incertain
FlashProve donne la taille de $\E$, environ $2^{192}$ (`LOG2_E`, `blocks/field/field.h:25`), mais pas la raison du degré 3 (D3 §1.6). Le cours la lit ainsi. Une extension de degré 2 de Goldilocks aurait environ $2^{128}$ éléments, et un test de degré $d \ge 2$ s'y tromperait avec probabilité $d/2^{128}$, au-dessus de la cible de $2^{-128}$ par tour. Le degré 3 laisse environ 64 bits de marge pour les degrés, les tailles de liste et les sommes d'erreurs.
:::

## Notre prouveur et FlashProve

Les deux construisent le corps des défis avec le même polynôme $X^3 - 2$, sur $\F_{97}$ pour le nôtre et sur Goldilocks pour FlashProve, dont le vérifieur « draws its field-element challenges from E » (`blocks/field/field.h:77`). Le produit suit la formule de l'exercice 1, où la multiplication par 2 est une addition, `times_nr(a) = a + a`, que le code dit juste « only while NR is 2 » (`blocks/field/gl64.h:106-110`). L'inverse suit la formule de la section « L'inverse » (`blocks/field/field.h:186-193`).

La taille d'un élément de $\E$ a une autre conséquence, que lit le chapitre [[cacher]] : une valeur de $\E$ révèle l'information de trois valeurs de $\F$, donc le masque qui cache une réponse hors domaine, un élément de $\E$, occupe trois entrées d'une table sur $\F$ (`PUBLISHED-WORKS.md`, ligne « Haböck, Al Kindi » ; `blocks/iop/send.h`, `Send::pad`).

:::piege
Prendre $X^3 - 5$ pour Goldilocks. 5 y est un cube, donc $X^3 - 5$ a une racine et l'ensemble aurait des produits nuls (`blocks/field/gl64.h:33`). Dans $\F_{97}$, 5 n'est pas un cube : la réponse dépend du corps.
:::

:::piege
Mettre les données dans $\E$. Elles prennent trois fois plus de place, et la probabilité d'erreur n'y gagne rien, puisqu'elle ne dépend que de l'ensemble où l'on tire les défis.
:::

:::piege
Conclure de « pas de racine » qu'un polynôme de degré 4 ou plus est irréductible. Le critère vaut en degré 2 et 3 seulement, parce qu'une factorisation y a toujours un facteur de degré 1. Dans $\F_{97}$, $(X^2 - 5)^2$ n'a pas de racine, puisque 5 n'est pas un carré, et pourtant il se factorise.
:::
