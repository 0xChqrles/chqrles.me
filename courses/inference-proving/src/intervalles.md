---
id: intervalles
---
Une partie d'un calcul d'entiers n'est faite ni d'additions ni de multiplications : une division arrondie, une racine carrée, une comparaison. Le vérifieur d'une preuve dans un corps $\mathbb{F}_p$ ne contrôle que des égalités modulo $p$. On cherche à écrire chacune de ces opérations comme des égalités dans $\mathbb{F}_p$ plus des affirmations « cette valeur est dans $[0, B)$ », qu'on appelle des **contrôles d'intervalle**, et à montrer que cela fixe le résultat entier.

La page commence par l'[[virgule-fixe|arrondi par décalage]] $\rq(A, k)$ : le prouveur donne le quotient, et un reste borné le fixe. Elle montre ensuite pourquoi un contrôle fait modulo $p$ suffit, à condition de connaître la taille des valeurs. Elle traite après les bornes des deux côtés, avec la racine carrée et la division arrondie, et elle finit par la façon dont FlashProve fait tous ses contrôles avec quelques tables, avec le piège de cette méthode.

## Le prouveur donne la réponse

On veut prouver $q = \rq(A, k) = \lfloor (A + 2^{k-1})/2^k \rfloor$. La partie entière n'est pas une opération du corps : diviser par $2^k$ dans $\mathbb{F}_p$, c'est multiplier par l'inverse de $2^k$. Avec $A = 45$ et $k = 3$, on veut $\lfloor 49/8 \rfloor = 6$, alors que dans $\mathbb{F}_{97}$ on a $1/8 = 85$ et

$$49 \times 85 = 4165 \equiv 91$$

Le vérifieur ne peut donc pas calculer $q$. Le prouveur le fournit, et on cherche une propriété que le vérifieur sait contrôler et que seul le bon $q$ possède.

## Une borne fixe la partie entière

Par définition de la partie entière, $q = \lfloor (A + 2^{k-1}) / 2^k \rfloor$ est l'entier tel que :

$$q \le \frac{A + 2^{k-1}}{2^k} < q + 1$$

On multiplie par $2^k$, puis on retire $2^k q$ partout :

$$
\begin{aligned}
2^k q &\le A + 2^{k-1} < 2^k q + 2^k \\
0 &\le A + 2^{k-1} - 2^k q < 2^k
\end{aligned}
$$

Chaque étape se lit dans les deux sens, donc ces conditions sont équivalentes. On appelle **reste** l'entier

$$s = A + 2^{k-1} - 2^k q$$

et on obtient : $q = \rq(A, k)$ exactement quand $0 \le s < 2^k$. Le contrôle se coupe donc en deux. Le reste se calcule à partir de $A$ et de $q$ par une égalité, que le corps sait contrôler. Il reste une borne, « $s$ est dans $[0, 2^k)$ ».

:::exercice ★
Pour $A = 45$ et $k = 3$, quel est $q$, et quel est le reste ? Même question pour $A = -45$. Vérifiez à chaque fois $0 \le s < 8$.
:::reponse
Pour $A = 45$ : $q = \lfloor 49/8 \rfloor = 6$ et $s = 49 - 48 = 1$.

Pour $A = -45$ : $q = \lfloor -41/8 \rfloor = -6$, puisque $-41/8 = -5{,}125$ et que la partie entière descend vers $-\infty$. Le reste vaut $s = -41 + 48 = 7$.

Une division qui tronque vers zéro donnerait $-5$ et un reste $-41 + 40 = -1$, hors de $[0, 8)$ : le contrôle refuse la troncature.
:::
:::

## Du corps aux entiers

Le vérifieur ne contrôle pas des entiers. Il contrôle que l'élément $s$ du corps vaut $A + 2^{k-1} - 2^k q$ modulo $p$, et que cet élément est l'un des nombres $0, \dots, 2^k - 1$. On cherche si un autre quotient $q'$ peut passer ce contrôle, d'abord sur un cas du [[reseau|petit réseau]], dans $\mathbb{F}_{97}$ avec $k = 2$ : $q = \lfloor (h + 2)/4 \rfloor$ et $s = h + 2 - 4q$.

:::exercice ★★
Pour $h = 5$, écrivez dans $\mathbb{F}_{97}$ les quatre quotients $q'$ dont le reste $s' = h + 2 - 4q'$ vaut 0, 1, 2 ou 3. Lesquels sont dans $[-3, 3]$ ? On rappelle que $1/4 = 73$ dans $\mathbb{F}_{97}$.
:::reponse
On isole $q'$ : $q' = (7 - s')/4 = (7 - s') \times 73$.

$$
\begin{aligned}
s' = 0 &: \quad 7 \times 73 = 511 \equiv 26 \\
s' = 1 &: \quad 6 \times 73 = 438 \equiv 50 \\
s' = 2 &: \quad 5 \times 73 = 365 \equiv 74 \\
s' = 3 &: \quad 4 \times 73 = 292 \equiv 1
\end{aligned}
$$

Lus avec le représentant centré, ces quotients valent 26, $-47$, $-23$ et 1. Seul $q' = 1$, le vrai quotient, est dans $[-3, 3]$.
:::
:::

Les faux quotients existent dans le corps, mais ils sont loin du vrai. Un reste $s' \ne s$ donne $q' - q = (s - s')/4$, et $s - s'$ vaut $\pm 1$, $\pm 2$ ou $\pm 3$. Multiplier par $73$ donne les différences possibles, lues avec le représentant centré :

$$q' - q \in \{\pm 24,\ \pm 25,\ \pm 48\}$$

Si un autre contrôle a déjà montré que $q$ est dans $[-3, 3]$, deux quotients permis diffèrent d'au plus 6, et aucune de ces différences ne convient. Le contrôle du reste fixe donc le quotient.

Le cas général suit le même chemin. On suppose qu'on sait déjà, par un autre contrôle, que le quotient est dans un intervalle de $L$ entiers consécutifs. Deux quotients $q$ et $q'$ de cet intervalle, avec leurs restes $s$ et $s'$ dans $[0, 2^k)$, passent tous les deux pour le même $A$. On soustrait les deux égalités contrôlées :

$$N = 2^k (q - q') + (s - s') \equiv 0 \pmod p$$

On borne l'entier $N$ avec $|q - q'| \le L - 1$ et $|s - s'| \le 2^k - 1$ :

$$|N| \le 2^k (L - 1) + 2^k - 1 < L \cdot 2^k$$

Si $L \cdot 2^k \le p$, l'entier $N$ est un multiple de $p$ plus petit que $p$ en valeur absolue, donc $N = 0$ ([[entiers-signes]]). On en déduit $2^k (q - q') = s' - s$. Le membre de droite vaut moins de $2^k$ en valeur absolue et il est multiple de $2^k$, donc il est nul : $s = s'$, puis $q = q'$.

Pour le réseau, $L = 7$ et $2^k = 4$, soit $28 \le 97$. FlashProve pose une condition de la même forme pour chacun de ses arrondis : deux quotients de l'intervalle permis diffèrent de moins que sa largeur $SP$, et la condition $SP \cdot 2^{\max(k, 16)} \le 2^{60}$ garde le produit sous le $p$ de [[goldilocks]] (condition `U-` de `docs/format/11-2-feed-forward-segment.md` ; `docs/format/11-4-output-head.md`, « What each condition is for », condition 1).

## Deux bornes : la racine carrée

La norme d'un vecteur, que FlashProve calcule à chaque couche ([[modele-entier]]), demande une racine carrée entière : $\sigma = \lfloor \sqrt V \rfloor$ est le plus grand entier dont le carré ne dépasse pas $V$. Cette définition contient deux inégalités :

$$\sigma^2 \le V < (\sigma + 1)^2$$

La première s'écrit avec un **écart** positif ou nul, $l = V - \sigma^2 \ge 0$. La seconde demande que $\sigma + 1$ soit trop grand, et elle s'écrit aussi avec un écart.

:::exercice ★★
Écrivez $V < (\sigma + 1)^2$ sous la forme « un entier calculé à partir de $\sigma$ et de $l$ est positif ou nul ».
:::reponse
Entre entiers, $V < (\sigma + 1)^2$ équivaut à $V \le (\sigma + 1)^2 - 1 = \sigma^2 + 2\sigma$. On retire $\sigma^2$ des deux côtés :

$$l = V - \sigma^2 \le 2\sigma$$

donc la condition est $u = 2\sigma - l \ge 0$.
:::
:::

Le prouveur fournit $\sigma$, le vérifieur calcule $l = V - \sigma^2$ et $u = 2\sigma - l$, et un contrôle d'intervalle porte sur chacun des deux écarts. Pour $V = 50$, le prouveur annonce $\sigma = 7$, et les écarts valent $l = 50 - 49 = 1$ et $u = 14 - 1 = 13$. FlashProve prouve ainsi la racine de sa norme, où $V$ est la somme des carrés d'une ligne plus une petite constante (`docs/model.md` §5), avec les deux écarts `l1` et `h1` écrits en chiffres contrôlés et l'égalité `l1 + h1 - 2 sig = 0` (`docs/format/11-2-feed-forward-segment.md`, affirmation LE3 ; `prover/prover/forward.cuh:324`).

:::exercice ★
Montrez que $\sigma = 6$ et $\sigma = 8$ échouent pour $V = 50$. Lequel des deux passerait si le vérifieur oubliait l'écart $u$ ?
:::reponse
Pour $\sigma = 6$ : $l = 50 - 36 = 14$ et $u = 12 - 14 = -2 < 0$.

Pour $\sigma = 8$ : $l = 50 - 64 = -14 < 0$.

Sans l'écart $u$, $\sigma = 6$ passerait, et tout $\sigma$ de 0 à 5 aussi, puisque $\sigma^2$ reste alors sous 50 et que $l$ reste positif.
:::
:::

## La division arrondie

L'attention de FlashProve divise une somme pondérée $\mathrm{acc}$ par un dénominateur $Z$, en arrondissant au plus proche, les moitiés vers le haut ([[attention]]) :

$$o = \left\lfloor \frac{\mathrm{acc}}{Z} + \frac{1}{2} \right\rfloor$$

On procède comme pour l'arrondi par décalage, en écrivant d'abord la fraction avec des entiers.

:::exercice ★★
Écrivez $o$ comme la partie entière d'une fraction d'entiers. Déduisez-en le reste $\mathrm{rem}$ et l'intervalle où il doit se trouver.
:::reponse
On met les deux termes sur le dénominateur $2Z$ :

$$o = \left\lfloor \frac{2\,\mathrm{acc} + Z}{2Z} \right\rfloor$$

Comme pour $\rq$, cette partie entière vaut $o$ exactement quand le reste

$$\mathrm{rem} = 2\,\mathrm{acc} + Z - 2Z o$$

vérifie $0 \le \mathrm{rem} < 2Z$, c'est-à-dire $0 \le \mathrm{rem} \le 2Z - 1$.
:::
:::

La borne $2Z - 1$ dépend de $Z$, que le prouveur calcule. Une table a des lignes fixes, donc elle ne peut pas contenir $[0, 2Z - 1]$ pour chaque $Z$. On ramène la borne à deux écarts, $\mathrm{rem} \ge 0$ et $2Z - 1 - \mathrm{rem} \ge 0$, que des tables fixes contrôlent. C'est ce que fait FlashProve, qui écrit chaque écart en deux chiffres (`docs/model.md` §6, étape 4, pour la formule de $o$ ; `docs/format/11-3-attention-segment.md`, clés `WL` et `WH`).

Pour $\mathrm{acc} = 7$ et $Z = 3$, on a $o = \lfloor 17/6 \rfloor = 2$, $\mathrm{rem} = 17 - 12 = 5$ et $2Z - 1 - \mathrm{rem} = 0$. L'écart nul signifie que $\mathrm{rem}$ est à sa borne haute, et $7/3 \approx 2{,}33$ s'arrondit bien à 2.

:::exercice ★
Calculez $o$ et les deux écarts pour $\mathrm{acc} = 108$ et $Z = 28$. Vérifiez que $o$ est l'arrondi de $\mathrm{acc}/Z$.
:::reponse
$$
\begin{aligned}
o &= \lfloor (216 + 28)/56 \rfloor = \lfloor 244/56 \rfloor = 4 \\
\mathrm{rem} &= 244 - 224 = 20 \\
2Z - 1 - \mathrm{rem} &= 55 - 20 = 35
\end{aligned}
$$

Les deux écarts sont positifs, et $108/28 \approx 3{,}857$ s'arrondit à 4.
:::
:::

## Une seule table : les clés décalées

FlashProve n'a que quelques tables d'intervalle, de $2^8$, $2^{10}$ et $2^{16}$ lignes (`docs/format/11-1-machinery.md`, « Public tables »). Pour contrôler une borne plus étroite, $0 \le s < 2^k$ avec $k < 16$, il multiplie la valeur par une puissance de 2 publique avant de la chercher dans la table de $2^{16}$ lignes : la clé est $2^{16-k} s$. Si l'entier $2^{16-k} s$ est dans $[0, 2^{16})$, alors $s$ est dans $[0, 2^k)$. C'est la clé de ses arrondis, avec $2^{16-k}$ devant le reste (`docs/format/11-2-feed-forward-segment.md`, « The keys »).

Le raisonnement porte sur l'entier $2^{16-k} s$, alors que la table contrôle un élément du corps. On regarde ce que cela change dans $\mathbb{F}_{97}$, avec la table $R_{16} = \{0, \dots, 15\}$ et $k = 2$.

:::exercice ★★
On contrôle $s \in [0, 4)$ par la clé $4s$ dans $R_{16}$, dans $\mathbb{F}_{97}$. Montrez que $s = 73$ passe. Quelle borne déjà connue sur $s$ ferme ce trou ?
:::reponse
$4 \times 73 = 292 = 3 \times 97 + 1 \equiv 1$, qui est dans $R_{16}$. La valeur 73 passe donc, alors qu'elle n'est pas dans $[0, 4)$.

Supposons qu'on sache déjà $|s| \le 20$. L'entier $4s$ est alors dans $[-80, 80]$. Un $4s$ négatif vaut au moins $-80$, donc il est rangé dans $[17, 96]$, hors de $R_{16}$. Un $4s$ positif vaut au plus 80, il ne fait pas le tour du corps, et il est dans $R_{16}$ seulement s'il vaut au plus 15. Il reste $0 \le 4s \le 15$, donc $s \in [0, 3]$.

En général, avec un multiplicateur $m$ et une table de $T$ lignes, une borne $|s| \le S$ suffit quand $mS \le p - T$ : les clés négatives restent alors au-dessus de $T - 1$. Ici $4 \times 20 = 80 \le 97 - 16 = 81$, et $S = 21$ ne suffit plus, puisque $4 \times (-21) = -84 \equiv 13$.
:::
:::

Une clé décalée ne vaut donc qu'avec une borne préalable sur la valeur. FlashProve l'obtient par son [[test-petitesse|test de petitesse]] : une fois la trace d'un segment engagée, il montre que ses valeurs sont petites, dans une borne plus large, sauf avec une petite probabilité (`docs/protocol.md` §6.3).

:::piege
**L'écart du haut.** Pour une racine carrée, l'écart $l = V - \sigma^2 \ge 0$ seul laisse passer tout $\sigma$ trop petit. Il faut aussi $2\sigma - l \ge 0$.

**Une clé décalée sans borne préalable.** Le produit par $2^{16-k}$ peut faire le tour du corps et donner une ligne de la table, comme $s = 73$ dans l'exercice 7.

**Partie entière et troncature.** Pour $A$ négatif, $\lfloor \cdot \rfloor$ descend vers $-\infty$, alors que la division de C ou de Rust tronque vers zéro. Le contrôle du reste refuse la troncature.
:::

## Notre prouveur et FlashProve

Les tables de notre réseau sont petites et exactes, $R_4$ pour les restes et $R_{32}$ pour les marges, et la borne préalable vient des poids ternaires et de la table de l'activation ([[arrondir]]). FlashProve contrôle tout avec ses tables de $2^8$, $2^{10}$ et $2^{16}$ lignes : la clé de certains chiffres est le chiffre multiplié par 2, 4, 32 ou 128, une méthode qu'il cite d'après le livre de halo2, « Short range check » (`PUBLISHED-WORKS.md`). Il compte sur son test de petitesse pour exclure le tour du corps. Il cite aussi ses sources pour un quotient ou une racine prouvés par un reste contrôlé : ZKML §5.1 et zkGPT §4.3 (`PUBLISHED-WORKS.md`, ligne « A rounded quotient or a square root »).
