---
id: lookups
---
On a $N$ **clés** $K_0, \dots, K_{N-1}$ et une **table** publique de $M$ **lignes** $T_0, \dots, T_{M-1}$, et on veut montrer que chaque clé est une ligne de la table. Le vérifieur ne voit pas les clés, puisqu'elles sont fixées par un engagement, et on veut qu'il ne les lise qu'à travers une seule valeur, calculée en un point tiré au hasard. Une preuve de ce genre s'appelle un **lookup**.

Cette page transforme d'abord « chaque clé est une ligne » en une égalité entre deux listes comptées avec leurs répétitions, puis en une égalité entre deux polynômes, qu'on teste en un point tiré au hasard comme dans [[schwartz-zippel]]. Elle écrit ensuite le côté de la table, où des nombres secrets sont en exposant, comme un produit de facteurs simples. Elle fait la liste de ce qu'il reste alors à prouver, et elle finit par une autre forme de la même identité, celle de LogUp.

## La méthode directe

Le vérifieur pourrait recevoir les $N$ clés et chercher chacune dans la table. Il lirait alors autant de valeurs que le prouveur en a calculé, ce qu'une preuve doit éviter.

Il pourrait aussi vérifier, pour chaque clé, l'équation $\prod_t (K_i - T_t) = 0$. Un produit s'annule exactement quand l'un de ses facteurs est nul, donc cette équation dit que $K_i$ est une ligne. Mais elle a le degré $M$ en $K_i$, soit $65\,536$ pour une table de $2^{16}$ lignes, et un sumcheck sur cette équation enverrait à chaque tour un polynôme de ce degré, donc $M + 1$ coefficients. On cherche donc un test où le vérifieur ne lit qu'une valeur des clés et où chaque contrôle garde un petit degré.

## Compter les clés par ligne

On regarde d'abord les clés comme un **multiensemble**, un ensemble où une valeur peut apparaître plusieurs fois. La **multiplicité** $m_t$ de la ligne $t$ est le nombre de clés égales à $T_t$.

Si chaque clé est une ligne, on peut compter chaque clé à une ligne qu'elle égale. Chaque clé est comptée une fois, donc $\sum_t m_t = N$, et le multiensemble des clés est celui où la ligne $T_t$ apparaît $m_t$ fois. Réciproquement, si les deux multiensembles sont égaux, chaque clé apparaît à droite, où il n'y a que des lignes. On a donc :

> Chaque clé est une ligne si et seulement s'il existe des entiers $m_t \ge 0$, de somme $N$, tels que les clés forment le multiensemble où $T_t$ apparaît $m_t$ fois.

:::exercice ★
La table est $(0, 1, 2, 3)$ et les clés sont $(1, 3, 3, 0)$. Donnez les multiplicités. On remplace la clé 0 par 5 : pourquoi aucun choix de multiplicités ne convient-il ?

:::reponse
La ligne 0 apparaît une fois, la ligne 1 une fois, la ligne 2 jamais et la ligne 3 deux fois, donc $m = (1, 1, 0, 2)$, de somme 4.

Avec les clés $(1, 3, 3, 5)$, la valeur 5 est dans le multiensemble des clés. Le multiensemble de droite ne contient que des lignes, quelles que soient les multiplicités, et 5 n'en est pas une.
:::
:::

## Des multiensembles aux polynômes

Pour comparer deux multiensembles sans les lire, on les écrit comme les racines de deux polynômes :

$$
\begin{aligned}
P_K(X) &= \prod_{i} (X - K_i) \\
P_T(X) &= \prod_{t} (X - T_t)^{m_t}
\end{aligned}
$$

Si les deux multiensembles sont égaux, les deux produits ont les mêmes facteurs, dans un autre ordre, donc $P_K = P_T$. C'est la réciproque qui sert au vérifieur : si $P_K = P_T$, chaque clé doit être une ligne.

:::exercice ★★★
On suppose $P_K = P_T$, avec des coefficients dans un corps. Montrez que chaque clé est une ligne.

*Indice :* évaluez les deux côtés en $K_0$, puis divisez-les par $X - K_0$ et recommencez.

:::reponse
En $X = K_0$, le côté gauche s'annule, puisqu'il contient le facteur $K_0 - K_0$. Le côté droit s'annule donc aussi. Dans un corps, un produit n'est nul que si l'un de ses facteurs est nul, donc il existe une ligne $t$ avec $m_t \ge 1$ et $T_t = K_0$ : la clé $K_0$ est une ligne.

On a alors deux écritures du même polynôme :

$$(X - K_0) \cdot A(X) = (X - K_0) \cdot B(X)$$

où $A$ est le produit des autres facteurs de gauche, et $B$ celui de droite avec $m_t$ diminué de 1. On en déduit $(X - K_0)(A - B) = 0$. Le coefficient dominant d'un produit de deux polynômes non nuls est le produit de leurs coefficients dominants, qui n'est pas nul dans un corps, donc $A - B = 0$ et $A = B$.

On recommence avec $A = B$, qui porte les clés $K_1, \dots, K_{N-1}$. Après $N$ étapes, chaque clé a été trouvée parmi les lignes.
:::
:::

L'exercice montre que des clés qui ne sont pas toutes des lignes donnent un polynôme $P_K$ différent de $P_T$, quelles que soient les multiplicités.

## Tester l'égalité en un point

Le vérifieur ne peut pas comparer $P_K$ et $P_T$ coefficient par coefficient, puisqu'il faudrait connaître les clés. [[schwartz-zippel]] donne une autre façon de faire : on tire $\alpha$ au hasard dans un grand ensemble $S$, en pratique le corps des défis $\E$, et on compare les deux valeurs $P_K(\alpha)$ et $P_T(\alpha)$.

Si $P_K = P_T$, les deux valeurs sont égales pour tout $\alpha$. Sinon, la différence $D = P_K - P_T$ n'est pas nulle, et les deux valeurs ne coïncident que si $\alpha$ est une racine de $D$. Il reste à borner le degré de $D$.

C'est là que sert la condition $\sum_t m_t = N$. Le côté gauche est un produit de $N$ facteurs $X - K_i$, donc il commence par $X^N$. Le côté droit est un produit de $\sum_t m_t = N$ facteurs de la même forme, donc il commence aussi par $X^N$. Les deux termes $X^N$ s'annulent dans la différence, donc $D$ a un degré au plus $N - 1$, et au plus $N - 1$ racines. On en déduit :

$$\Pr\big[P_K(\alpha) = P_T(\alpha)\big] \le \frac{N - 1}{|S|} \quad \text{si une clé n'est pas une ligne}$$

:::exercice ★★
Dans $\F_{97}$, avec la table $(0, 1, 2, 3)$, les clés $(1, 3, 3, 0)$ et $m = (1, 1, 0, 2)$, calculez les deux côtés en $\alpha = 10$. Remplacez ensuite la clé 0 par 5 en gardant les mêmes multiplicités : que vaut le côté gauche, et pour quels $\alpha$ les deux côtés coïncident-ils encore ?

:::reponse
Côté gauche : $9 \cdot 7 \cdot 7 \cdot 10 = 4410 = 45 \cdot 97 + 45$, donc $45$. Côté droit : $10^1 \cdot 9^1 \cdot 8^0 \cdot 7^2 = 4410$, donc $45$ aussi.

Avec la clé 5, le côté gauche vaut $9 \cdot 7 \cdot 7 \cdot 5 = 2205 \equiv 71$, alors que le côté droit vaut toujours 45. Les deux polynômes ont le facteur commun $(X - 1)(X - 3)^2$, donc leur différence vaut :

$$(X - 1)(X - 3)^2 \big[(X - 5) - X\big] = -5\,(X - 1)(X - 3)^2$$

Elle ne s'annule qu'en $\alpha = 1$ et $\alpha = 3$ : deux valeurs sur 97.
:::
:::

Avec d'autres multiplicités, un tricheur peut faire un peu mieux, mais jamais plus de $N - 1 = 3$ coïncidences : le notebook du chapitre les essaie toutes et en trouve au plus 3, atteintes par $m = (0, 0, 4, 0)$. Dans $\F_{97}$, la borne vaut donc $3/97$, et un tricheur passe environ une fois sur 32. C'est pour ça que les défis se tirent dans un grand corps : dans le corps jouet étendu $\E_{97}$, qui a $912\,673$ éléments, la borne vaut $3/912\,673$.

## Tirer $\alpha$ après l'engagement

La borne suppose que $\alpha$ est tiré au hasard **après** que les clés et les multiplicités sont fixées. L'exercice suivant montre ce qui se passe sinon.

:::exercice ★★
Le tricheur connaît d'avance $\alpha = 10$. Il garde les clés 1, 3, 3 et annonce $m = (1, 1, 1, 1)$. Quelle quatrième clé doit-il choisir pour que l'identité passe ? Est-elle dans la table ?

:::reponse
Le côté droit vaut $10 \cdot 9 \cdot 8 \cdot 7 = 5040 = 51 \cdot 97 + 93$, donc 93. Les trois premières clés donnent $9 \cdot 7 \cdot 7 = 441 \equiv 53$. Il faut donc :

$$53 \cdot (10 - K_3) = 93$$

On a $53 \cdot 53 = 2809 = 28 \cdot 97 + 93$, donc $10 - K_3 = 53$ et $K_3 = -43 \equiv 54$. La clé 54 n'est pas une ligne, et l'identité passe en $\alpha = 10$. Avec $\alpha$ connu, une seule équation de degré 1 en la clé libre suffit à tricher, pour n'importe quelles multiplicités.
:::
:::

Le prouveur fixe donc ses clés et ses multiplicités, par un engagement, avant que le vérifieur tire $\alpha$.

## Les multiplicités en exposant

Le côté des clés est un produit de $N$ facteurs $\alpha - K_i$, chacun calculé à partir d'une clé. Le côté de la table pose un problème : dans $(\alpha - T_t)^{m_t}$, la multiplicité $m_t$ est en exposant, et elle est secrète, puisqu'elle dépend des clés. Le vérifieur ne peut pas calculer une puissance dont il ne connaît pas l'exposant.

On écrit donc $m_t$ en binaire, comme dans l'exponentiation rapide. Le **plan** $j$ est le bit $j$ de chaque multiplicité :

$$m_t = \sum_j 2^j\, b_{j,t}, \qquad b_{j,t} \in \{0, 1\}$$

La puissance se coupe alors en un produit, un facteur par bit :

$$(\alpha - T_t)^{m_t} = \prod_j \big((\alpha - T_t)^{b_{j,t}}\big)^{2^j}$$

On fait le produit sur toutes les lignes et on regroupe les facteurs qui ont le même $j$. Comme $(\alpha - T_t)^{b_{j,t}}$ vaut $\alpha - T_t$ quand le bit vaut 1 et 1 sinon, le facteur du plan $j$ est le produit des $\alpha - T_t$ sur les lignes dont le bit $j$ vaut 1 :

$$
\begin{aligned}
\prod_t (\alpha - T_t)^{m_t} &= \prod_j G_j^{2^j} \\
G_j &= \prod_{t \,:\, b_{j,t} = 1} (\alpha - T_t)
\end{aligned}
$$

Il reste à écrire $G_j$ comme un produit sur toutes les lignes, avec un facteur qui dépend du bit.

:::exercice ★
Trouvez une expression **affine** en $b$, c'est-à-dire de la forme $u + v\,b$, qui vaut $\alpha - T$ quand $b = 1$ et $1$ quand $b = 0$.

:::reponse
En $b = 0$ il faut $u = 1$, puis en $b = 1$ il faut $1 + v = \alpha - T$, donc $v = \alpha - 1 - T$ :

$$1 + b\,(\alpha - 1 - T)$$
:::
:::

Chaque $G_j$ est donc le produit des $M$ **feuilles** $1 + b_{j,t}(\alpha - 1 - T_t)$. Une feuille est affine en un bit engagé, comme $\alpha - K_i$ est affine en une clé, donc les deux côtés sont maintenant des produits de valeurs que le vérifieur ne voit pas, et qui sont chacune une fonction affine d'une valeur engagée. FlashProve écrit les feuilles de cette façon (`blocks/iop/lkp.h`, lignes 42 à 84), d'après Bootle et al., ePrint 2018/380, annexe B.5.

:::exercice ★★
Écrivez les plans $b_0$ et $b_1$ pour $m = (1, 1, 0, 2)$ et la table $(0, 1, 2, 3)$, puis $G_0$ et $G_1$ en $\alpha = 10$. Vérifiez que $G_0 G_1^2$ redonne 45.

:::reponse
En binaire, $1 = 01$, $1 = 01$, $0 = 00$ et $2 = 10$, donc $b_0 = (1, 1, 0, 0)$ et $b_1 = (0, 0, 0, 1)$.

$G_0$ prend les lignes 0 et 1 : $G_0 = 10 \cdot 9 = 90$. $G_1$ prend la ligne 3 : $G_1 = 7$. Alors :

$$G_0\, G_1^2 = 90 \cdot 49 = 4410 \equiv 45$$
:::
:::

## Ce qu'il reste à prouver

L'identité $\prod_i (\alpha - K_i) = \prod_j G_j^{2^j}$ ne suffit que si trois autres affirmations sont vraies.

**Les bits sont des bits.** Si un « bit » vaut 2, sa feuille vaut $1 + 2(\alpha - 1 - T) = 2\big(\alpha - (T + 1/2)\big)$ : au facteur 2 près, c'est le facteur d'une ligne $T + 1/2$, qui n'est pas dans la table. On prouve que $b^2 - b$ s'annule sur chaque entrée des plans par un zéro-test ([[sumcheck]]).

**Le compte.** L'argument de degré a utilisé $\sum_t m_t = N$. Avec les bits, cette condition s'écrit :

$$\sum_j 2^j \sum_t b_{j,t} = N$$

C'est une affirmation linéaire sur les plans engagés, à coefficients publics.

:::exercice ★★
Un prouveur annonce $m = (1, 1, 0, 3)$ pour les clés $(1, 3, 3, 0)$. Quelle affirmation échoue ? Sans cette affirmation, que deviendrait la borne d'erreur de la page ?

:::reponse
Le compte : $1 + 1 + 0 + 3 = 5 \ne 4$. En $\alpha = 10$, le côté droit vaut d'ailleurs $10 \cdot 9 \cdot 7^3 = 30\,870 \equiv 24$, et non 45.

Sans le compte, rien ne fixerait le degré du côté droit, qui vaut $\sum_t m_t$. Avec $w$ plans et $M$ lignes, une multiplicité vaut au plus $2^w - 1$, donc ce degré peut aller jusqu'à $M (2^w - 1)$. Les termes de plus haut degré ne s'annuleraient plus, et la différence des deux côtés pourrait avoir ce degré : la borne passerait de $(N - 1)/|S|$ à $M (2^w - 1)/|S|$. Le compte donne aux deux côtés le même degré $N$.
:::
:::

**Les deux produits.** Le vérifieur ne voit ni les clés ni les bits, donc il ne peut calculer ni $\prod_i (\alpha - K_i)$ ni les $G_j$. La page [[gkr]] prouve un produit de valeurs cachées avec des sumchecks. Elle finit par une seule affirmation sur l'extension multilinéaire des feuilles en un point tiré au hasard. Pour le côté des clés, les feuilles valent $\alpha - K_i$, donc cette affirmation porte sur l'extension des clés, et c'est la seule lecture des clés que fait le vérifieur.

:::piege
**Les multiplicités sont des entiers, le compte est vérifié dans le corps.** Le compte tient modulo $p$. Si la somme des multiplicités peut atteindre $p$, une somme de $N + p$ passe le compte, et le côté droit a alors le degré $N + p$. Dans $\F_{97}$, une table de 32 lignes avec 3 plans permet des sommes jusqu'à $32 \times 7 = 224$, au-delà de 97. FlashProve refuse les paramètres où ce cas existe. Ses multiplicités ont 32 bits, donc chacune vaut moins de $2^{32}$, et ses tables réunies ont au plus $2^{d_L}$ lignes : il exige $2^{d_L + 32} < p$, pour que la somme des multiplicités ne fasse pas le tour du corps (`docs/format/11-1-machinery.md`, « Tests on the sizes » ; `blocks/iop/lkp.h`, lignes 83 et 84).
:::

## Plusieurs tables

Un seul lookup peut servir plusieurs tables. On tire d'abord un défi $\theta$, puis on décale les clés et les lignes de la table numéro $c$ de $c\,\theta$, et on cherche toutes les clés dans l'union des tables décalées. Le décalage empêche une clé d'une table de passer pour une ligne d'une autre. Le chapitre [[tables]] montre sur le petit réseau ce qui se passe sans lui.

## L'autre forme : LogUp

Le même multiensemble a une autre empreinte, une somme de fractions. Chaque clé $K_i$ ajoute $1/(\alpha - K_i)$, et les clés égales à $T_t$ ajoutent toutes la même fraction, donc en les regroupant par ligne :

$$\sum_i \frac{1}{\alpha - K_i} = \sum_t \frac{m_t}{\alpha - T_t}$$

C'est l'identité de **LogUp** (Haböck, ePrint 2022/1530). Pour un lecteur qui connaît les dérivées, elle s'obtient en divisant la dérivée de chaque côté de $P_K = P_T$ par ce côté. Les multiplicités y sont des coefficients et non des exposants, donc elles s'engagent comme des éléments du corps, mais chaque terme demande un inverse.

:::exercice ★★
Vérifiez la forme LogUp en $\alpha = 10$ pour les clés $(1, 3, 3, 0)$ et $m = (1, 1, 0, 2)$, avec $1/9 = 54$, $1/7 = 14$ et $1/10 = 68$ dans $\F_{97}$.

:::reponse
À gauche, $1/9 + 1/7 + 1/7 + 1/10 = 54 + 14 + 14 + 68 = 150 \equiv 53$.

À droite, $1/10 + 1/9 + 2/7 = 68 + 54 + 28 = 150 \equiv 53$.
:::
:::

## Dans FlashProve

FlashProve garde les produits et engage les multiplicités en bits, sur 32 plans. Son lookup prouve $Z = a_{pad} \prod_{j < 32} G_j^{2^j}$ (`docs/format/11-1-machinery.md`, « The relation »), où $Z$ est le produit du côté des clés et $a_{pad}$ un facteur public pour les clés de remplissage. Le code distingue lui-même les deux arguments : « There the multiplicities are committed as field elements and the circuit adds fractions. Here they are committed as bits and the trees multiply » (`blocks/iop/lkp.h`, lignes 118 à 121), et `PUBLISHED-WORKS.md` dit de l'argument par dérivées logarithmiques qu'il « is not the argument here » (ligne de Haböck, ePrint 2022/1530).

Les clés ne sont jamais envoyées. Le lookup finit par une affirmation sur l'extension des clés, que l'appelant transforme en affirmation sur ce qu'il a envoyé (`lkp.h`, lignes 17 à 19 ; la source citée aux lignes 122 à 125 est Diamond et Posen, ePrint 2023/1784, §4.1 et §4.4). L'erreur due à $\alpha$ vaut $(2^v - 1)/|\E|$ pour $2^v$ clés (`lkp.h`, ligne 81), la borne $(N - 1)/|S|$ de cette page.

:::piege
**Ce n'est pas LogUp.** LogUp somme des fractions avec des multiplicités dans le corps ; le lookup de FlashProve multiplie avec des multiplicités en bits. Les deux testent le même multiensemble.
:::
