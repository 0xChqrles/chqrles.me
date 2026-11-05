---
id: horner
---
On a beaucoup d'affirmations à contrôler, chacune de la forme « ce nombre vaut 0 ». On veut n'en contrôler qu'une, sans laisser passer une affirmation fausse.

La page part de la méthode de Horner, qui évalue un polynôme en ne gardant qu'une valeur. Elle s'en sert d'abord pour résumer un vecteur par un seul nombre, puis pour regrouper $m$ affirmations en une seule avec les puissances d'un défi $\chi$, et elle borne la probabilité qu'une affirmation fausse passe avec [[schwartz-zippel]]. Elle finit par les endroits où FlashProve fait ce regroupement. Les calculs se font dans $\F_{97}$.

## Évaluer en gardant une valeur

Quand on lit 312 chiffre après chiffre, on garde 3, puis $3 \times 10 + 1 = 31$, puis $31 \times 10 + 2 = 312$. À chaque chiffre, on multiplie ce qu'on a par 10 et on ajoute le chiffre. Un polynôme en $t$ se calcule de la même façon, avec $t$ à la place de 10 :

$$c_0 t^{n-1} + c_1 t^{n-2} + \dots + c_{n-1} = (\dots((c_0\, t + c_1)\, t + c_2)\, t + \dots)\, t + c_{n-1}$$

On calcule les parenthèses de l'intérieur vers l'extérieur, en ne gardant qu'une valeur. Pour le reçu du chapitre [[prouver-sans-refaire]], les prix $5, 7, 11, 13$ et $t = 3$ donnent les valeurs gardées 5, 22, 77 et 244, le total du reçu.

:::exercice ★
Combien de multiplications faut-il pour évaluer un polynôme de degré $n - 1$ terme par terme, en calculant $t^2, \dots, t^{n-1}$ une à une, puis chaque produit $c_i t^{n-1-i}$ ? Et par Horner ?
:::reponse
Terme par terme, il faut $n - 2$ multiplications pour les puissances $t^2, \dots, t^{n-1}$, puis $n - 1$ pour les produits par les coefficients ($c_{n-1}$ n'est multiplié par rien), soit $2n - 3$.

Par Horner, il faut une multiplication par coefficient sauf le premier, soit $n - 1$, et une seule valeur gardée au lieu de toutes les puissances.
:::
:::

## Résumer un vecteur par un nombre

Pour comparer deux vecteurs $v$ et $w$ de longueur $n$ coordonnée par coordonnée, il faut lire leurs $n$ coordonnées. On associe à $v$ le polynôme dont ses coordonnées sont les coefficients :

$$P_v(t) = \sum_{i=0}^{n-1} v_i\, t^{n-1-i}$$

et on compare $P_v(t)$ et $P_w(t)$ en un $t$ tiré au hasard dans $\F_p$. Si $v = w$, les deux nombres sont égaux. Si $v \neq w$, $P_v$ et $P_w$ sont deux polynômes différents de degré au plus $n - 1$, qui coïncident en $t$ avec probabilité au plus $(n - 1)/p$ ([[schwartz-zippel]]). Le nombre $P_v(t)$ résume donc $v$ : deux vecteurs différents ont des résumés différents, sauf avec probabilité au plus $(n - 1)/p$.

Le total d'un reçu est le résumé de ses prix en $t = 3$. Les reçus de prix $(5, 7, 11, 13)$ et $(5, 7, 12, 10)$ ont le même total parce que $t = 3$ est justement le seul point où leurs polynômes coïncident ([[schwartz-zippel]]). Le résumé ne vaut que si $t$ est tiré au hasard, après que les vecteurs sont fixés.

## Regrouper des affirmations

Le prouveur affirme $m$ égalités $c_0 = 0, c_1 = 0, \dots, c_{m-1} = 0$. Dans une preuve, chaque $c_i$ est une combinaison de données que le vérifieur ne lit pas, et chaque égalité demanderait sa propre preuve. On les combine comme les coordonnées d'un vecteur, avec un défi $\chi$ tiré **après** que le prouveur a fixé ses affirmations. La somme est encore une combinaison des mêmes données, de coefficients connus, et il ne reste qu'une égalité à prouver :

$$\sum_{i=0}^{m-1} \chi^i c_i = 0$$

Si toutes les affirmations sont vraies, la somme est nulle pour tout $\chi$. Si l'une est fausse, $c_i \neq 0$ pour au moins un $i$, et la somme est la valeur en $\chi$ du polynôme $\sum_i c_i X^i$, non nul et de degré au plus $m - 1$. Il a au plus $m - 1$ racines, donc le regroupement laisse passer une affirmation fausse avec probabilité au plus :

$$\frac{m - 1}{p}$$

La somme se calcule par Horner, à partir du coefficient de la plus haute puissance : on garde $c_{m-1}$, puis $c_{m-1} \chi + c_{m-2}$, et ainsi de suite jusqu'à $c_0$. Dans les exercices, les $c_i$ sont des nombres donnés.

:::exercice ★
Les affirmations $(c_0, c_1, c_2) = (0, 0, 5)$ sont regroupées avec $\chi = 5$. Calculez $\sum_i \chi^i c_i$ par Horner. Pour quels $\chi$ le regroupement laisserait-il passer ces affirmations ?
:::reponse
La somme vaut $5\chi^2$. Par Horner depuis $c_2$, on garde $5$, puis $5 \times 5 + 0 = 25$, puis $25 \times 5 + 0 = 125 \equiv 28$. Elle n'est pas nulle, donc le vérifieur rejette.

$5\chi^2 = 0$ seulement pour $\chi = 0$ : un $\chi$ sur 97 laisserait passer ces affirmations.
:::
:::

## Deux erreurs qui s'annulent

Deux affirmations fausses peuvent se compenser : leurs termes dans la somme s'annulent. L'exercice suivant cherche pour quels $\chi$.

:::exercice ★★
Même question pour $(c_0, c_1, c_2) = (1, 96, 0)$, puis pour $(2, 0, 95)$.
:::reponse
$1 + 96\chi = 1 - \chi$ s'annule seulement en $\chi = 1$ : probabilité $1/97$.

$2 + 95\chi^2 = 2 - 2\chi^2 = 2(1 - \chi)(1 + \chi)$ s'annule en $\chi = 1$ et en $\chi = -1 = 96$ : probabilité $2/97$, la borne $(m - 1)/p$ avec $m = 3$.
:::
:::

Des erreurs ne se compensent donc qu'en au plus $m - 1$ valeurs de $\chi$, et le prouveur ne peut pas viser ces valeurs tant qu'il ignore $\chi$.

## Affirmer, puis tirer

:::exercice ★★
Pourquoi le vérifieur doit-il tirer $\chi$ après que le prouveur a fixé ses affirmations ? Donnez une attaque sinon.
:::reponse
Si le prouveur connaît $\chi \neq 0$ à l'avance, il choisit une affirmation fausse $c_0 \neq 0$, puis $c_1 = -c_0 / \chi$. La somme vaut $c_0 + \chi c_1 = 0$, et le vérifieur accepte deux affirmations fausses.

La borne $(m - 1)/p$ compte les $\chi$ qui annulent un polynôme fixé, et elle ne dit rien d'un polynôme choisi après $\chi$.
:::
:::

:::piege
Tirer $\chi$ avant les affirmations, ou réutiliser un $\chi$ que le prouveur a déjà vu.
:::

## Combien d'affirmations

La borne $(m - 1)/p$ grandit avec le nombre d'affirmations regroupées, et la taille de l'ensemble où l'on tire $\chi$ doit suivre.

:::exercice ★★★
On regroupe $m = 2^{20}$ affirmations. Que vaut la borne $(m - 1)/p$ dans $\F_{97}$ ? Et avec $\chi$ tiré dans Goldilocks, où $p \approx 2^{64}$ ? Et dans le corps des défis de FlashProve, qui a environ $2^{192}$ éléments ([[extension]]) ?
:::reponse
Dans $\F_{97}$, $(2^{20} - 1)/97 \approx 10\,810$, une « probabilité » plus grande que 1 : la borne ne garantit rien. Un polynôme de degré au plus $2^{20} - 1$ peut d'ailleurs s'annuler sur tout $\F_{97}$, par exemple $X^{97} - X$, qui vaut 0 en chaque point par le petit théorème de Fermat.

Dans Goldilocks, $(2^{20} - 1)/2^{64} \approx 2^{-44}$, soit 44 bits. Dans le corps des défis, $2^{20}/2^{192} = 2^{-172}$, soit 172 bits.
:::
:::

:::piege
Oublier le facteur $m - 1$. Regrouper $m$ affirmations donne la borne $(m - 1)/p$, pas $1/p$ : on perd environ $\log_2 (m - 1)$ bits.
:::

## Dans FlashProve

FlashProve regroupe ainsi ses affirmations, avec un défi tiré dans son corps des défis $\E$ ([[extension]]).

Dans un test de proximité ([[test-proximite]]), l'étape `BAT` regroupe des lignes : « The verifier samples one element x of E », et il garde une seule ligne, dont les coefficients sont « the sum of x^i c_i » (`docs/format/toys/1-product.md`, partie 1, §4.3-4.4). Pour $J$ lignes, la forme `BAT-sigma` compte l'erreur $(J - 1)/\lvert \E \rvert$, la borne de cette page (§4.6) ; la forme `BAT` la multiplie par une taille de liste ([[distance]], §4.5).

Chaque segment du modèle regroupe aussi toutes ses affirmations en une seule équation, en additionnant les termes $\chi^i \mathrm{cl}_i$ (`docs/format/11-1-machinery.md`, « The one equation »).
