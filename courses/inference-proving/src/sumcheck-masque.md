---
id: sumcheck-masque
---
Un [[sumcheck]] convainc le vérifieur qu'une somme vaut $C$, mais chaque polynôme de tour que le prouveur envoie est une somme partielle des données. On veut garder la vérification de la somme sans que ces polynômes montrent quoi que ce soit. Cette page mesure d'abord la fuite sur le sumcheck du reçu. Elle ajoute ensuite à la fonction sommée un polynôme aléatoire, et montre pourquoi il faut un défi pour l'y joindre. Elle construit la forme de ce polynôme, qui fixe le nombre de coefficients aléatoires qu'il lui faut, puis elle refait le sumcheck du reçu, masqué.

Les masques de cette page suivent le principe de [[zero-knowledge]] : on ajoute à ce que lit le vérifieur un aléa que le prouveur garde secret et qui laisse passer les contrôles.

## Ce que montrent les tours

On reprend le sumcheck du reçu dans $\F_{97}$ ([[sumcheck]]). La fonction sommée est $F(x) = \tilde p(x)\, \tilde q(x)$ sur deux variables, avec $x_1$ le bit de poids faible de l'indice de ligne, et la somme annoncée vaut $C = 244 \equiv 50$. Le prouveur envoie $g_1(X) = 71 + 45X + 57X^2$, reçoit $r_1 = 5$, envoie $g_2(X) = 25 + 74X + 45X^2$ et reçoit $r_2 = 3$.

:::exercice ★
Que valent $g_1(0)$ et $g_1(1)$ ? De quelles lignes du reçu sont-ils la somme des montants ?
:::reponse
$g_1(0) = 71$ et $g_1(1) = 71 + 45 + 57 = 173 \equiv 76$. Le polynôme du premier tour fixe $x_1$ et somme sur $x_2$, donc $g_1(0)$ somme les lignes d'indice pair, 0 et 2 : $135 + 33 = 168 \equiv 71$. $g_1(1)$ somme les lignes 1 et 3 : $63 + 13 = 76$.
:::
:::

Le vérifieur apprend donc le total des lignes paires, alors que l'énoncé ne lui donne que le total. Le tour suivant montre $g_2(X) = \tilde p(5, X)\, \tilde q(5, X)$, un produit de combinaisons des prix et des quantités où la première variable vaut le défi. En général, le polynôme du tour $j$ est une somme de $F$ où les $j - 1$ premières variables valent les défis : chaque tour montre une nouvelle combinaison des données.

## Ajouter un polynôme aléatoire

Le sumcheck ne contrôle qu'une somme, et la somme de deux fonctions est la somme de leurs sommes. On peut donc ajouter à $F$ une fonction aléatoire dont on connaît la somme. Le prouveur tire un polynôme aléatoire $U$ en les mêmes variables, s'engage sur lui et annonce sa somme sur le cube :

$$\sigma = \sum_{x \in \{0,1\}^k} U(x)$$

Un premier essai fait tourner le sumcheck sur $H = U + F$, de somme annoncée $\sigma + C$.

:::exercice ★★
Dans ce premier essai, montrez qu'un prouveur peut faire accepter une fausse somme $C' \neq C$.
:::reponse
$\sigma$ est une affirmation, que le vérifieur ne contrôle jamais seule. Le prouveur annonce

$$\sigma = \sum_x U(x) + C - C'$$

Alors $\sigma + C' = \sum_x U(x) + C$, qui est la vraie somme de $H$. Il fait ensuite tourner honnêtement le sumcheck de $H$ jusqu'au bout, et chaque contrôle passe.
:::
:::

Il faut donc que l'écart entre $C$ et $C'$ ne puisse pas se compenser dans $\sigma$. On joint $F$ par un **défi** $\varepsilon$, tiré après l'annonce de $\sigma$, et le sumcheck porte sur :

$$H = U + \varepsilon F, \qquad \text{de somme annoncée } \sigma + \varepsilon C$$

Le tricheur de l'exercice doit maintenant avoir annoncé un $\sigma$ tel que $\sigma + \varepsilon C'$ soit la vraie somme de $H$, c'est-à-dire :

$$\sigma - \sum_x U(x) = \varepsilon\,(C - C')$$

Le membre de gauche est fixé avant le tirage de $\varepsilon$, et $C - C' \neq 0$, donc un seul $\varepsilon$ convient. Le tricheur gagne avec une probabilité de 1 sur le nombre de valeurs possibles de $\varepsilon$ ; sinon la somme annoncée de $H$ est fausse, et le sumcheck de $H$ la rejette comme toute somme fausse, sauf avec sa probabilité d'erreur habituelle ([[sumcheck]]).

## Ce que montrent les tours masqués

La somme partielle est linéaire, donc le polynôme du tour $j$ de $H$ est celui de $U$ plus $\varepsilon$ fois celui de $F$ :

$$h_j = u_j + \varepsilon\, g_j$$

Si un coefficient de $u_j$ est uniforme et indépendant de tout ce que le vérifieur a déjà lu, le même coefficient de $h_j$ l'est aussi, quel que soit $g_j$, puisque lui ajouter un nombre fixé est une translation. Une seule relation échappe à cet argument : $h_j(0) + h_j(1)$ doit valoir l'affirmation courante, que le vérifieur connaît déjà. Pour un polynôme de degré 2, cette relation fixe un coefficient à partir des deux autres. Il faut donc que, dans chaque tour, deux coefficients de $u_j$ soient uniformes et neufs.

## La forme du polynôme masquant

On cherche un $U$ qui apporte deux coefficients neufs à chaque tour, et pas plus de coefficients qu'il n'en faut. Dans le tour $l$, les variables d'avant valent les défis, $X_l$ est la variable du tour, et les variables d'après sont sommées sur $\{0, 1\}$. On veut un terme qui ajoute $a_l X + b_l X^2$ au polynôme du tour $l$, avec $a_l$ et $b_l$ aléatoires. Le produit $\prod_{j>l} X_j$ vaut 1 en un seul point du cube des variables d'après, celui où elles valent toutes 1, et 0 ailleurs : sa somme vaut 1. D'où la forme suivante, à laquelle on ajoute une constante $w$ :

$$U(X_1, \dots, X_k) = w + \sum_{l=1}^{k} \big(a_l X_l + b_l X_l^2\big) \prod_{j>l} X_j$$

:::exercice ★★
Pour $k = 2$, $U = w + (a_1 X_1 + b_1 X_1^2)\, X_2 + (a_2 X_2 + b_2 X_2^2)$. Calculez $\sigma$, le polynôme du tour 1 de $U$, $U(X, 0) + U(X, 1)$, et celui du tour 2, $U(r_1, X)$.
:::reponse
Aux quatre coins, $U(0,0) = w$, $U(1,0) = w$, $U(0,1) = w + a_2 + b_2$ et $U(1,1) = w + a_1 + b_1 + a_2 + b_2$, donc :

$$\sigma = 4w + a_1 + b_1 + 2a_2 + 2b_2$$

Les deux tours valent :

$$
\begin{aligned}
U(X, 0) + U(X, 1) &= (2w + a_2 + b_2) + a_1 X + b_1 X^2 \\
U(r_1, X) &= w + (a_1 r_1 + b_1 r_1^2 + a_2)\, X + b_2 X^2
\end{aligned}
$$
:::
:::

On en déduit la règle pour $k$ quelconque. Dans le tour $l$, le coefficient de $X^2$ vaut $b_l$, et celui de $X$ vaut $a_l$ plus des termes des tours précédents, déjà tirés. Les termes $l' < l$ contiennent $X_l$ au premier degré, dans leur produit : ils ne touchent que le coefficient de $X$, avec des $a_{l'}$ et des $b_{l'}$ déjà montrés. Les termes $l' > l$ et $w$ ne contiennent pas $X_l$ : ils ne touchent que la constante. Le polynôme de chaque tour contient donc deux coefficients neufs, $a_l$ et $b_l$.

Il reste à justifier $w$. Le vérifieur lit aussi $\sigma$, qui contient les $a_l$ et les $b_l$. Sans $w$, $\sigma$ serait une combinaison fixée de coefficients que les tours montrent aussi.

:::exercice ★★★
Le vérifieur lit $\sigma$ et, à chaque tour, les deux coefficients que la relation ne fixe pas : $2k + 1$ nombres. Chacun vaut une combinaison linéaire des coefficients de $U$, à coefficients connus du vérifieur, plus $\varepsilon$ fois un nombre calculé à partir des données ($\sigma$ n'a pas de partie données). Montrez que si $U$ avait moins de $2k + 1$ coefficients aléatoires, une combinaison de ces nombres ne dépendrait plus de $U$. Que montrerait-elle ? Pourquoi les $2k + 1$ coefficients $w, a_l, b_l$ suffisent-ils ?
:::reponse
Les parties en $U$ sont $2k + 1$ formes linéaires en moins de $2k + 1$ inconnues, donc elles sont liées : il existe des nombres $\mu_i$, non tous nuls, tels que $\sum_i \mu_i \cdot (\text{partie en } U)_i = 0$. La même combinaison des nombres lus vaut alors $\varepsilon \sum_i \mu_i \cdot (\text{partie données})_i$. Le vérifieur connaît $\varepsilon$ et les $\mu_i$, donc il calcule $\sum_i \mu_i \cdot (\text{partie données})_i$, un nombre qui ne dépend que des données et des défis : la fuite revient.

Avec $w$, $a_l$ et $b_l$, on range les nombres lus dans cet ordre : les deux coefficients du tour 1, ceux du tour 2, et ainsi de suite, puis $\sigma$. Chacun contient un coefficient de $U$ qu'aucun nombre rangé avant lui ne contient : le coefficient de $X^2$ du tour $l$ contient $b_l$ avec le facteur 1, celui de $X$ contient $a_l$ avec le facteur 1, et $\sigma$ contient $w$ avec le facteur $2^k$, non nul dans $\F_{97}$. Le système qui envoie les $2k + 1$ coefficients de $U$ sur les $2k + 1$ nombres lus est donc triangulaire, avec des facteurs non nuls sur la diagonale : on retrouve les coefficients un par un, à partir des nombres, donc c'est une bijection. Comme pour la queue de [[zero-knowledge]], les $2k + 1$ nombres sont uniformes ensemble, quelles que soient les données.
:::
:::

FlashProve utilise exactement cette forme pour le pliage de son test de proximité (`docs/format/toys/1-product.md`, Part 3 §2.1).

:::exercice ★
Combien de coefficients a $U$ pour un sumcheck de $k = 23$ variables ?
:::reponse
$2 \times 23 + 1 = 47$. Un sumcheck de $2^{23}$ termes se masque donc avec 47 nombres aléatoires.
:::
:::

## La fin du sumcheck

Après le dernier tour, l'affirmation porte sur $H(r) = U(r) + \varepsilon F(r)$, au point $r = (r_1, \dots, r_k)$ des défis. $F(r)$ se ramène à des affirmations sur les données engagées, comme à la fin d'un sumcheck ordinaire. $U(r)$ n'est pas envoyé : il devient une affirmation sur le polynôme masquant, que le prouveur a engagé avant $\varepsilon$, et le [[test-proximite|test de proximité]] la contrôle avec les autres. Les valeurs de fin des données demandent elles aussi un masque ; FlashProve ajoute pour cela une variable, décrite plus bas.

## Le reçu masqué

On masque le sumcheck du reçu avec $U = 3 + (X_1 + 4X_1^2)\, X_2 + (X_2 + 5X_2^2)$, c'est-à-dire $w = 3$, $(a_1, b_1) = (1, 4)$ et $(a_2, b_2) = (1, 5)$, et avec $\varepsilon = 2$. Les défis restent $r_1 = 5$ et $r_2 = 3$.

:::exercice ★★
Calculez $U$ aux quatre coins, $\sigma$ et l'affirmation de départ $\sigma + \varepsilon C$. Calculez ensuite $h_1(X) = U(X, 0) + U(X, 1) + 2\, g_1(X)$, vérifiez $h_1(0) + h_1(1)$, et calculez $C_1 = h_1(5)$.
:::reponse
Aux coins, $U(0,0) = 3$, $U(1,0) = 3$, $U(0,1) = 3 + 1 + 5 = 9$ et $U(1,1) = 3 + 5 + 6 = 14$, donc $\sigma = 29$. L'affirmation de départ vaut $29 + 2 \times 50 = 129 \equiv 32$.

La partie de $U$ vaut $3 + (9 + X + 4X^2) = 12 + X + 4X^2$, et $2\, g_1(X) = 142 + 90X + 114X^2$. Donc :

$$h_1(X) = 154 + 91X + 118X^2 \equiv 57 + 91X + 21X^2$$

Le contrôle donne $h_1(0) + h_1(1) = 57 + 169 = 226 \equiv 32$, l'affirmation de départ. Enfin $C_1 = 57 + 455 + 525 = 1037 \equiv 67$.
:::
:::

Le vérifieur a lu $h_1(0) = 57$ au lieu de $g_1(0) = 71$, le total des lignes paires. Le tour 2 suit de même, avec $U(5, X) = 3 + 106X + 5X^2 \equiv 3 + 9X + 5X^2$ et $2\, g_2(X) \equiv 50 + 51X + 90X^2$ :

$$
\begin{aligned}
h_2(X) &= 53 + 60X + 95X^2 \\
h_2(0) + h_2(1) &= 261 \equiv 67 = C_1 \\
C_2 = h_2(3) &= 1088 \equiv 21
\end{aligned}
$$

:::exercice ★
Vérifiez la fin : $C_2 = U(5, 3) + 2\, F(5, 3)$, avec $F(5, 3) = \tilde p(5, 3)\, \tilde q(5, 3) = 33 \times 8$. Pourquoi le prouveur n'envoie-t-il pas $U(5, 3)$ en clair ?
:::reponse
$U(5, 3) = 3 + (5 + 100) \times 3 + (3 + 45) = 366 \equiv 75$ et $F(5, 3) = 264 \equiv 70$, donc $75 + 140 = 215 \equiv 21 = C_2$.

Avec $U(5, 3) = 75$ en clair, le vérifieur calculerait $F(5, 3) = (21 - 75)/2 \equiv 70$, la valeur de fin du sumcheck sans masque, qui se calcule à partir des seules données. $U(5, 3)$ reste donc une affirmation sur le polynôme engagé. Pour la même raison, les valeurs $\tilde p(5, 3) = 33$ et $\tilde q(5, 3) = 8$, que le prouveur doit annoncer pour que $F(5, 3)$ devienne des affirmations sur les tables engagées, demandent leur propre masque : c'est la variable $Y$ de FlashProve, à la fin de la page.
:::
:::

## Notre prouveur et FlashProve

Notre prouveur masque chacun de ses sumchecks de cette façon. FlashProve aussi : son bloc PSC fait tourner le sumcheck sur $H = U + \varepsilon(S' + T)$, où $U$ est un polynôme masquant dont la somme est envoyée avant $\varepsilon$, $S'$ la fonction sommée, modifiée comme on va le voir, et $T$ un terme qui porte la somme d'autres masques. Une variable de plus, $Y$, sommée par $Y = 0$ seul, masque les valeurs de fin envoyées : chaque fonction $F_j$ montrée y devient $F_j + c_j Y$, avec $c_j$ un masque, et comme le défi $\beta$ de $Y$ n'est jamais nul, la valeur envoyée $F_j(r) + \beta c_j$ est uniforme, $r$ étant le point des défis des autres variables (`blocks/iop/psc.h`, en-tête). Le code en tire la conclusion de cette page : « The round polynomials of H are uniform among those that pass the checks ».

Le pliage FOLD de son test de proximité range les $2k + 1$ coefficients de $U$ dans un message engagé neuf, et le vérifieur marque ce message comme épuisé : un masque ne sert qu'une fois (`docs/format/toys/1-product.md`, Part 3 §2.1).

:::piege
**Réutiliser un masque.** Au premier tour, deux sumchecks masqués par le même $U$ envoient $u_1 + \varepsilon g_1$ et $u_1 + \varepsilon' g'_1$. Leur différence élimine $u_1$ et montre $\varepsilon g_1 - \varepsilon' g'_1$, une combinaison des données. Chaque sumcheck demande un polynôme masquant neuf.
:::

:::piege
**Oublier l'affirmation sur $U$.** La dernière affirmation est $U(r) + \varepsilon F(r)$. Si personne ne contrôle $U(r)$ contre le polynôme engagé, le prouveur annonce la valeur de $U(r)$ qui fait passer le contrôle final, et le sumcheck ne prouve plus rien.
:::
