---
id: domaine
---
Un code de [[reed-solomon|Reed-Solomon]] encode un message de $\ell$ nombres en évaluant un [[polynomes|polynôme]] de degré $\ell - 1$ en $n$ points. En chaque point, [[horner|Horner]] demande $\ell - 1$ multiplications, donc le mot entier en demande environ $n \ell$. Pour une ligne de la table de FlashProve, $n = 2^{32}$ et $\ell$ dépasse $4 \times 10^8$, donc ce produit vaut environ $1{,}7 \times 10^{18}$.

On cherche des points où l'évaluation en tous les points coûte de l'ordre de $n \log_2 n$ multiplications, et les corps où de tels points existent. On sépare d'abord un polynôme en deux moitiés, ce qui donne deux valeurs pour le prix d'une. On en déduit la condition que l'ensemble des points doit remplir pour qu'on puisse recommencer, puis on cherche quand cet ensemble existe, dans $\F_{97}$ et dans [[goldilocks|Goldilocks]]. On finit par le décalage et l'ordre des points que FlashProve utilise : ensemble, ils forment le **domaine** du code.

## Deux valeurs pour le prix d'une

On part d'un polynôme de degré 3, et on range ses termes selon la parité de leur puissance :

$$
\begin{aligned}
P(X) &= c_0 + c_1 X + c_2 X^2 + c_3 X^3 \\
&= (c_0 + c_2 X^2) + X\,(c_1 + c_3 X^2)
\end{aligned}
$$

Les deux parenthèses ne contiennent que des puissances de $X^2$. On pose donc $E(Y) = c_0 + c_2 Y$ et $O(Y) = c_1 + c_3 Y$, deux polynômes qui ont chacun la moitié des coefficients de $P$ :

$$P(X) = E(X^2) + X\, O(X^2)$$

La même écriture vaut pour tout degré, avec dans $E$ les coefficients de rang pair et dans $O$ ceux de rang impair.

Comme $z$ et $-z$ ont le même carré, les valeurs de $P$ en ces deux points utilisent les mêmes nombres $E(z^2)$ et $O(z^2)$ :

$$
\begin{aligned}
P(z) &= E(z^2) + z\, O(z^2) \\
P(-z) &= E(z^2) - z\, O(z^2)
\end{aligned}
$$

Une évaluation de $E$ et de $O$ au seul point $z^2$, plus le produit $z \cdot O(z^2)$, donne donc deux valeurs de $P$.

:::exercice ★
Soit $P = 1 + 2X + 3X^2 + 4X^3$ dans $\F_{97}$. Calculez $P(7)$ et $P(-7)$ par la séparation pair/impair, puis vérifiez $P(7)$ directement.
:::reponse
On a $E(Y) = 1 + 3Y$ et $O(Y) = 2 + 4Y$, à évaluer en $y = 7^2 = 49$ :

$$
\begin{aligned}
E(49) &= 148 \equiv 51 \\
O(49) &= 198 \equiv 4
\end{aligned}
$$

Le produit $7 \times 4$ vaut 28, donc $P(7) = 51 + 28 = 79$ et $P(-7) = 51 - 28 = 23$.

Directement, $P(7) = 1 + 14 + 147 + 1372 = 1534$, et avec $100 \equiv 3$ on obtient $1534 = 15 \times 100 + 34 \equiv 45 + 34 = 79$.
:::
:::

## Recommencer sur les carrés

La séparation ramène l'évaluation de $P$ en $n$ points à celle de $E$ et de $O$ en $n/2$ points, les carrés, à condition que les $n$ points aillent par paires $\{z, -z\}$. Pour appliquer la même séparation à $E$ et à $O$, il faut que ces $n/2$ carrés aillent à leur tour par paires opposées, puis leurs propres carrés, et ainsi de suite. Avec $n = 2^k$ points, on cherche donc un ensemble que la mise au carré divise par deux, $k$ fois de suite, jusqu'à un seul point.

Les **racines $n$-ièmes de l'unité** donnent un tel ensemble. On suppose qu'il existe un élément $\omega$ d'**ordre** $n$, c'est-à-dire tel que $\omega^n = 1$ et $\omega^j \neq 1$ pour $0 < j < n$. Ses puissances $1, \omega, \dots, \omega^{n-1}$ sont alors distinctes, et on note $H_n$ leur ensemble.

On montre que la mise au carré envoie $H_n$ sur $H_{n/2}$, deux points sur un. Le carré de $\omega^j$ vaut $(\omega^2)^j$. L'élément $\omega^2$ est d'ordre $n/2$, puisque $(\omega^2)^{n/2} = \omega^n = 1$ et que $(\omega^2)^j = \omega^{2j} \neq 1$ pour $0 < 2j < n$. Les carrés des points de $H_n$ forment donc $H_{n/2}$. Le point $\omega^{n/2}$ vérifie $(\omega^{n/2})^2 = 1$ sans valoir 1, donc il vaut $-1$, la seule autre racine de $X^2 - 1$. On en déduit que $-\omega^j = \omega^{j + n/2}$ est dans $H_n$ : les points vont par paires opposées, et chaque paire a un seul carré.

La récursion descend ainsi de $H_n$ à $H_{n/2}$, puis à $H_{n/4}$, jusqu'à $H_1 = \{1\}$.

:::exercice ★★★
Un polynôme de degré 7 est évalué aux 8 points de $H_8$. Comptez les multiplications de la récursion, en prenant les points et leurs carrés comme déjà connus : ils ne dépendent pas du polynôme. Comparez avec Horner en chacun des 8 points, puis donnez les deux nombres pour $n$ coefficients et $n$ points.
:::reponse
On note $T(n)$ le nombre de multiplications pour $n$ coefficients en $n$ points. Avec un seul coefficient, le polynôme est une constante, donc $T(1) = 0$. Pour $n$ points, les deux évaluations de $E$ et de $O$ coûtent $2T(n/2)$, puis chacune des $n/2$ paires coûte le produit $z \cdot O(z^2)$ :

$$T(n) = 2\,T(n/2) + n/2$$

On en déduit $T(2) = 1$, $T(4) = 2 + 2 = 4$ et $T(8) = 8 + 4 = 12$. Horner demande 7 multiplications en chaque point, soit $8 \times 7 = 56$.

En général, chacun des $\log_2 n$ niveaux de la récursion coûte $n/2$ produits, donc $T(n) = \frac{n}{2} \log_2 n$, contre $n(n-1)$ pour Horner.
:::
:::

Cette récursion s'appelle la **transformée de Fourier rapide** (FFT). Ses deux lignes $P(z) = a + z b$ et $P(-z) = a - z b$, avec $a = E(z^2)$ et $b = O(z^2)$, forment un **papillon** : une paire $(a, b)$ devient $(a + t b,\ a - t b)$, avec $t = z$. FlashProve encode ses lignes par couches de papillons (`Encoder::evaluate`, commentaire de `blocks/code/code.h:217-219`).

## Quand ces points existent

Il reste à savoir pour quels $n$ un élément d'ordre $n$ existe. Le groupe $\F_p^*$ des éléments non nuls a $p - 1$ éléments, et 7 l'**engendre** : ses puissances $7^0, 7^1, \dots, 7^{p-2}$ sont les $p - 1$ éléments non nuls, chacun une fois. C'est vrai pour $p = 97$ comme pour Goldilocks (`blocks/code/cosets.h:39`).

Si $n$ divise $p - 1$, on pose $\omega = 7^{(p-1)/n}$. Alors $\omega^n = 7^{p-1} = 1$ par le petit théorème de Fermat. Pour $0 < j < n$, l'exposant de $\omega^j = 7^{j(p-1)/n}$ est strictement entre 0 et $p - 1$, donc $\omega^j \neq 7^0 = 1$. Cet $\omega$ est d'ordre $n$.

:::exercice ★★★
Montrez la réciproque : si un élément $a$ de $\F_p^*$ est d'ordre $n$, alors $n$ divise $p - 1$. Indication : écrivez la division euclidienne $p - 1 = sn + t$ avec $0 \le t < n$.
:::reponse
Par Fermat, $a^{p-1} = 1$, et par définition de l'ordre, $a^n = 1$. Donc :

$$1 = a^{p-1} = (a^n)^s \cdot a^t = a^t$$

Comme $t < n$ et que $n$ est le plus petit exposant positif qui donne 1, on a $t = 0$ : $n$ divise $p - 1$.
:::
:::

Un ensemble $H_n$ avec $n = 2^k$ existe donc exactement quand $2^k$ divise $p - 1$. Dans $\F_{97}$, $p - 1 = 96 = 2^5 \times 3$, donc $n$ vaut au plus $2^5 = 32$. Dans Goldilocks, $p - 1 = 2^{32} \times 3 \times 5 \times 17 \times 257 \times 65537$ (`blocks/field/gl64.h:30`), donc $n$ va jusqu'à $2^{32}$.

:::exercice ★★
Calculez $\omega_8 = 7^{12}$ modulo 97 par carrés successifs, puis ses puissances jusqu'à la 8e. Vérifiez que $\omega_8^4 = -1$.
:::reponse
Avec $100 \equiv 3$ :

$$
\begin{aligned}
7^2 &= 49 \\
7^4 &= 49^2 = 2401 \equiv 72 + 1 = 73 \\
7^8 &= 73^2 = 5329 \equiv 159 + 29 = 188 \equiv 91 \\
7^{12} &= 91 \times 73 = 6643 \equiv 198 + 43 = 241 \equiv 6 + 41 = 47
\end{aligned}
$$

Les puissances de 47, de la 0e à la 8e, valent $1, 47, 75, 33, 96, 50, 22, 64, 1$. La 4e vaut $96 = -1$, et la 8e revient à 1 : $H_8 = \{1, 47, 75, 33, 96, 50, 22, 64\}$.
:::
:::

:::exercice ★★
Peut-on encoder sur 64 points de $\F_{97}$ par cette récursion ? Et sur $2^{33}$ points de Goldilocks, avec un seul ensemble $H_n$ ?
:::reponse
Non dans les deux cas. 64 ne divise pas 96, donc $\F_{97}$ n'a pas d'élément d'ordre 64. De même, $2^{33}$ ne divise pas $p - 1$ pour Goldilocks. FlashProve borne pour cette raison la longueur de ses codes à $2^{32}$ (`docs/format/08-parameters.md`, en tête), même si son code sait placer des codes plus longs sur plusieurs ensembles $7^{1+c} H$ (`blocks/code/cosets.h:10-18`).
:::
:::

## Le domaine décalé

FlashProve évalue sur l'ensemble $7 \cdot H_n = \{7h : h \in H_n\}$, qu'on appelle une **classe** de $H_n$ (FORMAT R12.11, dans `docs/format/09-key-and-leaf-files.md` ; `blocks/code/cosets.h:10-18`). La récursion y marche de la même façon. D'une part $-7h = 7 \cdot (-h)$ est encore dans l'ensemble, donc les points vont par paires opposées. D'autre part $(7h)^2 = 49 h^2$, donc les carrés forment $49 \cdot H_{n/2}$, une classe de $H_{n/2}$, et ainsi de suite jusqu'à un seul point. Aucun point n'est nul, puisque $7h \neq 0$. On note $D = 7 \cdot H_n$ ce domaine, et $D_n$ quand on précise sa taille. Le cours n'a pas trouvé dans le dépôt de FlashProve la raison du décalage 7 plutôt que $H_n$ lui-même.

## L'ordre des positions

Un mot du code est une liste de $n$ symboles, un par **position** $x = 0, \dots, n-1$, et il faut fixer quel point porte chaque position. La récursion lit ses paires $\{z, -z\}$ à chaque niveau, donc FlashProve met $z$ et $-z$ côte à côte, aux positions $2m$ et $2m + 1$.

La règle (FORMAT R12.11) associe au bit $i$ de la position un facteur $r_i$ d'ordre $2^{i+1}$, et donne à la position $x$ le point :

$$z_x = 7 \prod_{i \,:\, \text{bit } i \text{ de } x \text{ vaut } 1} r_i$$

Dans $\F_{97}$, $r_i = 7^{96/2^{i+1}}$ ; FlashProve prend $r_i = w^{2^{31-i}}$, où $w$ est sa racine d'ordre $2^{32}$. Le bit 0 multiplie par $r_0 = -1$, le seul élément d'ordre 2 : c'est ce qui place $z$ et $-z$ aux positions $2m$ et $2m + 1$. FORMAT R12.11 le dit ainsi : « position 0 has the point 7, position 1 the point $-7$ ».

:::exercice ★★
Construisez $D_8$ dans l'ordre des positions $0, \dots, 7$, avec $\omega = 47$ : le bit 0 multiplie par $\omega^4 = -1$, le bit 1 par $\omega^2 = 75$, le bit 2 par $\omega = 47$. Vérifiez que les positions $2m$ et $2m + 1$ sont opposées, puis que les carrés des huit points forment $49 \cdot H_4$, avec $H_4 = \{1, 75, 96, 22\}$, les puissances de $\omega^2 = 75$.
:::reponse
Les points sont $7$, $-7$, $7 \cdot 75$, $-7 \cdot 75$, $7 \cdot 47$, $-7 \cdot 47$, $7 \cdot 33$, $-7 \cdot 33$ (avec $47 \cdot 75 \equiv 33$), soit :

$$D_8 = (7, 90, 40, 57, 38, 59, 37, 60)$$

Chaque paire a pour somme 97, donc ses deux points sont opposés. Les carrés valent $(49, 49, 48, 48, 86, 86, 11, 11)$, et l'ensemble $\{49, 48, 86, 11\}$ est $49 \cdot H_4$, puisque $49 \cdot \{1, 96, 75, 22\} = \{49, 48, 86, 11\}$.
:::
:::

Les carrés des positions paires, $(49, 48, 86, 11)$, vont à leur tour par paires opposées voisines, puisque $48 = -49$ et $11 = -86$ : le niveau suivant de la récursion trouve ses paires dans le même ordre.

Le facteur $r_i$ du bit $i$ ne dépend pas de $n$. Les $n/2$ premières positions de $D_n$, dont le bit le plus haut vaut 0, forment donc $D_{n/2}$ : les quatre premiers points de $D_8$, $(7, 90, 40, 57)$, sont $D_4 = 7 \cdot H_4$, et les huit premiers points de $D_{32}$ sont ceux de $D_8$.

:::piege
**Deux pièges sur les racines.** L'ordre des positions n'est pas celui des exposants : la position 1 de $D_8$ porte $7\omega^4 = -7 = 90$, et non $7\omega = 38$. Un encodeur qui range les points par exposants croissants produit les mêmes symboles dans un autre ordre, donc un autre mot.

Ensuite, $\omega^n = 1$ ne suffit pas pour que $\omega$ soit d'ordre $n$. Dans $\F_{97}$, $22^{16} = 1$, mais 22 est d'ordre 4, donc ses puissances ne donnent que 4 points. Pour $n = 2^k$, on contrôle $\omega^{n/2} = -1$. Ce contrôle suffit : l'ordre de $\omega$ divise $n$, donc c'est une puissance de 2, et s'il était plus petit que $n$, il diviserait $n/2$ et on aurait $\omega^{n/2} = 1$.
:::

## Notre prouveur et FlashProve

| | notre prouveur | FlashProve |
|---|---|---|
| corps | $\F_{97}$ | Goldilocks |
| plus grand $H_n$ | $n = 32$ | $n = 2^{32}$ (`gl64.h:30`) |
| domaine | $7 \cdot H_{32}$ | $7 \cdot H_{2^{32}}$ (R12.11) |
| racine d'ordre maximal | $7^3 = 52$ | `0xE2AF70635744FD26` $= 7^{5(2^{32}-1)}$ (`cosets.h:39-44`) |

Pour Goldilocks, $(p - 1)/2^{32} = 2^{32} - 1$, donc la racine $7^{(p-1)/2^{32}}$ serait $7^{2^{32}-1}$. FlashProve prend sa puissance 5. Elle garde l'ordre $2^{32}$ : si $\omega$ est d'ordre $2^{32}$, $(\omega^5)^j = 1$ demande que $2^{32}$ divise $5j$, donc $j$, puisque 5 est impair. Le commentaire de `cosets.h:39-42` donne la raison de ce choix : les puissances de cette racine d'ordres 64, 32, 16, 8 et 4 valent $2^3$, $2^6$, $2^{12}$, $2^{24}$ et $2^{48}$, et multiplier par une puissance de 2 revient à décaler les bits avant de réduire.
