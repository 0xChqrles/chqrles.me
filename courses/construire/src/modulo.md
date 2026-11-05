---
id: modulo
---
On veut des nombres de taille fixe sur lesquels l'addition, la soustraction, la multiplication et la division par tout nombre non nul donnent des résultats exacts. Cette page garde de chaque entier son reste dans la division par un nombre $p$, et montre qu'on peut calculer sur ces restes. Elle cherche ensuite comment diviser : la division échoue quand le diviseur a un facteur commun avec $p$, et elle réussit toujours quand $p$ est premier. Elle finit par deux façons de calculer un inverse, l'algorithme d'Euclide pour la main et le petit théorème de Fermat pour la machine.

## Les restes

Tout entier $a$ s'écrit d'une seule façon $a = kp + r$ avec $0 \le r < p$ : $k$ est le **quotient** et $r$ le **reste** de la division par $p$. On ne garde que $r$, qui a une taille fixe puisqu'il est inférieur à $p$.

Deux entiers qui ont le même reste sont **congrus** modulo $p$, et on écrit $a \equiv b \pmod p$. Cela revient à dire que $p$ divise $a - b$ : si $a = kp + r$ et $b = lp + r$, alors $a - b = (k - l)p$, et si $a - b = jp$, alors $a = b + jp$ a le même reste que $b$. Par exemple $244 \equiv 50 \pmod{97}$, puisque $244 - 50 = 194 = 2 \times 97$.

## Les opérations passent aux restes

Pour calculer sur les restes seuls, il faut que le reste d'une somme ou d'un produit ne dépende que des restes des deux opérandes. Pour la somme, on écrit $a = a' + kp$ et $b = b' + lp$, et on obtient $a + b = a' + b' + (k + l)p$, donc $a + b \equiv a' + b'$.

:::exercice ★
Montrez de la même façon que si $a \equiv a'$ et $b \equiv b' \pmod p$, alors $ab \equiv a'b' \pmod p$.

:::reponse
On écrit $a = a' + kp$ et $b = b' + lp$, et on développe :

$$ab = a'b' + (a'l + b'k + klp)\,p$$

La différence $ab - a'b'$ est un multiple de $p$, donc $ab \equiv a'b'$.
:::
:::

On peut donc réduire après chaque opération, et aucun nombre ne dépasse $p - 1$ entre deux opérations.

## Réduire à la main modulo 97

Le cours calcule à la main modulo 97. Comme $100 = 97 + 3$, on a $100 \equiv 3$. Un nombre $a = 100h + l$, où $l$ est formé de ses deux derniers chiffres, se réduit donc en $3h + l$. On recommence tant que le résultat dépasse 99, puis on retire 97 une fois si le résultat vaut 97, 98 ou 99 :

$$
\begin{aligned}
45 \times 67 = 3015 &= 30 \times 100 + 15 \equiv 3 \times 30 + 15 = 105 \\
105 &= 1 \times 100 + 5 \equiv 3 + 5 = 8
\end{aligned}
$$

:::exercice ★
Calculez $88 \times 76$ modulo 97 avec $100 \equiv 3$.

:::reponse
$$
\begin{aligned}
88 \times 76 = 6688 &= 66 \times 100 + 88 \equiv 198 + 88 = 286 \\
286 &= 2 \times 100 + 86 \equiv 6 + 86 = 92
\end{aligned}
$$

Contrôle : $97 \times 68 = 6596$ et $6688 - 6596 = 92$.
:::
:::

## L'opposé

L'opposé $-a$ est le nombre qui donne 0 quand on l'ajoute à $a$. Le nombre $p - a$ convient, puisque $a + (p - a) = p \equiv 0$. Donc $-a \equiv p - a$, et par exemple $-3 \equiv 94 \pmod{97}$. La soustraction $a - b$ se calcule comme $a + (p - b)$.

:::piege
En C, en Rust et en Java, `%` garde le signe du dividende : `-3 % 97` vaut `-3`, pas 94. En Python, `-3 % 97` vaut `94`. Dans les trois premiers langages, on ajoute $p$ à un reste négatif pour obtenir l'élément du corps.
:::

## Diviser : le problème

Diviser par $a$, c'est multiplier par un nombre $b$ tel que $ab \equiv 1$. Ce nombre s'appelle l'**inverse** de $a$ et s'écrit $1/a$. On cherche quand il existe, en commençant par un module qui n'est pas premier.

:::exercice ★
Modulo 96, trouvez un $b$ non nul tel que $3b \equiv 0$. Pourquoi 3 ne peut-il alors pas avoir d'inverse modulo 96 ?

:::reponse
$b = 32$ convient, puisque $3 \times 32 = 96 \equiv 0$.

Supposons qu'un $c$ vérifie $3c \equiv 1$. En multipliant par 32 :

$$32 = 32 \times 1 \equiv 32 \times 3c = 96c \equiv 0$$

Or $32 \not\equiv 0$, donc ce $c$ n'existe pas.
:::
:::

L'obstacle est le facteur 3, commun à 3 et au module 96. Il donne un produit nul, $3 \times 32 \equiv 0$, dont aucun facteur n'est nul, et ce produit nul interdit l'inverse. Le même raisonnement vaut pour tout $a$ qui partage un facteur $d > 1$ avec le module $m$ : le produit $a \times (m/d)$ est un multiple de $m$, donc nul, alors que $m/d$ ne l'est pas. On choisit donc un module **premier**, qui ne partage de facteur avec aucun nombre de 1 à $p - 1$.

## Modulo un nombre premier, tout nombre non nul a un inverse

On regarde d'abord un petit cas.

:::exercice ★
Modulo 7, calculez $3x$ pour $x = 1, \dots, 6$. Pour quel $x$ obtient-on 1 ?

:::reponse
On obtient $3$, $6$, $9 \equiv 2$, $12 \equiv 5$, $15 \equiv 1$ et $18 \equiv 4$. Le produit vaut 1 pour $x = 5$, donc $1/3 \equiv 5 \pmod 7$.
:::
:::

Les six produits sont les nombres $1, \dots, 6$ dans un autre ordre, donc l'un d'eux vaut 1. On montre que c'est vrai pour tout nombre premier $p$ et tout $a$ non nul.

Les $p - 1$ produits $a \times 1, a \times 2, \dots, a \times (p-1)$ sont deux à deux différents modulo $p$. En effet, si $ax \equiv ay$, alors $p$ divise $a(x - y)$. Un nombre premier qui divise un produit divise l'un des facteurs (c'est le lemme d'Euclide), et $p$ ne divise pas $a$, donc $p$ divise $x - y$. Comme $x$ et $y$ sont entre 1 et $p - 1$, leur différence est entre $-(p - 2)$ et $p - 2$, où le seul multiple de $p$ est 0. Donc $x = y$.

Aucun de ces produits n'est nul, par le même lemme, puisque $p$ ne divise ni $a$ ni $x$.

On a donc $p - 1$ valeurs différentes, toutes dans l'ensemble $\{1, \dots, p - 1\}$, qui a $p - 1$ éléments. Ce sont donc exactement les nombres $1, \dots, p - 1$ dans un autre ordre. L'une d'elles vaut 1, et le $x$ correspondant est l'inverse de $a$.

Les restes modulo un nombre premier $p$, avec l'addition et la multiplication modulo $p$, forment le **corps à $p$ éléments**, noté $\F_p$.

## Trouver l'inverse à la main : Euclide

L'argument montre que l'inverse existe, sans dire comment le trouver, et essayer les $p - 1$ valeurs est long. On cherche plutôt à écrire 1 sous la forme $u \times a + v \times p$. Modulo $p$, le terme $v \times p$ s'annule, il reste $ua \equiv 1$, et $u$ est l'inverse de $a$.

Pour $a = 3$ et $p = 97$, une division suffit :

$$97 = 32 \times 3 + 1$$

On en déduit $1 = 97 - 32 \times 3$, donc modulo 97 :

$$1 \equiv -32 \times 3, \quad\text{donc}\quad 1/3 \equiv -32 \equiv 65$$

Quand le reste ne vaut pas 1, on divise le diviseur par ce reste, et on recommence. Chaque reste s'écrit avec le dividende et le diviseur de sa division, donc en remontant les divisions on écrit 1 avec $a$ et $p$ seuls. C'est l'**algorithme d'Euclide étendu**. Les restes décroissent, donc la suite s'arrête sur un reste nul ; le dernier reste non nul divise alors tous les nombres de la suite en remontant, donc $a$ et $p$. Comme $p$ est premier et $0 < a < p$, ce dernier reste vaut 1.

:::exercice ★★
Trouvez $1/5$ modulo 97 par l'algorithme d'Euclide, puis $1/7$.

:::reponse
Pour 5 : $97 = 19 \times 5 + 2$, puis $5 = 2 \times 2 + 1$. On remonte :

$$1 = 5 - 2 \times 2 = 5 - 2(97 - 19 \times 5) = 39 \times 5 - 2 \times 97$$

donc $1/5 = 39$.

Pour 7 : $97 = 13 \times 7 + 6$, puis $7 = 1 \times 6 + 1$. On remonte :

$$1 = 7 - 6 = 7 - (97 - 13 \times 7) = 14 \times 7 - 97$$

donc $1/7 = 14$.
:::
:::

## Trouver l'inverse par une formule : Fermat

Le nombre de divisions d'Euclide dépend de $a$. Une machine dispose déjà de la multiplication modulo $p$, et on cherche une formule de l'inverse qui n'utilise qu'elle. Si une puissance $a^k$ vaut 1, alors $a \times a^{k-1} = a^k \equiv 1$, donc $a^{k-1}$ est l'inverse de $a$. On cherche donc un exposant $k$ tel que $a^k \equiv 1$ pour tout $a$ non nul. On repart du petit cas modulo 7, où les produits $3 \times 1, \dots, 3 \times 6$ sont les nombres $1, \dots, 6$ dans un autre ordre.

:::exercice ★★★
Montrez que $a^{96} \equiv 1 \pmod{97}$ pour tout $a$ non nul, sans calculer de puissance. Partez du fait que $a \times 1, \dots, a \times 96$ sont les nombres $1, \dots, 96$ dans un autre ordre.

:::reponse
Les deux listes ont le même produit modulo 97. Dans le produit de la première, on regroupe les 96 facteurs $a$ :

$$a^{96} \times 96! \equiv 96!$$

$96!$ est un produit de nombres non nuls modulo 97, donc il est non nul (lemme d'Euclide), et il a un inverse. En multipliant les deux côtés par cet inverse, on obtient $a^{96} \equiv 1$.
:::
:::

Le même raisonnement vaut pour tout nombre premier $p$ et tout $a$ non nul :

$$a^{p-1} \equiv 1 \pmod p$$

C'est le **petit théorème de Fermat**. Comme $a^{p-1} = a \times a^{p-2}$, il donne l'inverse :

$$1/a = a^{p-2}$$

Modulo 97, on a ainsi $1/3 = 3^{95}$. Calculer cette puissance une multiplication à la fois en demande 94. On passe plutôt par des carrés : un carré double l'exposant, ce qui décale ses bits d'un cran vers la gauche, et un produit par $a$ ajoute 1 à l'exposant, ce qui met son dernier bit à 1. On part de $a$, dont l'exposant 1 donne le bit de tête, puis on lit les bits suivants un par un : un carré pour chaque bit, et un produit par $a$ en plus quand le bit vaut 1.

:::exercice ★★
Écrivez 95 en binaire et comptez les multiplications de $3^{95}$ par carrés successifs. Vérifiez que le résultat est 65.

:::reponse
$95 = 1011111_2$. On part de 3 pour le bit de tête. Il reste 6 bits, donc 6 carrés, dont 5 sont suivis d'un produit par 3 : 11 multiplications au lieu de 94.

Les exposants successifs sont $1, 2, 5, 11, 23, 47, 95$, et les valeurs modulo 97 sont $3, 9, 49, 25, 32, 65, 65$. On vérifie : $3 \times 65 = 195 = 2 \times 97 + 1$.
:::
:::

## Les petits inverses de $\F_{97}$

Les exemples du cours reviennent souvent aux mêmes inverses :

| $a$ | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $1/a$ | 49 | 65 | 73 | 39 | 81 | 14 | 85 | 54 | 68 |

## Dans FlashProve

FlashProve calcule dans Goldilocks, le corps de module $p = 2^{64} - 2^{32} + 1$ ([[goldilocks]]), et il inverse un élément par la formule de Fermat, en calculant $x^{p-2}$ par carrés successifs avec sa fonction `pow` (`blocks/field/field.h`, lignes 169 à 185) :

:::code blocks/field/field.h · inv
```cpp
// 1 / x. Both overloads return 0 for x = 0: a caller that can meet 0 must test for it first.
BLK_HD inline F inv(F x) {
  return pow(x, P - 2);
}
```
:::

Une recherche dans les sources de `blocks/`, `prover/` et `verifier/` ne trouve pas l'algorithme d'Euclide (D3 §1.4).

:::piege
`inv(0)` renvoie 0 sans erreur, puisque $0^{p-2} = 0$. Le commentaire du code le signale : un appelant qui peut rencontrer 0 doit le tester avant d'inverser.
:::
