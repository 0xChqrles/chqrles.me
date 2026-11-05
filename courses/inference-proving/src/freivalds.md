---
id: freivalds
---
On a trois matrices $n \times n$, $A$, $B$ et $C$, et on veut savoir si $AB = C$. Refaire le produit coûte $n^3$ multiplications, puisque chacune des $n^2$ entrées de $AB$ est une somme de $n$ produits. On cherche un test qui en coûte de l'ordre de $n^2$.

La page multiplie d'abord les deux côtés par un vecteur, ce qui donne un test de ce prix. Elle cherche ensuite ce que ce test laisse passer, sur un petit exemple avec des vecteurs de 0 et de 1, puis pour toute matrice fausse. Elle montre enfin qu'en tirant le vecteur dans un corps $\F_p$ ([[modulo]]), on obtient une probabilité d'erreur d'au plus $1/p$. Les indices commencent à 0 : un vecteur de longueur 2 s'écrit $r = (r_0, r_1)$.

## Multiplier par un vecteur

Si $AB = C$, alors $(AB) r = C r$ pour tout vecteur $r$ de longueur $n$. On peut regrouper un produit de matrices comme on veut, donc $(AB) r = A (B r)$, et on obtient un test :

$$A(Br) = Cr$$

Le vérifieur ne calcule jamais $AB$. Il calcule $Br$, puis le produit de $A$ par ce vecteur, puis $Cr$ : trois produits d'une matrice par un vecteur.

:::exercice ★
Combien de multiplications coûte le produit d'une matrice $n \times n$ par un vecteur ? Comparez le coût du test et celui du produit $AB$ pour $n = 1000$.
:::reponse
Chacune des $n$ coordonnées du résultat est une somme de $n$ produits, soit $n^2$ multiplications. Le test fait trois de ces produits, donc $3n^2$ multiplications. Pour $n = 1000$, il en coûte $3 \times 10^6$, contre $10^9$ pour refaire $AB$ : environ 333 fois moins.
:::
:::

## Ce que le test laisse passer

Si $AB = C$, le test passe pour tout $r$. La réciproque est fausse : le test peut passer alors que $AB \neq C$. Pour savoir quand, on pose $D = AB - C$. La différence des deux côtés du test vaut :

$$A(Br) - Cr = (AB)r - Cr = (AB - C)r = Dr$$

Le test passe donc si et seulement si $Dr = 0$. Quand $AB = C$, $D$ est nulle et $Dr = 0$ pour tout $r$. Quand $AB \neq C$, $D$ a au moins une entrée non nulle, et on cherche combien de vecteurs $r$ donnent quand même $Dr = 0$.

## Un exemple avec des 0 et des 1

On prend :

$$
A = \begin{pmatrix} 2 & 3 \\ 1 & 4 \end{pmatrix}
\qquad
B = \begin{pmatrix} 5 & 1 \\ 2 & 6 \end{pmatrix}
\qquad
AB = \begin{pmatrix} 16 & 20 \\ 13 & 25 \end{pmatrix}
$$

et une matrice fausse $C'$, qui diffère de $AB$ sur une seule entrée :

$$C' = \begin{pmatrix} 16 & 20 \\ 13 & 24 \end{pmatrix}$$

:::exercice ★
Calculez $(AB)r$ et $C'r$ pour les quatre vecteurs $r \in \{0, 1\}^2$. Lesquels détectent l'erreur ?
:::reponse
| $r$ | $(AB)r$ | $C'r$ | |
|---|---|---|---|
| $(0, 0)$ | $(0, 0)$ | $(0, 0)$ | passe |
| $(1, 0)$ | $(16, 13)$ | $(16, 13)$ | passe |
| $(0, 1)$ | $(20, 25)$ | $(20, 24)$ | détecte |
| $(1, 1)$ | $(36, 38)$ | $(36, 37)$ | détecte |

Deux vecteurs sur quatre détectent l'erreur. Les deux autres ont $r_1 = 0$ : ils ne lisent pas la colonne 1, où se trouve l'erreur.
:::
:::

## La borne 1/2

On montre que l'exemple est le pire cas : pour toute matrice $D \neq 0$ et un $r$ tiré uniformément dans $\{0, 1\}^n$, le test passe avec probabilité au plus $1/2$.

$D$ a une ligne non nulle, qu'on note $d$, et cette ligne a une coordonnée $d_j \neq 0$. Le test ne passe que si la coordonnée de $Dr$ qui correspond à cette ligne est nulle, c'est-à-dire si $\langle d, r \rangle = 0$. On fixe toutes les coordonnées $r_k$ pour $k \neq j$ et on pose $s = \sum_{k \neq j} d_k r_k$ :

$$\langle d, r \rangle = d_j r_j + s$$

Comme $d_j \neq 0$, les deux valeurs $r_j = 0$ et $r_j = 1$ donnent deux résultats différents, $s$ et $d_j + s$, et au plus l'un des deux est nul. Ceci vaut pour chaque choix des autres coordonnées, et $r_j$ vaut 0 ou 1 avec probabilité $1/2$, donc :

$$\Pr[Dr = 0] \le \Pr[\langle d, r \rangle = 0] \le \frac{1}{2}$$

:::exercice ★★★
Montrez que la borne $1/2$ est atteinte pour tout $n$ : donnez une matrice $D \neq 0$ de taille $n \times n$ telle que $\Pr[Dr = 0] = 1/2$ exactement.
:::reponse
On prend $D$ avec une seule entrée non nulle, $D[i][j] = 1$. Alors $Dr$ a pour seule coordonnée qui puisse être non nulle la coordonnée $i$, qui vaut $r_j$. Donc $Dr = 0$ si et seulement si $r_j = 0$, ce qui arrive avec probabilité $1/2$.

C'est le cas de l'exemple : $AB - C'$ a pour seule entrée non nulle $D[1][1] = 1$.
:::
:::

Une erreur passe donc au plus une fois sur deux. Pour faire mieux, on répète le test avec $k$ vecteurs tirés indépendamment. Une erreur ne passe que si elle passe les $k$ tests, ce qui arrive avec probabilité au plus $(1/2)^k = 2^{-k}$.

## Dans un corps

La borne $1/2$ vient du nombre de valeurs que peut prendre $r_j$ : deux, dont au plus une annule $\langle d, r \rangle$. On calcule maintenant modulo un nombre premier $p$, et on tire $r$ uniformément dans $\F_p^n$. L'équation $d_j r_j + s = 0$ a alors une seule solution, $r_j = -s/d_j$, puisque $d_j \neq 0$ a un inverse dans $\F_p$. Une seule valeur de $r_j$ sur $p$ laisse passer l'erreur, donc :

$$\Pr[Dr = 0] \le \frac{1}{p}$$

Le test établit alors $AB = C$ modulo $p$ : il compare des éléments de $\F_p$, et une entrée de $D$ qui est un multiple de $p$ y vaut 0.

:::exercice ★★
On garde $A$, $B$ et $C'$, mais on tire $r$ uniformément dans $\F_{97}^2$. Quelle est la probabilité que le test ne détecte pas l'erreur ?
:::reponse
$D = AB - C' = \begin{pmatrix} 0 & 0 \\ 0 & 1 \end{pmatrix}$, donc $Dr = (0, r_1)$. Le test ne détecte rien si et seulement si $r_1 = 0$, ce qui arrive pour 97 vecteurs sur $97^2$ : probabilité $1/97$.
:::
:::

:::exercice ★
Avec des $r \in \{0, 1\}^n$, combien de répétitions indépendantes faut-il pour que la probabilité d'erreur passe sous $2^{-40}$ ? Et avec des $r \in \F_{97}^n$ ?
:::reponse
Avec des 0 et des 1, $k$ répétitions donnent $2^{-k}$ : il en faut 40.

Dans $\F_{97}$, chaque répétition donne $1/97 = 2^{-\log_2 97} \approx 2^{-6{,}6}$. Six répétitions donnent $97^{-6} \approx 2^{-39{,}6}$, juste au-dessus de $2^{-40}$, et sept donnent $97^{-7} \approx 2^{-46{,}2}$ : il en faut 7.
:::
:::

## Ce que le test apporte à une preuve

Le vérifieur ne calcule jamais le produit : il compare deux vecteurs calculés à partir de $r$. On peut aussi multiplier à gauche par un vecteur ligne $u$ tiré au hasard, et comparer $(uA)B$ et $uC$, avec le même raisonnement. Le chapitre [[hasard]] applique cette forme à la première couche du réseau, $h = W_1 x$ : le vérifieur compare $\langle u, h \rangle$ et $\langle u W_1, x \rangle$, et le second nombre ne demande qu'une combinaison des poids.

Dans une preuve, le vérifieur n'a en général pas les matrices. Un côté de l'égalité est l'affirmation du prouveur, et l'autre s'obtient par un engagement, une question à la fois ([[engager]]).

:::piege
Croire que le vérifieur doit connaître $A$ et $B$. Le test demande seulement deux nombres ou deux vecteurs construits à partir de $r$, et chacun peut venir d'une affirmation ou d'un engagement.
:::

:::piege
Réutiliser un $r$ que le prouveur a vu. Connaissant $r$, il choisit une matrice fausse avec $Dr = 0$, par exemple en modifiant deux entrées d'une ligne de façon que $\langle d, r \rangle = 0$. Le vecteur est tiré après que le prouveur a fixé $C$, et on en tire un nouveau à chaque test.
:::

## Notre prouveur et FlashProve

Notre prouveur applique ce test à chaque couche du réseau, avec un vecteur $u$ à gauche tiré au hasard ([[hasard]]), puis un sumcheck sur l'indice intérieur ([[sumcheck-matrices]]). FlashProve a deux contrôles de la même forme.

Le premier porte sur le vecteur $w = gM$ de chaque requête d'un lot. Le vérifieur tire un seul point frais pour tout le lot et contrôle $w \cdot e^* = g \cdot (M e^*)$ : « If some w is not g · M, then w · e\* differs from g · (M · e\*) for all but a small fraction of points » (`docs/protocol.md` §6.3, « The shared chain » ; [[lots]]).

:::incertain
Le second est une lecture du cours (D2 §2.2), que FlashProve n'écrit pas ainsi. Dans un segment, un produit de matrices $XW$ est contrôlé par un sumcheck sous la forme $u^\top (XW) v = (u^\top X)(Wv)$, où $u$ et $v$ sont des vecteurs aléatoires d'une forme particulière, les poids d'égalité de [[multilineaire]]. Ce serait le test de Freivalds appliqué des deux côtés, sans que le produit soit jamais écrit ([[sumcheck-matrices]]).
:::

FlashProve ne cite Freivalds pour aucun de ces contrôles (D2 §2.2).
