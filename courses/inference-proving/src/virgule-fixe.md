---
id: virgule-fixe
---
Un réseau entraîné calcule avec des nombres réels. On veut faire le même calcul avec des entiers, pour que chaque étape soit une égalité exacte qu'un vérifieur peut contrôler. Un vérifieur ne contrôle que des égalités dans un corps fini, dont les éléments sont des entiers ([[entiers-signes]]), et un nombre à virgule flottante n'y a pas de place.

Cette page construit l'écriture en entiers. On représente d'abord un réel par un entier à une échelle fixée. On voit ensuite qu'un produit change cette échelle, puis on construit l'arrondi qui la rétablit, sur les positifs, sur les négatifs et sur les cas d'égalité. On borne enfin les valeurs, et on finit par ce que cette exactitude coûte.

## Une échelle fixe

On part d'un cas connu. Un prix de 12,34 € s'écrit 1 234 en centimes : on multiplie par $10^2$ et on obtient un entier. Tous les prix utilisent la même échelle $10^2$, donc on n'a pas besoin de la stocker avec chaque nombre. Cette écriture s'appelle une **virgule fixe**, par opposition à la virgule flottante, où chaque nombre porte son propre exposant.

En binaire, on prend une échelle $2^s$. Un réel $v$ est représenté par l'entier le plus proche de $2^s v$, et cet entier $m$ représente exactement le réel $m / 2^s$. Plus $s$ est grand, plus la représentation est fine, et plus les entiers sont grands.

:::exercice ★
À l'échelle $2^4$, trouvez les entiers qui représentent $0{,}75$, $0{,}5$ et $1{,}3$. Quel réel le troisième représente-t-il exactement ? De combien au plus un réel s'écarte-t-il du réel que représente son entier ?
:::reponse
$16 \times 0{,}75 = 12$ et $16 \times 0{,}5 = 8$ sont déjà des entiers. $16 \times 1{,}3 = 20{,}8$, dont l'entier le plus proche est 21, qui représente $21/16 = 1{,}3125$.

L'entier le plus proche de $2^s v$ s'en écarte d'au plus $1/2$. En divisant par $2^s$, le réel représenté s'écarte de $v$ d'au plus $1/2^{s+1}$, soit $1/32 = 0{,}031\,25$ à l'échelle $2^4$.
:::
:::

## Un produit double l'échelle

En centimes, multiplier un prix par un taux écrit lui aussi en centièmes donne des centièmes de centimes : $2{,}50 \times 1{,}20$ s'écrit $250 \times 120 = 30\,000$, qui représente 3 à l'échelle $10^4$. Pour revenir aux centimes, on divise par $10^2$.

En binaire, c'est la même chose. Si $m_1 = 2^s v_1$ et $m_2 = 2^s v_2$, leur produit vaut :

$$m_1 m_2 = 2^s v_1 \cdot 2^s v_2 = 2^{2s}\, v_1 v_2$$

Le produit représente donc $v_1 v_2$ à l'échelle $2^{2s}$. À l'échelle $2^4$, $12 \times 8 = 96$ représente $96 / 2^8 = 0{,}375$, qui est bien $0{,}75 \times 0{,}5$. Pour revenir à l'échelle $2^4$, on divise par $2^4$ :

$$\frac{96}{16} = 6, \quad \text{qui représente } \frac{6}{16} = 0{,}375$$

Ici la division est exacte, mais ce n'est pas le cas en général : $21 \times 12 = 252$ et $252 / 16 = 15{,}75$. Un réseau multiplie à chaque couche. Sans retour à l'échelle, chaque produit par un poids à l'échelle $2^s$ ajouterait $s$ à l'exposant de l'échelle, et $s$ bits aux entiers, donc il faut une division par $2^k$ qui donne un entier, c'est-à-dire un arrondi.

## Arrondir par un décalage

Sur un entier positif, décaler de $k$ bits vers la droite divise par $2^k$ et garde la partie entière inférieure :

$$a \shr k = \Big\lfloor \frac{a}{2^k} \Big\rfloor$$

La partie entière inférieure n'est pas l'arrondi au plus proche : sur $15{,}75$, elle donne 15, alors que 16 est plus proche. On cherche donc l'entier le plus proche d'un réel $t$, avec seulement une partie entière inférieure.

Les réels dont l'entier le plus proche est $n$ sont ceux de l'intervalle $[n - \tfrac12, n + \tfrac12]$. Un milieu comme $n + \tfrac12$ est à égale distance de $n$ et de $n + 1$ ; on l'attribue ici à l'entier du dessus, et la section « Les égalités » revient sur ce choix. Il reste l'intervalle $[n - \tfrac12, n + \tfrac12)$. Après l'ajout de $\tfrac12$, ils sont dans $[n, n + 1)$, où la partie entière inférieure vaut $n$. L'entier le plus proche de $t$ est donc $\lfloor t + \tfrac12 \rfloor$, et avec $t = a / 2^k$ :

$$\Big\lfloor \frac{a}{2^k} + \frac12 \Big\rfloor = \Big\lfloor \frac{a + 2^{k-1}}{2^k} \Big\rfloor$$

On appelle cette opération l'**arrondi par décalage**, et on la note :

$$\rq(a, k) = \Big\lfloor \frac{a + 2^{k-1}}{2^k} \Big\rfloor = (a + 2^{k-1}) \shr k$$

On ajoute la moitié de $2^k$, puis on décale. C'est la définition de FlashProve (`docs/model.md` §1). Sur le produit de la section précédente, $\rq(96, 4) = \lfloor 104 / 16 \rfloor = 6$.

:::exercice ★
À l'échelle $2^4$, multipliez $1{,}3$ par $0{,}75$ avec les entiers de l'exercice 1, puis ramenez le résultat à l'échelle $2^4$ avec $\rq$. Comparez au produit réel.
:::reponse
$21 \times 12 = 252$, à l'échelle $2^8$. Puis $\rq(252, 4) = \lfloor 260 / 16 \rfloor = \lfloor 16{,}25 \rfloor = 16$, qui représente $16/16 = 1{,}0$.

Le produit réel vaut $1{,}3 \times 0{,}75 = 0{,}975$, donc l'erreur vaut $0{,}025$. Elle vient de deux arrondis : $1{,}3$ écrit $1{,}3125$, puis le retour à l'échelle.
:::
:::

## Les nombres négatifs

La définition de $\rq$ utilise la partie entière inférieure, qui va vers $-\infty$ : $\lfloor -5{,}125 \rfloor = -6$. La division entière de C et de Rust tronque vers zéro : `-41 / 8` y vaut $-5$. Les deux opérations coïncident sur les positifs et diffèrent sur un négatif qui n'est pas un multiple du diviseur. En Python, `//` et `>>` prennent la partie entière inférieure, comme `>>` sur un entier signé en Rust.

Un prouveur et un vérifieur qui n'arrondissent pas de la même façon ne calculent pas la même fonction, donc la définition fixe l'une des deux, la partie entière inférieure.

:::exercice ★
Calculez $\rq(45, 3)$ et $\rq(-45, 3)$. Calculez ensuite $(-45 + 4) / 8$ avec la division de C, puis avec `>>` en Python.
:::reponse
$\rq(45, 3) = \lfloor 49 / 8 \rfloor = 6$, et $45 / 8 = 5{,}625$ s'arrondit bien à 6.

$\rq(-45, 3) = \lfloor -41 / 8 \rfloor = \lfloor -5{,}125 \rfloor = -6$, et $-45/8 = -5{,}625$ s'arrondit bien à $-6$.

La division de C donne `-41 / 8` $= -5$, qui n'est pas l'arrondi de $-5{,}625$. En Python, `(-41) >> 3` vaut $-6$.
:::
:::

## Les égalités

Un réel situé exactement entre deux entiers, comme $0{,}5$, a deux entiers à égale distance. Pour $\rq$, cela arrive quand $a / 2^k = n + \tfrac12$. Alors $a + 2^{k-1} = (n + 1) \cdot 2^k$ est un multiple de $2^k$, et $\rq(a, k) = n + 1$ : l'égalité va vers l'entier du dessus. Ainsi $\rq(2, 2) = 1$, car $0{,}5$ devient 1, et $\rq(-2, 2) = 0$, car $-0{,}5$ devient 0.

L'arrondi appris à l'école envoie $-0{,}5$ sur $-1$, de façon symétrique. $\rq$ ne l'est pas : il envoie toujours une égalité vers le haut.

:::exercice ★★
Pour $k = 2$, donnez $\rq(h, 2)$ pour $h = -6, \dots, 6$. Quelles valeurs de $h$ sont des égalités, et vers quel entier vont-elles ?
:::reponse
$\rq(h, 2) = \lfloor (h + 2) / 4 \rfloor$ :

| $h$ | $-6$ | $-5$ | $-4$ | $-3$ | $-2$ | $-1$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| $\rq(h, 2)$ | $-1$ | $-1$ | $-1$ | $-1$ | $0$ | $0$ | $0$ | $0$ | $1$ | $1$ | $1$ | $1$ | $2$ |

Les égalités sont les $h$ pour lesquels $h/4$ est à mi-chemin entre deux entiers, c'est-à-dire où $h + 2$ est un multiple de 4 : $h = -6, -2, 2, 6$. On a $-1{,}5 \mapsto -1$, $-0{,}5 \mapsto 0$, $0{,}5 \mapsto 1$ et $1{,}5 \mapsto 2$ : chaque fois vers l'entier du dessus.
:::
:::

## Borner les valeurs

$\rq$ rétablit l'échelle, mais une valeur peut encore grandir. Une somme de $n$ produits peut être $n$ fois plus grande qu'un seul produit, donc chaque couche peut ajouter des bits. Or les étapes suivantes demandent des valeurs dans un intervalle fixé : une table de taille fixe, ou la moitié du corps où un entier se relit sans erreur ([[entiers-signes]]). On ramène donc chaque valeur dans $[-b, b]$ :

$$\mathrm{clamp}(a; b) = \min(\max(a, -b), b)$$

Une valeur sous $-b$ devient $-b$, une valeur au-dessus de $b$ devient $b$, et les autres ne changent pas. FlashProve borne ainsi ses activations à 12 bits avec signe, avec $b = 2\,047$ (`docs/model.md` §1).

:::exercice ★
Calculez $\mathrm{clamp}(3\,000; 2\,047)$, $\mathrm{clamp}(-5\,000; 2\,047)$ et $\mathrm{clamp}(12; 2\,047)$.
:::reponse
$2\,047$, $-2\,047$ et $12$.
:::
:::

## Le prix de l'exactitude

Chaque arrondi perd jusqu'à une demi-unité de l'échelle. Le modèle en entiers arrondit après chaque produit, borne ses valeurs, et remplace les fonctions par des tables, donc il calcule une autre fonction que le modèle en virgule flottante. Ce n'est pas le modèle en virgule flottante arrondi une fois à la fin, puisque chaque erreur entre dans les calculs suivants.

Une preuve établit ce que calcule le modèle en entiers, pas le modèle en virgule flottante. FlashProve a mesuré l'écart : sur 84 893 positions de 216 textes, le token le plus probable de son modèle en entiers diffère de celui des poids en 16 bits calculés en `float32` à 6,81 % des positions (`docs/limits.md`, « The integer model is not the floating-point model » ; article, p. 46, §7.7). Le chapitre [[ce-que-dit-une-preuve]] lit ce que cet écart change à ce qu'une preuve garantit.

:::piege
**Écrire $\rq$ avec la division du langage.** En C ou en Rust, `(a + (1 << (k - 1))) / (1 << k)` tronque vers zéro et donne un autre résultat dès que $a + 2^{k-1}$ est négatif et n'est pas un multiple de $2^k$. Il faut un décalage arithmétique (`>>` sur un entier signé en Rust), `div_euclid` en Rust, ou `//` en Python.
:::

## Notre réseau et FlashProve

Notre [[reseau|petit réseau]] n'a pas d'échelle à choisir : ses entrées et ses poids sont déjà de petits entiers, et $\rq(\cdot, 2)$ y tient le rôle du retour à l'échelle. FlashProve part des poids de Llama 4 Maverick et convertit chaque entrée $\pi$ d'une matrice en l'entier $w = \mathrm{RNE}(2^e \pi)$, où RNE arrondit au plus proche avec les égalités vers le pair, et où $e$ est le plus grand exposant pour lequel le plus grand $|\pi|$ du tenseur, tous les experts ensemble, donne au plus 4 095 (`docs/model.md` §11.4). Aucune preuve ne contrôle cette conversion : « No proof checks this conversion: a proof is about the committed integers » (`docs/model.md` §11).
