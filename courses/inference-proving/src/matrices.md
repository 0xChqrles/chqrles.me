---
id: matrices
---
Le chapitre [[sommes]] a vérifié le total du reçu, une somme de produits, avec un sumcheck. On quitte maintenant le reçu pour le réseau du cours. On voit d'abord comment un réseau qui calcule sur des nombres réels se réécrit avec des entiers, puis on fixe le petit réseau qu'on prouvera jusqu'à la fin. Chacune de ses deux couches est le produit d'une matrice de poids par un vecteur, et ce chapitre vérifie ces deux produits avec le sumcheck, sans que le prouveur écrive jamais leur résultat.

## Un réseau en entiers

Un réseau entraîné calcule avec des nombres réels, alors qu'une preuve contrôle des égalités exactes entre éléments d'un corps. On écrit donc chaque réel comme un entier à une échelle fixée $2^s$, et on ramène chaque produit à cette échelle par un arrondi. La page [[virgule-fixe]] construit cette écriture et l'arrondi par décalage de FlashProve :

$$\rq(a, k) = \Big\lfloor \frac{a + 2^{k-1}}{2^k} \Big\rfloor$$

Le réseau du cours, défini sur la page [[reseau]], est écrit en entiers dès le départ. Il prend une entrée publique $x \in \{0, 1, 2, 3\}^4$ et deux matrices de poids à coefficients dans $\{-1, 0, 1\}$, que le prouveur fixe par un engagement :

$$
W_1 = \begin{pmatrix} 0 & 1 & 1 & 1 \\ 0 & -1 & -1 & 1 \\ -1 & 1 & 1 & 0 \\ 1 & 0 & 1 & 1 \end{pmatrix}
\qquad
W_2 = \begin{pmatrix} -1 & 0 & 0 & 1 \\ 1 & 0 & 0 & 1 \\ 0 & 1 & 1 & 1 \\ 0 & 1 & 0 & -1 \end{pmatrix}
$$

Il calcule, dans cet ordre, le produit $h = W_1 x$, l'arrondi $q = \rq(h, 2)$, l'activation $a = \max(q, 0)$, le produit $y = W_2 a$, et la classe $c$, le plus petit indice où $y$ atteint son maximum. Sur l'entrée $x = (2, 1, 3, 1)$ :

$$
\begin{aligned}
h &= (5, -3, 2, 6) & q &= (1, -1, 1, 2) \\
a &= (1, 0, 1, 2) & y &= (1, 3, 3, -2)
\end{aligned}
$$

et $c = 1$. La page [[reseau]] fait faire ce calcul à la main.

## Ce que le vérifieur contrôle

Le vérifieur connaît l'entrée $x$ et la classe annoncée $c$. Il ne connaît pas les poids : le chapitre [[engager]] lui donnera seulement le moyen de contrôler une affirmation sur les poids, une combinaison des poids qui vaut un nombre annoncé. Il ne connaît pas non plus $h$, $q$, $a$ et $y$, et le prouveur ne les envoie pas. Ce chapitre traite les deux produits $h = W_1 x$ et $y = W_2 a$ ; l'arrondi, l'activation et l'argmax sont le sujet du chapitre [[arrondir]].

Le produit $h = W_1 x$ est fait de quatre égalités, une par ligne :

$$h_i = \sum_{k=0}^{3} W_1[i][k]\, x_k \qquad (i = 0, 1, 2, 3)$$

Les contrôler une par une demande les 16 poids. Le chapitre [[hasard]] a montré qu'on peut les contrôler toutes à la fois : on multiplie l'égalité $i$ par un nombre $u_i$ tiré au hasard et on additionne. On obtient une seule égalité, qui est fausse avec une forte probabilité dès qu'une des quatre l'est.

Le chapitre [[sommes]] donne le choix de $u$ qui sert ici. Avec $u_i = \eq(z, i)$ pour un point $z = (z_1, z_2)$ tiré au hasard, la combinaison des $h_i$ est l'extension multilinéaire de $h$ au point $z$ :

$$\sum_{i} \eq(z, i)\, h_i = \tilde h(z)$$

L'indice s'écrit $i = i_1 + 2 i_2$, et la première variable $z_1$ correspond au bit de poids faible $i_1$. Le contrôle de tout le produit se ramène ainsi à celui d'une seule valeur, $\tilde h(z)$. C'est sous cette forme que le prouveur fait ses affirmations sur $h$ et sur $y$ : « $\tilde h(z)$ vaut tant », « $\tilde y(z)$ vaut tant ». Dans la preuve complète, ces affirmations viennent des tables des chapitres 6 et 7, et le chapitre [[prouveur-complet]] les relie. Ici, on les prend comme données.

Pour les calculs à la main, on prend les points dans $\F_{97}$ ; notre prouveur les tire dans l'[[extension]] $\E_{97}$, où un test se trompe beaucoup plus rarement.

:::exercice ★
Le vérifieur prend $z = (1, 0)$. Calculez $\eq(z, i)$ pour $i = 0, \dots, 3$. Que vaut alors $\tilde h(z)$, et quelles erreurs du prouveur ce contrôle laisse-t-il passer ?
:::reponse
Avec $z_1 = 1$, le facteur du premier bit vaut $i_1$ ; avec $z_2 = 0$, celui du second bit vaut $1 - i_2$. Donc $\eq((1, 0), i) = i_1 (1 - i_2)$, qui vaut 1 pour $i = 1$ (bits $i_1 = 1$, $i_2 = 0$) et 0 ailleurs : $\eq((1, 0), \cdot) = (0, 1, 0, 0)$.

Donc $\tilde h(1, 0) = h_1 = -3$. Le contrôle ne porte que sur la sortie 1, et un prouveur qui fausse $h_0$, $h_2$ ou $h_3$ passe à coup sûr. Avec $z$ tiré dans tout le corps, une erreur sur une sortie quelconque change $\tilde h$ en un polynôme différent, de degré au plus 2, qui ne coïncide avec le vrai qu'en une fraction au plus $2/97$ des points ([[schwartz-zippel]]).
:::
:::

## La couche 1 : une entrée publique

On part de $\tilde h(z)$ et on remplace chaque $h_i$ par sa ligne du produit :

$$\tilde h(z) = \sum_i \eq(z, i) \sum_k W_1[i][k]\, x_k$$

Les deux sommes sont finies, donc on peut échanger leur ordre et mettre $x_k$, qui ne dépend pas de $i$, en facteur. C'est l'échange de l'exercice 3 de [[sumcheck-matrices]], fait ici avec une seule colonne, $x$ :

$$\tilde h(z) = \sum_k \Big( \sum_i \eq(z, i)\, W_1[i][k] \Big)\, x_k$$

La parenthèse combine les quatre lignes de $W_1$ avec les poids $\eq(z, i)$ : elle plie la matrice en une seule ligne de quatre nombres. C'est l'extension multilinéaire de la colonne $k$ de $W_1$, lue au point $z$. On la note $\tilde W_1(z, k)$, le premier argument pour les lignes et le second pour les colonnes, et on obtient :

$$\tilde h(z) = \sum_k \tilde W_1(z, k)\, x_k$$

C'est le test du chapitre [[hasard]] avec $u = \eq(z, \cdot)$ : le membre de droite est $\langle u W_1, x \rangle$.

On développe complètement ce membre de droite :

$$\tilde h(z) = \sum_{i, k} \eq(z, i)\, x_k\, W_1[i][k]$$

C'est une combinaison des 16 poids dont les coefficients $\eq(z, i)\, x_k$ sont connus du vérifieur, puisqu'il connaît $z$ et $x$. L'affirmation « $\tilde h(z)$ vaut tant » est donc déjà une affirmation sur les poids : une combinaison connue des poids vaut un nombre annoncé. C'est ce que l'engagement du chapitre [[engager]] sait contrôler, donc la couche 1 n'a pas besoin de sumcheck.

:::exercice ★★
Pour $z = (2, 5)$, calculez $\eq(z, i)$ pour $i = 0, \dots, 3$, puis $\tilde h(z)$ à partir de $h = (5, -3, 2, 6)$. Calculez ensuite $\tilde W_1(z, k)$ pour $k = 0, \dots, 3$, et $\sum_k \tilde W_1(z, k)\, x_k$.
:::reponse
Pour $z = (2, 5)$, le facteur du premier bit vaut $1 - 2 = -1$ si $i_1 = 0$ et $2$ si $i_1 = 1$ ; celui du second bit vaut $1 - 5 = -4$ si $i_2 = 0$ et $5$ si $i_2 = 1$. Donc :

$$\eq(z, \cdot) = \big( (-1)(-4),\ 2 \cdot (-4),\ (-1) \cdot 5,\ 2 \cdot 5 \big) = (4, -8, -5, 10)$$

Puis $\tilde h(z) = 4 \cdot 5 - 8 \cdot (-3) - 5 \cdot 2 + 10 \cdot 6 = 20 + 24 - 10 + 60 = 94$.

$\tilde W_1(z, k)$ combine la colonne $k$ de $W_1$ avec ces poids. Pour $k = 0$, la colonne vaut $(0, 0, -1, 1)$, donc $4 \cdot 0 - 8 \cdot 0 - 5 \cdot (-1) + 10 \cdot 1 = 15$. De même :

$$\tilde W_1(z, \cdot) = (15, 7, 17, 6)$$

Enfin $\sum_k \tilde W_1(z, k)\, x_k = 2 \cdot 15 + 1 \cdot 7 + 3 \cdot 17 + 1 \cdot 6 = 94$ : les deux calculs donnent la même valeur.
:::
:::

## La couche 2 : une entrée cachée

La même dérivation, pour $y = W_2 a$, donne :

$$\tilde y(z) = \sum_k \tilde W_2(z, k)\, a_k$$

Mais $a$ n'est pas public : le vérifieur ne voit jamais la couche cachée. Les coefficients $\eq(z, i)\, a_k$ lui sont inconnus, et le membre de droite n'est plus une combinaison connue des poids. C'est une somme sur $k$ du produit de deux colonnes qu'il ne connaît pas, $\tilde W_2(z, \cdot)$ et $a$, comme le total du reçu $\sum_i p_i q_i$. On la vérifie donc par un sumcheck, celui de la page [[sumcheck-matrices]].

Pour le dérouler, il faut lire chaque colonne en un point qui n'est pas un coin. Le vecteur $a$ a son extension multilinéaire $\tilde a$. La ligne $\tilde W_2(z, \cdot)$ en a une aussi, $\tilde W_2(z, r) = \sum_{i, k} \eq(z, i)\, \eq(r, k)\, W_2[i][k]$, qui est l'extension de la matrice en ses deux indices. La somme à vérifier est donc :

$$\tilde y(z) = \sum_{k \in \{0, 1\}^2} \tilde W_2(z, k)\, \tilde a(k)$$

L'indice intérieur $k$ a 2 bits, donc le sumcheck a 2 tours. Chaque terme est le produit de deux fonctions de degré 1 en chaque bit de $k$, donc le polynôme de chaque tour est de degré 2. À la fin, avec les défis $r = (r_1, r_2)$, il laisse deux affirmations : $\tilde W_2(z, r)$ sur les poids, qui part vers l'engagement comme celle de la couche 1, et $\tilde a(r)$ sur la couche cachée, que la preuve complète contrôle avec les autres valeurs cachées ([[prouveur-complet]]).

:::exercice ★★
Pour $z = (2, 5)$, calculez $\tilde W_2(z, \cdot)$, puis $\tilde y(z)$ de deux façons : à partir de $y = (1, 3, 3, -2)$, et comme $\sum_k \tilde W_2(z, k)\, a_k$ avec $a = (1, 0, 1, 2)$. Réduisez le résultat modulo 97.
:::reponse
Avec $\eq(z, \cdot) = (4, -8, -5, 10)$ de l'exercice 2, la colonne $k = 0$ de $W_2$, $(-1, 1, 0, 0)$, donne $-4 - 8 = -12$. De même :

$$\tilde W_2(z, \cdot) = (-12, 5, -5, -19)$$

À partir de $y$ : $\tilde y(z) = 4 \cdot 1 - 8 \cdot 3 - 5 \cdot 3 + 10 \cdot (-2) = 4 - 24 - 15 - 20 = -55$.

Par la somme sur $k$ : $-12 \cdot 1 + 5 \cdot 0 - 5 \cdot 1 - 19 \cdot 2 = -12 - 5 - 38 = -55$.

Modulo 97, $-55 \equiv 42$.
:::
:::

:::exercice ★★★
Déroulez le sumcheck de la couche 2 au point $z = (2, 5)$, avec les défis $r_1 = 6$ et $r_2 = 9$, en partant de l'affirmation $\tilde y(z) = 42$. Au premier tour, la variable libre est $k_1$, le bit de poids faible : le polynôme $g_1$ combine la paire $k = 0, 1$ et la paire $k = 2, 3$. Calculez $g_1$, contrôlez $g_1(0) + g_1(1)$, calculez $C_1 = g_1(6)$, pliez les deux colonnes en 6, puis faites le second tour et le contrôle final.
:::reponse
**Tour 1.** Sur chaque paire, chaque colonne est la droite qui passe par ses deux valeurs. Pour la paire $k = 0, 1$ : $\tilde W_2$ va de $-12$ à $5$, soit $-12 + 17K$, et $\tilde a$ va de 1 à 0, soit $1 - K$. Pour la paire $k = 2, 3$ : $-5 - 14K$ et $1 + K$. Donc :

$$
\begin{aligned}
g_1(K) &= (-12 + 17K)(1 - K) + (-5 - 14K)(1 + K) \\
&= (-12 + 29K - 17K^2) + (-5 - 19K - 14K^2) \\
&= -17 + 10K - 31K^2
\end{aligned}
$$

$g_1(0) = -17$ et $g_1(1) = -38$, de somme $-55 \equiv 42$ : le contrôle passe. Puis $C_1 = g_1(6) = -17 + 60 - 1\,116 = -1\,073 \equiv 91$.

**Pliage en 6.** Chaque paire $(f_{2b}, f_{2b+1})$ devient $(1 - 6) f_{2b} + 6 f_{2b+1}$ :

$$
\begin{aligned}
\tilde W_2(z, (6, \cdot)) &= (-5 \cdot (-12) + 6 \cdot 5,\ -5 \cdot (-5) + 6 \cdot (-19)) = (90, -89) \equiv (90, 8) \\
\tilde a(6, \cdot) &= (-5 \cdot 1 + 6 \cdot 0,\ -5 \cdot 1 + 6 \cdot 2) = (-5, 7)
\end{aligned}
$$

**Tour 2.** Il ne reste qu'une paire, donc $g_2$ est le produit des deux droites :

$$g_2(K) = (90 - 82K)(-5 + 12K) = -450 + 1\,490K - 984K^2 \equiv 35 + 35K + 83K^2$$

$g_2(0) = 35$ et $g_2(1) = 35 + 35 + 83 = 153 \equiv 56$, de somme $91 = C_1$ : le contrôle passe. Puis $C_2 = g_2(9) = 35 + 315 + 6\,723 = 7\,073 \equiv 89$.

**Contrôle final.** $\tilde W_2(z, r) = 90 - 82 \cdot 9 = -648 \equiv 31$ et $\tilde a(r) = -5 + 12 \cdot 9 = 103 \equiv 6$. Leur produit vaut $186 \equiv 89 = C_2$.
:::
:::

:::figure Le sumcheck de la couche 2 au point $z = (2, 5)$. Les lignes de $W_2$ se plient d'abord en une seule ligne avec les poids $\eq(z, \cdot)$, puis chaque tour plie cette ligne et $a$ ensemble, en une variable de l'indice intérieur. Le vecteur $y = W_2 a$ n'apparaît à aucune étape.
<svg viewBox="0 0 480 466" role="img" aria-label="En haut, la matrice W₂ en grille 4 × 4, avec à gauche les poids eq(z, i) = 4, −8, −5, 10 et à droite le vecteur a = 1, 0, 1, 2 ; une colonne y en pointillés reste vide : y n’est jamais formé. Plier les lignes avec eq(z, ·) donne la ligne W̃₂(z, ·) = −12, 5, −5, −19, au-dessus de a ; leur somme de produits vaut −55 ≡ 42 = ỹ(z). Le tour 1 plie en r₁ = 6 : 90, 8 et −5, 7, avec C₁ = 91. Le tour 2 plie en r₂ = 9 : 31 et 6, dont le produit 186 ≡ 89 = C₂."><text x="210" y="14" class="b mid">W₂</text><text x="330" y="14" class="b mid">a</text><text x="410" y="14" class="m mid">y</text><text x="132" y="31" class="m s end">eq(z, i)</text><text x="165" y="31" class="m s mid">0</text><text x="195" y="31" class="m s mid">1</text><text x="225" y="31" class="m s mid">2</text><text x="255" y="31" class="m s mid">3</text><text x="132" y="55" class="c end">4</text><rect x="150" y="38" width="30" height="24" class="box"/><text x="165" y="55" class="mid">−1</text><rect x="180" y="38" width="30" height="24" class="box"/><text x="195" y="55" class="mid">0</text><rect x="210" y="38" width="30" height="24" class="box"/><text x="225" y="55" class="mid">0</text><rect x="240" y="38" width="30" height="24" class="box"/><text x="255" y="55" class="mid">1</text><text x="132" y="79" class="c end">−8</text><rect x="150" y="62" width="30" height="24" class="box"/><text x="165" y="79" class="mid">1</text><rect x="180" y="62" width="30" height="24" class="box"/><text x="195" y="79" class="mid">0</text><rect x="210" y="62" width="30" height="24" class="box"/><text x="225" y="79" class="mid">0</text><rect x="240" y="62" width="30" height="24" class="box"/><text x="255" y="79" class="mid">1</text><text x="132" y="103" class="c end">−5</text><rect x="150" y="86" width="30" height="24" class="box"/><text x="165" y="103" class="mid">0</text><rect x="180" y="86" width="30" height="24" class="box"/><text x="195" y="103" class="mid">1</text><rect x="210" y="86" width="30" height="24" class="box"/><text x="225" y="103" class="mid">1</text><rect x="240" y="86" width="30" height="24" class="box"/><text x="255" y="103" class="mid">1</text><text x="132" y="127" class="c end">10</text><rect x="150" y="110" width="30" height="24" class="box"/><text x="165" y="127" class="mid">0</text><rect x="180" y="110" width="30" height="24" class="box"/><text x="195" y="127" class="mid">1</text><rect x="210" y="110" width="30" height="24" class="box"/><text x="225" y="127" class="mid">0</text><rect x="240" y="110" width="30" height="24" class="box"/><text x="255" y="127" class="mid">−1</text><rect x="315" y="38" width="30" height="24" class="dim"/><text x="330" y="55" class="mid">1</text><rect x="315" y="62" width="30" height="24" class="dim"/><text x="330" y="79" class="mid">0</text><rect x="315" y="86" width="30" height="24" class="dim"/><text x="330" y="103" class="mid">1</text><rect x="315" y="110" width="30" height="24" class="dim"/><text x="330" y="127" class="mid">2</text><rect x="380" y="38" width="60" height="96" class="lm dash"/><text x="410" y="82" class="m s mid">jamais</text><text x="410" y="98" class="m s mid">formé</text><line x1="210" y1="140" x2="210" y2="170" class="lc" marker-end="url(#fac)"/><text x="222" y="160" class="c s">plier les lignes avec eq(z, ·)</text><text x="140" y="193" class="b end">W̃₂(z, ·)</text><rect x="150" y="176" width="30" height="24" class="box"/><text x="165" y="193" class="mid">−12</text><rect x="180" y="176" width="30" height="24" class="box"/><text x="195" y="193" class="mid">5</text><rect x="210" y="176" width="30" height="24" class="box"/><text x="225" y="193" class="mid">−5</text><rect x="240" y="176" width="30" height="24" class="box"/><text x="255" y="193" class="mid">−19</text><text x="140" y="223" class="b end">a</text><rect x="150" y="206" width="30" height="24" class="dim"/><text x="165" y="223" class="mid">1</text><rect x="180" y="206" width="30" height="24" class="dim"/><text x="195" y="223" class="mid">0</text><rect x="210" y="206" width="30" height="24" class="dim"/><text x="225" y="223" class="mid">1</text><rect x="240" y="206" width="30" height="24" class="dim"/><text x="255" y="223" class="mid">2</text><text x="286" y="208" class="c">ỹ(z) = −55 ≡ 42</text><line x1="210" y1="236" x2="210" y2="266" class="lc" marker-end="url(#fac)"/><text x="222" y="256" class="c s">tour 1 : plier en r₁ = 6</text><text x="140" y="289" class="b end">W̃₂(z, (6, ·))</text><rect x="150" y="272" width="60" height="24" class="box"/><text x="180" y="289" class="mid">90</text><rect x="210" y="272" width="60" height="24" class="box"/><text x="240" y="289" class="mid">8</text><text x="140" y="319" class="b end">ã(6, ·)</text><rect x="150" y="302" width="60" height="24" class="dim"/><text x="180" y="319" class="mid">−5</text><rect x="210" y="302" width="60" height="24" class="dim"/><text x="240" y="319" class="mid">7</text><text x="286" y="304" class="c">C₁ = g₁(6) ≡ 91</text><line x1="210" y1="332" x2="210" y2="362" class="lc" marker-end="url(#fac)"/><text x="222" y="352" class="c s">tour 2 : plier en r₂ = 9</text><text x="140" y="385" class="b end">W̃₂(z, r)</text><rect x="150" y="368" width="120" height="24" class="ring"/><text x="210" y="385" class="b mid">31</text><text x="140" y="415" class="b end">ã(r)</text><rect x="150" y="398" width="120" height="24" class="ring"/><text x="210" y="415" class="b mid">6</text><text x="286" y="400" class="c">31 × 6 = 186 ≡ 89 = C₂</text><text x="240" y="452" class="m s mid">deux affirmations : 31 sur les poids, 6 sur la couche cachée</text></svg>
:::

Le sumcheck se termine sur deux affirmations : $\tilde W_2((2, 5), (6, 9)) = 31$ sur les poids, et $\tilde a(6, 9) = 6$ sur la couche cachée. Le vérifieur ne sait pas encore si elles sont vraies. La première ira à l'engagement des poids ([[engager]]), et la seconde aux valeurs cachées que la preuve complète contrôle ([[prouveur-complet]]).

## Le produit n'est jamais écrit

Dans les deux couches, le prouveur n'envoie ni $h$ ni $y$. Pour la couche 1, il annonce une valeur, $\tilde h(z)$. Pour la couche 2, il annonce $\tilde y(z)$ et envoie les polynômes des tours, puis les deux valeurs finales. Ses calculs passent par les pliages $\tilde W_1(z, \cdot)$ et $\tilde W_2(z, \cdot)$, puis par les pliages des tours, et le vecteur $y$ n'y figure pas. Les seules affirmations faites sur les produits portent sur leurs extensions, en des points aléatoires.

:::piege
**Confondre le point $z$ et les défis $r$.** Le point $z$ porte sur l'indice des sorties, celui de $h$ et de $y$, et il est fixé avant le sumcheck. Les défis $r$ portent sur l'indice intérieur $k$, celui que $W$ et le vecteur partagent, et le vérifieur les tire un par un pendant le sumcheck. Ils n'ont pas la même longueur en général : pour une matrice $2^{10} \times 2^{12}$, $z$ a 10 coordonnées et $r$ en a 12.
:::

## Deux produits, un seul sumcheck

Le vérifieur a plusieurs affirmations à traiter, par exemple $\tilde y(z)$ et $\tilde h(z')$ pour un autre point $z'$. Le chapitre [[hasard]] a montré comment les regrouper avec un défi $\chi$ ([[horner]]).

:::exercice ★★
Écrivez une seule somme sur $k$ dont la valeur est $\tilde y(z) + \chi\, \tilde h(z')$. Combien de tours faut-il pour la vérifier ? Que reste-t-il à contrôler à la fin ?
:::reponse
Chaque valeur est une somme sur le même indice intérieur $k$, donc :

$$\tilde y(z) + \chi\, \tilde h(z') = \sum_{k \in \{0, 1\}^2} \Big[ \tilde W_2(z, k)\, \tilde a(k) + \chi\, \tilde W_1(z', k)\, \tilde x(k) \Big]$$

Chaque terme est le produit de deux fonctions multilinéaires de $k$, donc la somme se vérifie par un seul sumcheck de 2 tours, avec des polynômes de degré 2.

À la fin, au point $r$, il reste $\tilde W_2(z, r)$ et $\tilde W_1(z', r)$ sur les poids, $\tilde a(r)$ sur la couche cachée, et $\tilde x(r)$, que le vérifieur calcule lui-même puisque $x$ est public.
:::
:::

## Notre prouveur et FlashProve

FlashProve prouve les projections d'un vrai modèle de la même façon : il n'écrit jamais leur résultat, et il ramène chaque produit à une affirmation sur les poids.

| | notre réseau | FlashProve |
|---|---|---|
| produits | $4 \times 4$ par un vecteur, 2 couches | les projections de 48 couches, de largeur $d = 5\,120$ (`docs/model.md` §2) |
| le résultat est-il écrit ? | non | non : le produit $A$ n'entre que dans une clé de lookup, et le lookup en lit $\sum_{x, t} \eq(\cdot, x)\, \eq(\cdot, t)\, A(x, t)$, sur les sorties $x$ et les tokens $t$ (format 11.2, « The keys of the lookup of step 1 » ; D2 §2.1) |
| sumcheck | un par produit, 2 tours | tous les produits d'un segment côte à côte, en un sumcheck de 23 tours simples de degré 2 à pleine taille (format 11.2, « The panels of step 11 » ; 23 est la valeur de l'exemple à pleine taille, `target_full_f2`) |
| ce qui reste | $\tilde W_2(z, r)$ et $\tilde a(r)$ | un facteur lu dans les cellules (`U3`) et une affirmation sur les poids, FA et FB (format 11.2) |

## La suite

Les deux produits se ramènent à des affirmations sur les poids et sur la couche cachée. Entre eux, le réseau arrondit, applique l'activation et choisit un maximum, et aucune de ces trois opérations ne s'écrit comme un polynôme de petit degré. Le chapitre [[arrondir]] les ramène à des appartenances à des tables.

:::quiz
1. Pourquoi la couche 1 n'a-t-elle pas besoin de sumcheck ?
2. Que laisse le sumcheck de la couche 2 au vérifieur ?
3. Le prouveur envoie-t-il $y$ ?
4. Combien de tours faut-il pour le produit d'une matrice $4\,096 \times 4\,096$ par un vecteur ?
5. Que vaut $\rq(-3, 2)$ ?
:::reponse Réponses
1. L'entrée $x$ est publique, donc $\tilde h(z) = \sum_{i, k} \eq(z, i)\, x_k\, W_1[i][k]$ est une combinaison des poids à coefficients connus du vérifieur, que l'engagement contrôle directement.
2. Deux affirmations au même point $r$ de l'indice intérieur : une sur les poids, $\tilde W_2(z, r)$, et une sur la couche cachée, $\tilde a(r)$.
3. Non. Il envoie les polynômes des tours et des valeurs en des points aléatoires.
4. 12 : la somme porte sur l'indice intérieur, qui a $4\,096 = 2^{12}$ valeurs.
5. $\lfloor (-3 + 2)/4 \rfloor = \lfloor -0{,}25 \rfloor = -1$.
:::
:::
