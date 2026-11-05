---
id: sumcheck-matrices
---
On a un produit de matrices $Y = XW$, où $X$ et $W$ ne sont connues du vérifieur qu'à travers des affirmations en des points : « l'extension multilinéaire de $X$ vaut tant en tel point ». On veut vérifier $Y$ sans le calculer, et sans que le prouveur l'écrive.

On part du test de [[freivalds]], qu'on écrit avec les poids $\eq$ de l'[[multilineaire|extension multilinéaire]]. En développant le produit, la valeur de $\tilde Y$ en un point devient une somme sur l'indice intérieur, qu'un [[sumcheck]] vérifie. On déroule ce sumcheck sur un exemple $2 \times 2$, on regarde ce que le prouveur calcule, puis on fait passer plusieurs produits par un seul sumcheck.

## Le cadre

$X$ a $m$ lignes et $n$ colonnes, $W$ a $n$ lignes et $\ell$ colonnes, et chaque entrée du produit est une somme sur l'**indice intérieur** $k$ :

$$Y_{ij} = \sum_{k} X_{ik} W_{kj}$$

Les tailles sont des puissances de 2, et chaque indice s'écrit en binaire, le bit de poids faible en premier (la convention de [[multilineaire]]). Une matrice a une extension multilinéaire en deux groupes de variables, un pour les bits de l'indice de ligne et un pour ceux de l'indice de colonne. Comme $\eq$ est un produit sur les bits, le poids d'une entrée $(i, j)$ se coupe en deux facteurs :

$$\tilde Y(z, z') = \sum_{i, j} \eq(z, i)\, \eq(z', j)\, Y_{ij}$$

On écrit toujours le point des lignes en premier. Quand l'un des deux arguments est un indice, cette formule se lit sur une ligne ou sur une colonne : $\tilde X(z, k) = \sum_i \eq(z, i) X_{ik}$ combine les lignes de $X$ avec les poids $\eq(z, i)$, et donne une ligne de $n$ nombres.

## Freivalds avec les poids eq

Le test de Freivalds contrôle $XW = Y$ en multipliant les deux côtés par des vecteurs tirés au hasard. On multiplie ici par un vecteur ligne $u$ à gauche et par un vecteur colonne $v$ à droite. Si $Y = XW$, le produit des matrices étant associatif, on a :

$$u^\top Y v = (u^\top X)(W v)$$

Le membre de gauche ne dépend que de $Y$, et celui de droite est le produit scalaire de deux vecteurs. On choisit $u_i = \eq(z, i)$ et $v_j = \eq(z', j)$, avec $z$ et $z'$ tirés au hasard. Le membre de gauche devient :

$$u^\top Y v = \sum_{i, j} \eq(z, i)\, Y_{ij}\, \eq(z', j) = \tilde Y(z, z')$$

Le test de Freivalds avec ces vecteurs revient donc à contrôler une seule valeur de l'extension multilinéaire de $Y$, en un point aléatoire.

On prend comme exemple les matrices de la page [[freivalds]], dans $\F_{97}$ :

$$
X = \begin{pmatrix} 2 & 3 \\ 1 & 4 \end{pmatrix}
\qquad
W = \begin{pmatrix} 5 & 1 \\ 2 & 6 \end{pmatrix}
\qquad
Y = XW = \begin{pmatrix} 16 & 20 \\ 13 & 25 \end{pmatrix}
$$

Chaque indice n'a qu'un bit, donc $z$ et $z'$ sont des nombres, et $\eq(z, i)$ vaut $1 - z$ pour $i = 0$ et $z$ pour $i = 1$. On prend $z = 7$ et $z' = 10$.

:::exercice ★
Calculez $\eq(7, \cdot)$, $\eq(10, \cdot)$, puis $\tilde Y(7, 10)$ dans $\F_{97}$.
:::reponse
$\eq(7, \cdot) = (1 - 7, 7) = (-6, 7)$ et $\eq(10, \cdot) = (-9, 10)$. Puis :

$$
\begin{aligned}
\tilde Y(7, 10) &= (-6)(-9) \cdot 16 + (-6) \cdot 10 \cdot 20 + 7 \cdot (-9) \cdot 13 + 7 \cdot 10 \cdot 25 \\
&= 864 - 1\,200 - 819 + 1\,750 = 595 \equiv 13
\end{aligned}
$$
:::
:::

:::exercice ★★★
Pourquoi le vérifieur ne peut-il pas prendre $z$ et $z'$ dans $\{0, 1\}$ ? Donnez une triche qui passe alors, puis bornez la probabilité qu'une matrice fausse passe quand $z$ et $z'$ sont tirés dans tout le corps.
:::reponse
Pour $z, z' \in \{0, 1\}$, un seul poids $\eq(z, i)\, \eq(z', j)$ est non nul, celui de l'entrée $(z, z')$, donc $\tilde Y(z, z') = Y_{zz'}$ : le contrôle lit une seule entrée. Un prouveur qui annonce $Y'$, égale à $Y$ sauf $Y'_{11} = 24$, passe dès que le vérifieur choisit un autre coin, soit 3 fois sur 4.

Avec $z$ et $z'$ dans tout le corps, la différence vaut :

$$\tilde Y'(z, z') - \tilde Y(z, z') = (24 - 25)\, \eq(z, 1)\, \eq(z', 1) = -z z'$$

Elle s'annule seulement si $z = 0$ ou $z' = 0$, soit $97 + 97 - 1 = 193$ points sur $97^2 = 9\,409$, environ $2/97$.

En général, si $Y' \neq Y$, la différence $\tilde Y' - \tilde Y$ est un polynôme non nul de degré au plus 1 en chacune des $\log_2 m + \log_2 \ell$ variables de $z$ et $z'$, donc de degré total au plus $\log_2 m + \log_2 \ell$. Il s'annule donc en une fraction au plus $(\log_2 m + \log_2 \ell)/|\F|$ des points du corps où l'on tire $z$ et $z'$ ([[schwartz-zippel]]). Ici, avec deux variables et des points pris dans $\F_{97}$, la borne vaut $2/97$.
:::
:::

## Le produit devient une somme sur l'indice intérieur

Le vérifieur n'a pas $Y$, donc il ne peut pas calculer $\tilde Y(z, z')$ lui-même. Il n'a que des affirmations sur $X$ et sur $W$, et il faut donc écrire $\tilde Y(z, z')$ avec $X$ et $W$.

:::exercice ★★
Remplacez $Y_{ij}$ par $\sum_k X_{ik} W_{kj}$ dans $\tilde Y(z, z')$, et regroupez les termes pour montrer que :

$$\tilde Y(z, z') = \sum_k \tilde X(z, k)\, \tilde W(k, z')$$
:::reponse
On remplace, puis on échange l'ordre des sommes, qui sont finies :

$$
\begin{aligned}
\tilde Y(z, z') &= \sum_{i, j} \eq(z, i)\, \eq(z', j) \sum_k X_{ik} W_{kj} \\
&= \sum_k \Big( \sum_i \eq(z, i)\, X_{ik} \Big) \Big( \sum_j W_{kj}\, \eq(z', j) \Big) \\
&= \sum_k \tilde X(z, k)\, \tilde W(k, z')
\end{aligned}
$$

La première parenthèse ne dépend que de $i$ et $k$, la seconde que de $k$ et $j$, ce qui permet de séparer les deux sommes. C'est l'égalité de Freivalds $u^\top Y v = (u^\top X)(Wv)$, écrite entrée par entrée.
:::
:::

$\tilde X(z, \cdot)$ est la ligne qu'on obtient en pliant les lignes de $X$ au point $z$, et $\tilde W(\cdot, z')$ la colonne qu'on obtient en pliant les colonnes de $W$ au point $z'$. La valeur cherchée est leur produit scalaire, une somme de $n$ produits.

Cette somme a la forme qu'un sumcheck vérifie. Les deux facteurs sont multilinéaires en les bits de $k$ : en remplaçant $k$ par un point $r$, $\tilde X(z, r)$ est l'extension multilinéaire de $X$ au point $(z, r)$, et $\tilde W(r, z')$ celle de $W$ au point $(r, z')$. La somme porte donc sur $\{0, 1\}^{\log_2 n}$ et sur le produit de deux fonctions multilinéaires, comme le total du reçu au chapitre [[sommes]] :

- le sumcheck a $\log_2 n$ tours, un par bit de l'indice intérieur ;
- le polynôme de chaque tour est de degré 2, le produit de deux droites ;
- après le dernier tour, avec les défis $r = (r_1, \dots, r_{\log_2 n})$, il reste à contrôler que la dernière affirmation vaut $\tilde X(z, r)\, \tilde W(r, z')$.

Le sumcheck ne contrôle pas les deux valeurs finales : il les laisse comme deux **affirmations**, l'une sur $X$ au point $(z, r)$, l'autre sur $W$ au point $(r, z')$. Chacune est contrôlée là où sa matrice est engagée.

:::exercice ★
$X$ a $2^{10}$ lignes et $2^{12}$ colonnes, et $W$ a $2^{12}$ lignes et $2^{11}$ colonnes. Combien le sumcheck a-t-il de tours, et de quel degré ? Combien de nombres le prouveur envoie-t-il ?
:::reponse
La somme porte sur l'indice intérieur, qui a $2^{12}$ valeurs, donc il y a 12 tours de degré 2. Chaque polynôme a 3 coefficients, soit $3 \times 12 = 36$ nombres, ou 24 si le prouveur n'envoie pas le coefficient que fixe l'équation du tour ([[sumcheck]]). S'y ajoutent les deux affirmations finales. Les tailles $2^{10}$ et $2^{11}$ ne changent pas le nombre de tours : elles ne fixent que la taille des points $z$ et $z'$.
:::
:::

## L'exemple $2 \times 2$

Dans l'exemple, l'indice intérieur $k$ a un seul bit, donc le sumcheck a un seul tour. Le polynôme du tour laisse $k$ libre :

$$g(K) = \tilde X(7, K)\, \tilde W(K, 10)$$

Le vérifieur contrôle $g(0) + g(1) = 13$, tire un défi, ici 3, et doit alors contrôler $g(3) = \tilde X(7, 3)\, \tilde W(3, 10)$.

:::exercice ★★
Calculez $\tilde X(7, \cdot)$ et $\tilde W(\cdot, 10)$, puis $g$, et contrôlez $g(0) + g(1)$. Calculez ensuite $\tilde X(7, 3)$, $\tilde W(3, 10)$ et $g(3)$.
:::reponse
On plie les lignes de $X$ avec $(-6, 7)$ et les colonnes de $W$ avec $(-9, 10)$ :

$$
\begin{aligned}
\tilde X(7, 0) &= -6 \cdot 2 + 7 \cdot 1 = -5 & \tilde X(7, 1) &= -6 \cdot 3 + 7 \cdot 4 = 10 \\
\tilde W(0, 10) &= 5 \cdot (-9) + 1 \cdot 10 = -35 & \tilde W(1, 10) &= 2 \cdot (-9) + 6 \cdot 10 = 42
\end{aligned}
$$

Chaque facteur est la droite qui passe par ses deux valeurs, donc :

$$g(K) = (-5 + 15K)(-35 + 77K) = 175 - 910K + 1\,155K^2 \equiv 78 + 60K + 88K^2$$

$g(0) = 78$ et $g(1) = 78 + 60 + 88 = 226 \equiv 32$, de somme $110 \equiv 13$ : le contrôle passe.

Au défi 3 : $\tilde X(7, 3) = -5 + 45 = 40$ et $\tilde W(3, 10) = -35 + 231 = 196 \equiv 2$. Et $g(3) = 78 + 180 + 792 = 1\,050 \equiv 80 = 40 \times 2$.
:::
:::

Le vérifieur repart avec deux affirmations, $\tilde X(7, 3) = 40$ et $\tilde W(3, 10) = 2$, dont le produit vaut $g(3) = 80$. Il n'a calculé aucune entrée de $Y$.

## Une matrice par un vecteur

Quand $W$ est un vecteur colonne $a$, il n'y a plus d'indice de colonne, ni de point $z'$. La même dérivation donne :

$$\tilde Y(z) = \sum_k \tilde X(z, k)\, \tilde a(k)$$

C'est le cas des couches du [[reseau|petit réseau]], où le chapitre [[matrices]] déroule ce sumcheck sur $y = W_2 a$.

## Ce que le prouveur calcule

Le prouveur plie les lignes de $X$, ce qui coûte $m n$ multiplications, et les colonnes de $W$, ce qui en coûte $n \ell$. Chaque tour du sumcheck travaille ensuite sur deux vecteurs de longueur $n$, puis $n/2$, et ainsi de suite. $Y$ n'apparaît à aucune étape : la preuve ne le contient pas, le prouveur ne s'engage pas sur lui, et le calcul de la preuve n'en a pas besoin. Former $Y$ coûterait $m n \ell$ multiplications, soit $n^3$ pour des matrices carrées, contre de l'ordre de $n^2$ pour les deux pliages. Le vérifieur, lui, fait $O(\log n)$ opérations et garde deux affirmations.

Le prouveur connaît $Y$, puisqu'il a fait le calcul, mais il n'en annonce que des valeurs de $\tilde Y$ en des points aléatoires.

## Plusieurs produits, un seul sumcheck

Le vérifieur a souvent plusieurs produits à contrôler, par exemple deux affirmations $\tilde Y_1(z_1, z_1') = c_1$ et $\tilde Y_2(z_2, z_2') = c_2$, avec la même longueur intérieure $n$. Il tire un défi $\chi$ et les regroupe en une seule affirmation, $c_1 + \chi c_2$ ([[horner]]). Chaque valeur s'écrit comme une somme sur $k$, donc leur combinaison aussi :

$$c_1 + \chi c_2 = \sum_k \Big[ \tilde X_1(z_1, k)\, \tilde W_1(k, z_1') + \chi\, \tilde X_2(z_2, k)\, \tilde W_2(k, z_2') \Big]$$

Le terme entre crochets est encore de degré 2 en chaque bit de $k$, donc un seul sumcheck de $\log_2 n$ tours suffit, au lieu de deux. À la fin, les quatre affirmations portent toutes sur le même point $r$ de l'indice intérieur. Soient $t_1$ et $t_2$ les vraies valeurs. Si $c_1$ ou $c_2$ est faux, l'écart $(c_1 - t_1) + \chi (c_2 - t_2)$ est un polynôme non nul de degré au plus 1 en $\chi$, qui s'annule pour au plus une valeur de $\chi$. La combinaison n'est donc juste que pour au plus une valeur de $\chi$.

:::exercice ★★
On regroupe le produit $XW$ de l'exemple et le produit $X^\top W^\top$, aux mêmes points $z = 7$ et $z' = 10$, avec $\chi = 2$. Écrivez la somme sur $k$ et calculez sa valeur annoncée.
:::reponse
La somme est :

$$\sum_k \Big[ \tilde X(7, k)\, \tilde W(k, 10) + 2\, \widetilde{X^\top}(7, k)\, \widetilde{W^\top}(k, 10) \Big]$$

Le second produit vaut $X^\top W^\top = (WX)^\top$. On calcule :

$$
WX = \begin{pmatrix} 11 & 19 \\ 10 & 30 \end{pmatrix}
\qquad
(WX)^\top = \begin{pmatrix} 11 & 10 \\ 19 & 30 \end{pmatrix}
$$

Avec les poids $\eq(7, i)\, \eq(10, j)$ de l'exercice 1, soit $54$, $-60$, $-63$ et $70$ :

$$\widetilde{(WX)^\top}(7, 10) = 54 \cdot 11 - 60 \cdot 10 - 63 \cdot 19 + 70 \cdot 30 = 897 \equiv 24$$

La valeur annoncée vaut $\tilde Y(7, 10) + 2 \times 24 = 13 + 48 = 61$.
:::
:::

Ce procédé vient de Thaler (arXiv:1304.3812, §8.2.2, lemme 5), que FlashProve cite pour prouver un produit de matrices par un sumcheck sur l'indice intérieur, avec zkLLM (arXiv:2404.16109, §6.1.1 et §6.2) pour son emploi sur des poids engagés (`PUBLISHED-WORKS.md`, ligne « Thaler … section 8.2.2 »).

:::piege
**Sommer sur le mauvais indice.** La somme porte sur l'indice intérieur $k$, celui que $X$ et $W$ partagent. Les indices de ligne et de colonne de $Y$ sont fixés par les points $z$ et $z'$, et ne font pas partie du sumcheck.
:::

:::piege
**Croire que le vérifieur doit connaître $Y$.** Il ne reçoit jamais $Y$. La valeur annoncée $\tilde Y(z, z')$ vient d'ailleurs dans la preuve, et le sumcheck la ramène à une affirmation sur $X$ et une sur $W$.
:::

## Dans FlashProve

Dans un segment de FlashProve, les vecteurs aléatoires sont les poids d'égalité du point de clé d'un [[lookups|lookup]] : $\eq(z_t, \cdot)$ sur les tokens, à gauche, et $ew$ sur les sorties, à droite (format 11.2, « The weights »). Les produits scalaires d'un segment sont placés côte à côte en « panels » et prouvés par un seul sumcheck de $\lambda_S$ tours simples de degré 2 (format 11.2, « The panels of step 11 »), avec $\lambda_S = 23$ dans l'exemple à pleine taille (format 11.2, première moitié, `target_full_f2`). Chaque panel laisse un facteur lu dans les cellules et une affirmation sur les poids, FA et FB. On peut lire ce sumcheck comme le test $u^\top (XW) v = (u^\top X)(Wv)$ de cette page, mais FlashProve ne cite pas Freivalds pour ses produits : cette lecture est celle du cours (D2 §2.2).
