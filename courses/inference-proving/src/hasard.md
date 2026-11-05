---
id: hasard
---
Ce chapitre construit l'idée sur laquelle repose tout le prouveur : pour savoir si deux calculs sont égaux, il suffit souvent de les comparer en un point tiré au hasard. On part d'un test qu'on peut faire à la main, celui de Freivalds, sur la première couche du réseau que le cours prouvera. On le généralise aux polynômes, puis on s'en sert pour regrouper plusieurs affirmations en une seule. On finit par le prix de ce hasard : une probabilité d'erreur, trop grande dans $\F_{97}$ comme dans Goldilocks, et le corps plus grand qui la réduit.

Les calculs se font dans le corps jouet $\F_{97}$ du chapitre [[nombres]].

## Le problème : une couche sans les poids

Le réseau du cours, décrit sur la page [[reseau]], commence par multiplier une matrice de poids $W_1$ par l'entrée $x$. L'entrée est publique. Les poids sont ceux du modèle, et le prouveur ne les montre pas :

$$
W_1 = \begin{pmatrix} 0 & 1 & 1 & 1 \\ 0 & -1 & -1 & 1 \\ -1 & 1 & 1 & 0 \\ 1 & 0 & 1 & 1 \end{pmatrix}
\qquad
x = (2, 1, 3, 1)
$$

Le prouveur annonce le produit $h = W_1 x = (5, -3, 2, 6)$. Chaque coordonnée de $h$ est une équation, une par ligne de $W_1$ :

$$h_i = \sum_{k=0}^{3} W_1[i][k]\, x_k \qquad i = 0, 1, 2, 3$$

Pour contrôler ces quatre équations une par une, le vérifieur doit lire les 16 poids, alors qu'il n'a que $x$ et $h$. Le chapitre [[engager]] lui donnera un moyen d'interroger le prouveur sur les poids, mais chaque réponse sera un seul nombre : une combinaison des poids dont les coefficients dépendent d'un point que le vérifieur choisit. On cherche donc un contrôle des quatre équations qui ne demande qu'une seule combinaison des poids.

## Additionner les équations

On multiplie l'équation $i$ par un nombre $u_i$, puis on additionne les quatre équations. Le côté gauche donne $\langle u, h \rangle$. Le côté droit contient les 16 produits $u_i W_1[i][k] x_k$, qu'on regroupe par colonne $k$ :

$$\langle u, h \rangle = \sum_{i} u_i \sum_k W_1[i][k]\, x_k = \sum_k \Big( \sum_i u_i W_1[i][k] \Big) x_k$$

La parenthèse est la coordonnée $k$ du vecteur ligne $u W_1$, donc l'égalité s'écrit :

$$\langle u, h \rangle = \langle u W_1, x \rangle$$

Le vérifieur calcule le côté gauche avec ce qu'il a. Le côté droit dépend des poids par un seul nombre, $\sum_{i,k} u_i x_k\, W_1[i][k]$, qui est une combinaison des 16 poids dont les coefficients $u_i x_k$ sont connus du vérifieur. Le contrôle est donc le suivant : le vérifieur choisit $u$, demande ce nombre et le compare à $\langle u, h \rangle$.

:::note
Les coefficients $u_i x_k$ n'ont pas toujours la forme que l'engagement du chapitre [[engager]] sait ouvrir. Le chapitre [[matrices]] ajoute l'étape qui ramène ce nombre à une réponse de l'engagement.
:::

:::exercice ★
Calculez $u W_1$ pour $u = (1, 2, 3, 4)$, puis $\langle u W_1, x \rangle$ et $\langle u, h \rangle$.
:::reponse
$u W_1$ est la somme des lignes de $W_1$, la ligne $i$ étant multipliée par $u_i$ :

$$
\begin{aligned}
u W_1 &= 1 \cdot (0, 1, 1, 1) + 2 \cdot (0, -1, -1, 1) + 3 \cdot (-1, 1, 1, 0) + 4 \cdot (1, 0, 1, 1) \\
&= (1, 2, 6, 7)
\end{aligned}
$$

Ensuite :

$$
\begin{aligned}
\langle (1, 2, 6, 7), (2, 1, 3, 1) \rangle &= 2 + 2 + 18 + 7 = 29 \\
\langle (1, 2, 3, 4), (5, -3, 2, 6) \rangle &= 5 - 6 + 6 + 24 = 29
\end{aligned}
$$

Les deux côtés valent 29, et le contrôle passe.
:::
:::

## Ce que le contrôle laisse passer

Quand $h$ est juste, l'égalité tient pour tout $u$, puisqu'on l'a obtenue en additionnant des équations vraies. Le contrôle ne peut donc se tromper que dans un sens : en acceptant un $h$ faux.

Le prouveur annonce par exemple $h' = (5, -3, 2, 7)$, faux sur sa dernière coordonnée. Avec $u = (1, 2, 3, 4)$, $\langle u, h' \rangle = 33$, qui diffère de 29, et le vérifieur rejette. On cherche maintenant les $u$ pour lesquels $h'$ passerait.

:::exercice ★★
Pour quels $u \in \F_{97}^4$ le contrôle accepte-t-il $h'$ ? Avec quelle probabilité, si $u$ est tiré uniformément dans $\F_{97}^4$ ?
:::reponse
Le côté droit, $\langle u W_1, x \rangle$, ne dépend pas de ce que le prouveur annonce : il vaut $\langle u, h \rangle$ pour le vrai $h$. Le contrôle accepte donc $h'$ si et seulement si $\langle u, h' \rangle = \langle u, h \rangle$. La différence vaut :

$$\langle u, h' \rangle - \langle u, h \rangle = \langle u, h' - h \rangle = u_3 (7 - 6) = u_3$$

Le contrôle accepte $h'$ si et seulement si $u_3 = 0$. Parmi les $97^4$ vecteurs, $97^3$ ont $u_3 = 0$, donc la probabilité vaut $97^3 / 97^4 = 1/97$.
:::
:::

La probabilité $1/97$ vient du nombre de valeurs que $u_3$ peut prendre. L'exercice suivant tire $u$ dans un ensemble plus petit.

:::exercice ★
Le vérifieur tire $u$ uniformément dans $\{0, 1\}^4$. Avec quelle probabilité accepte-t-il $h'$ ?
:::reponse
Le calcul de l'exercice 2 reste valable : le contrôle accepte $h'$ si et seulement si $u_3 = 0$. Ici $u_3$ vaut 0 ou 1 avec la même probabilité, donc $h'$ passe avec probabilité $1/2$.
:::
:::

## Pour tout $h$ faux

Le calcul de l'exercice 2 se généralise. Pour un $h'$ quelconque, on pose $e = h' - h$, le vecteur des erreurs du prouveur. La différence des deux côtés vaut $\langle u, e \rangle$, donc le contrôle accepte $h'$ si et seulement si $\langle u, e \rangle = 0$. Si $h'$ est faux, $e$ a au moins une coordonnée non nulle.

:::exercice ★★★
On suppose $e_j \neq 0$. Montrez que, quelles que soient les autres coordonnées $u_k$ ($k \neq j$), une seule valeur de $u_j$ dans $\F_{97}$ donne $\langle u, e \rangle = 0$. Déduisez-en la probabilité qu'un $h'$ faux passe le contrôle.
:::reponse
On fixe les $u_k$ pour $k \neq j$ et on pose $s = \sum_{k \neq j} u_k e_k$. Alors :

$$\langle u, e \rangle = e_j u_j + s$$

Comme $e_j \neq 0$, il a un inverse dans $\F_{97}$, et l'équation $e_j u_j + s = 0$ a une seule solution, $u_j = -s / e_j$. Pour chaque choix des trois autres coordonnées, une seule valeur de $u_j$ sur 97 fait passer $h'$. Tout $h'$ faux passe donc avec probabilité $1/97$ exactement.
:::
:::

Ce contrôle est le test de Freivalds, que la page [[freivalds]] présente sur un produit de deux matrices.

Vu comme une fonction de $u$, $\langle u, e \rangle = e_0 u_0 + e_1 u_1 + e_2 u_2 + e_3 u_3$ est un polynôme de degré 1 en quatre variables. Il est nul partout quand $h$ est juste, et l'exercice 4 montre qu'il s'annule sur une part $1/97$ des points quand $h$ est faux.

Le même raisonnement vaut pour des calculs plus compliqués. Deux calculs différents s'écrivent comme deux polynômes différents, et deux polynômes différents de petit degré coïncident en peu de points. La page [[polynomes]] compte les racines d'un polynôme, et la page [[schwartz-zippel]] en tire la règle que tout le cours utilise : un test en un point tiré au hasard se trompe avec une probabilité d'au plus (degré)/(taille de l'ensemble où l'on tire le point).

## Affirmer, puis tirer

Le calcul de l'exercice 4 suppose que $e$ est fixé avant que $u$ soit tiré. Si le prouveur connaît $u$ à l'avance, il peut choisir $e$ en fonction de $u$.

:::exercice ★★
Le prouveur sait que le vérifieur utilisera $u = (1, 2, 3, 4)$. Trouvez un $h'$ faux que le contrôle accepte.
:::reponse
Il suffit d'une erreur $e \neq 0$ telle que $\langle u, e \rangle = 0$. Avec $e = (2, -1, 0, 0)$, on a $\langle u, e \rangle = 1 \times 2 + 2 \times (-1) = 0$. Le prouveur annonce $h' = h + e = (7, -4, 2, 6)$, et :

$$\langle u, h' \rangle = 7 - 8 + 6 + 24 = 29$$

Le contrôle accepte ce $h'$ faux.
:::
:::

Le vérifieur tire donc son défi après que le prouveur a fixé ce qu'il affirme. Tout le cours suit cette règle, et le chapitre [[prouveur-complet]] la garde quand le défi n'est plus tiré par le vérifieur mais calculé par une fonction de hachage.

:::piege
Tirer $u$ avant que $h$ soit fixé. La borne $1/97$ compte les $u$ qui laissent passer une erreur donnée, et elle ne dit rien d'une erreur choisie après $u$.
:::

## Un seul défi pour toutes les équations

Le contrôle tire quatre nombres pour quatre équations. Une couche plus grande a une équation par coordonnée de sa sortie, et il faudrait autant de défis. On remplace donc $u$ par les puissances d'un seul défi $\chi$ :

$$u = (1, \chi, \chi^2, \chi^3)$$

La différence des deux côtés devient un polynôme en la seule variable $\chi$ :

$$\langle u, e \rangle = e_0 + e_1 \chi + e_2 \chi^2 + e_3 \chi^3$$

:::exercice ★★
Avec $u = (1, \chi, \chi^2, \chi^3)$, pour quels $\chi \in \F_{97}$ le contrôle accepte-t-il $h' = (5, -3, 2, 7)$ ? Pour un $h'$ faux quelconque, combien de valeurs de $\chi$ au plus le laissent passer ? On admet ici qu'un polynôme non nul de degré $d$ a au plus $d$ racines, ce que montre la page [[polynomes]].
:::reponse
Ici $e = (0, 0, 0, 1)$, donc $\langle u, e \rangle = \chi^3$, qui ne s'annule qu'en $\chi = 0$ : $h'$ passe avec probabilité $1/97$.

Pour un $h'$ faux quelconque, $e \neq 0$, donc $e_0 + e_1 \chi + e_2 \chi^2 + e_3 \chi^3$ est un polynôme non nul de degré au plus 3. Il a au plus 3 racines, donc au plus 3 valeurs de $\chi$ sur 97 laissent passer $h'$ : la probabilité vaut au plus $3/97$.
:::
:::

Un seul défi multiplie donc la borne par 3, le degré du polynôme en $\chi$. Pour $m$ équations, le degré est $m - 1$ et la borne vaut $(m - 1)/97$. La page [[horner]] fait de cette idée un outil général, qui regroupe $m$ affirmations en une seule et calcule la somme $\sum_i \chi^i c_i$ en ne gardant qu'une valeur.

## Le prix du hasard

Chaque contrôle de ce chapitre accepte une affirmation fausse avec une petite probabilité $\varepsilon$. On mesure cette probabilité en **bits de sécurité**, $-\log_2 \varepsilon$ : un test à $k$ bits se trompe avec probabilité $2^{-k}$. Le contrôle de la couche donne :

$$-\log_2 (1/97) = \log_2 97 \approx 6{,}6 \text{ bits}$$

Les contrôles des chapitres suivants comparent des polynômes de degré 2, et un tel contrôle se trompe avec probabilité au plus $2/97$ ([[schwartz-zippel]]).

:::exercice ★★
Combien de bits de sécurité donne un test qui se trompe avec probabilité $2/97$ ? Et $2/97^3$ ?
:::reponse
$$
\begin{aligned}
-\log_2 (2/97) &= \log_2 97 - 1 \approx 5{,}6 \\
-\log_2 (2/97^3) &= 3 \log_2 97 - 1 \approx 18{,}8
\end{aligned}
$$
:::
:::

Un prouveur qui triche sur un test de degré 2 dans $\F_{97}$ passe donc jusqu'à une fois sur 48 environ.

:::piege
Appeler $1/97$ une « petite » probabilité. Elle vaut 6,6 bits : un prouveur qui peut recommencer passe en moyenne une fois sur 97 essais.
:::

Dans Goldilocks, le corps de FlashProve ([[goldilocks]]), $p \approx 2^{64}$, donc un test de degré 2 donne au mieux $\log_2 (p/2) \approx 63$ bits. FlashProve vise 128 bits par tour : chaque tour de ses protocoles doit se tromper avec probabilité au plus $2^{-128}$ (`docs/protocol.md` §6.4). Goldilocks ne suffit donc pas.

La borne ne dépend que de la taille de l'ensemble où l'on tire le défi. Les données peuvent donc rester dans le petit corps, où elles prennent peu de place et se calculent vite, si l'on tire les défis dans un ensemble plus grand qui contient $\F_p$ et où l'on sait additionner, multiplier et diviser. La page [[extension]] construit cet ensemble, $\E = \F_p[X]/(X^3 - 2)$, qui a $p^3$ éléments. Pour le corps jouet, $97^3 = 912\,673$, et un test de degré 2 passe de 5,6 à 18,8 bits.

## La suite

On sait contrôler un produit d'une matrice cachée par un vecteur public en ne demandant qu'une combinaison des poids, et regrouper des équations sous un seul défi. Ce contrôle ne suffit plus quand les deux facteurs sont cachés, comme les prix et les quantités du reçu : la somme $\sum_i p_i q_i$ dépend alors des données par des produits de deux inconnues. Le chapitre [[sommes]] construit le sumcheck, qui contrôle une telle somme en lisant une valeur de chaque facteur en un point tiré au hasard, avec les défis et la règle de ce chapitre.

## Notre prouveur et FlashProve

Les deux tirent leurs défis dans une extension de degré 3 du corps des données, construite avec le même polynôme $X^3 - 2$ :

| | notre prouveur | FlashProve |
|---|---|---|
| Corps des données | $\F_{97}$ | Goldilocks, $p = 2^{64} - 2^{32} + 1$ |
| Corps des défis | $\E_{97}$, $912\,673$ éléments | $\E = \F[X]/(X^3 - 2)$, environ $2^{192}$ éléments (`blocks/field/field.h:25`, `:77`) |
| Erreur d'un test de degré 2 | $2/97^3$, 18,8 bits | $2/p^3$, environ 191 bits |
| Cible | aucune : c'est un jouet | 128 bits par tour (`docs/protocol.md` §6.4) |
| Contrôle par une combinaison des poids | chaque couche, avec un $u$ tiré au hasard ([[matrices]]) | le vecteur $w = gM$ de chaque requête, en un point $e^*$ partagé par un lot |

La dernière ligne est la même idée qu'à la section « Additionner les équations ». Le vérifieur de FlashProve tire un point frais, commun à toutes les requêtes d'un lot, et contrôle $w \cdot e^* = g \cdot (M e^*)$ : « If some w is not g · M, then w · e\* differs from g · (M · e\*) for all but a small fraction of points » (`docs/protocol.md` §6.3, « The shared chain »). La page [[lots]] lit ce contrôle. FlashProve ne cite pas Freivalds à cet endroit (D2 §2.2) : le rapprochement est une lecture du cours.

:::quiz
1. Que contrôle le test de Freivalds, et que compare-t-il ?
2. Combien de racines a au plus un polynôme non nul de degré 3 à coefficients dans un corps ?
3. Pourquoi un défi $u$ tiré dans $\{0, 1\}^4$ ne suffit-il pas pour contrôler $h$ ?
4. On regroupe 10 affirmations en une seule, $\sum_i \chi^i c_i = 0$, avec $\chi$ tiré dans un corps $\F$. Quelle probabilité d'erreur au plus ?
5. Pourquoi le vérifieur tire-t-il $u$ après que le prouveur a annoncé $h$ ?
6. Pourquoi tirer les défis dans $\E$ et laisser les données dans $\F$ ?
:::reponse Réponses
1. Il contrôle un produit de matrices, $AB = C$, en comparant $A(Br)$ et $Cr$ pour un vecteur $r$ tiré au hasard, ce qui coûte de l'ordre de $n^2$ multiplications au lieu de $n^3$.
2. Trois.
3. Chaque $u_i$ vaut 0 avec probabilité $1/2$, et une erreur sur la seule équation $i$ passe alors : un $h$ faux peut passer avec probabilité $1/2$ au lieu de $1/97$ (exercice 3).
4. $9/\lvert \F \rvert$ : le polynôme $\sum_i c_i X^i$ est de degré au plus 9.
5. Un prouveur qui connaît $u$ choisit une erreur $e \neq 0$ avec $\langle u, e \rangle = 0$ (exercice 5).
6. Les données restent petites et rapides dans $\F$, et la probabilité d'erreur ne dépend que de la taille de l'ensemble où l'on tire les défis.
:::
:::
