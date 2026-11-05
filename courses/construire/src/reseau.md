---
id: reseau
---
On fixe ici le calcul que notre prouveur doit établir : un réseau de neurones assez petit pour qu'on en fasse une couche à la main dans $\F_{97}$, et qui contient les quatre opérations que FlashProve prouve sur un vrai modèle, à savoir un produit de matrices, un arrondi par décalage, une activation par une table et un argmax.

La page donne d'abord la définition du réseau, puis la fait calculer sur deux entrées. Elle borne ensuite toutes ses valeurs, ce qui garantit que le corps ne les confond jamais, et elle finit par la raison pour laquelle l'activation est donnée par une table.

## La définition

Le réseau prend 4 entrées et choisit une classe parmi 4. Il est écrit en entiers dès le départ, avec les outils de [[virgule-fixe]].

1. L'entrée $x \in \{0, 1, 2, 3\}^4$ est publique.
2. Les poids forment deux matrices $W_1$ et $W_2$ de taille $4 \times 4$, à coefficients dans $\{-1, 0, 1\}$, soit 32 poids. Le prouveur les fixe par un engagement ([[engager]]), et le vérifieur ne les voit jamais :
$$
W_1 = \begin{pmatrix} 0 & 1 & 1 & 1 \\ 0 & -1 & -1 & 1 \\ -1 & 1 & 1 & 0 \\ 1 & 0 & 1 & 1 \end{pmatrix}
\qquad
W_2 = \begin{pmatrix} -1 & 0 & 0 & 1 \\ 1 & 0 & 0 & 1 \\ 0 & 1 & 1 & 1 \\ 0 & 1 & 0 & -1 \end{pmatrix}
$$
3. La première couche calcule le produit $h = W_1 x$, soit $h_i = \sum_k W_1[i][k]\, x_k$ pour $i = 0, \dots, 3$.
4. L'arrondi divise chaque $h_i$ par 4 au plus proche, les égalités vers le haut : $q_i = \rq(h_i, 2) = \lfloor (h_i + 2)/4 \rfloor$. Par définition de la partie entière inférieure, $4 q_i \le h_i + 2 < 4 q_i + 4$, donc le **reste** $s_i = h_i + 2 - 4 q_i$ est un entier de $[0, 3]$.
5. L'activation remplace chaque $q_i$ par $a_i = \varphi(q_i)$, avec $\varphi(t) = \max(t, 0)$, donnée par sa table :

| $t$ | $-3$ | $-2$ | $-1$ | $0$ | $1$ | $2$ | $3$ |
|---|---|---|---|---|---|---|---|
| $\varphi(t)$ | $0$ | $0$ | $0$ | $0$ | $1$ | $2$ | $3$ |

6. La seconde couche calcule $y = W_2 a$.
7. La classe $c$ est le plus petit indice $v$ tel que $y_v = \max_i y_i$ : quand plusieurs sorties atteignent le maximum, on choisit la première.

Les poids dans $\{-1, 0, 1\}$ réduisent chaque produit $W[i][k]\, x_k$ à une addition, une soustraction ou rien, donc une couche se calcule de tête.

:::exercice ★
Calculez le passage complet pour $x = (2, 1, 3, 1)$ : $h$, $q$, $s$, $a$, $y$ et $c$.
:::reponse
Chaque $h_i$ additionne les $x_k$ où la ligne $i$ de $W_1$ vaut 1 et soustrait ceux où elle vaut $-1$ :

$$
\begin{aligned}
h_0 &= 1 + 3 + 1 = 5 \\
h_1 &= -1 - 3 + 1 = -3 \\
h_2 &= -2 + 1 + 3 = 2 \\
h_3 &= 2 + 3 + 1 = 6
\end{aligned}
$$

Puis $q = (\lfloor 7/4 \rfloor, \lfloor -1/4 \rfloor, \lfloor 4/4 \rfloor, \lfloor 8/4 \rfloor) = (1, -1, 1, 2)$. La deuxième valeur demande la partie entière inférieure : $\rq(-3, 2) = \lfloor -0{,}25 \rfloor = -1$. Les restes valent $s = (7 - 4, -1 + 4, 4 - 4, 8 - 8) = (3, 3, 0, 0)$.

L'activation donne $a = (1, 0, 1, 2)$ : le $-1$ devient 0.

La seconde couche donne :

$$
\begin{aligned}
y_0 &= -1 + 2 = 1 \\
y_1 &= 1 + 2 = 3 \\
y_2 &= 0 + 1 + 2 = 3 \\
y_3 &= 0 - 2 = -2
\end{aligned}
$$

Le maximum vaut 3, atteint en $v = 1$ et en $v = 2$. La règle d'égalité garde le plus petit indice : $c = 1$.
:::
:::

:::figure Le réseau sur l'entrée de l'exercice 1. Chaque opération porte le chapitre qui la prouve : les produits au chapitre 5, l'arrondi, l'activation et l'argmax aux chapitres 6 et 7.
<svg viewBox="0 0 480 390" role="img" aria-label="Le réseau en six valeurs reliées par cinq opérations. x = (2, 1, 3, 1), publique ; W₁ x, prouvé au chapitre 5, donne h = (5, −3, 2, 6) ; rq(·, 2), chapitres 6 et 7, donne q = (1, −1, 1, 2) ; φ par table, chapitres 6 et 7, donne a = (1, 0, 1, 2) ; W₂ a, chapitre 5, donne y = (1, 3, 3, −2) ; argmax, chapitres 6 et 7, donne c = 1, publique. Les valeurs h, q, a et y restent cachées au vérifieur."><rect x="40" y="10" width="200" height="28" class="box"/><text x="140" y="29" class="b mid">x = (2, 1, 3, 1)</text><text x="252" y="29" class="m s">publique</text><line x1="140" y1="40" x2="140" y2="74" class="l" marker-end="url(#fa)"/><text x="152" y="62" class="b">W₁ x</text><text x="470" y="62" class="c s end">chapitre 5</text><rect x="40" y="78" width="200" height="28" class="dim"/><text x="140" y="97" class="mid">h = (5, −3, 2, 6)</text><text x="252" y="97" class="m s">cachée</text><line x1="140" y1="108" x2="140" y2="142" class="l" marker-end="url(#fa)"/><text x="152" y="130" class="b">rq(·, 2)</text><text x="470" y="130" class="c s end">chapitres 6 et 7</text><rect x="40" y="146" width="200" height="28" class="dim"/><text x="140" y="165" class="mid">q = (1, −1, 1, 2)</text><text x="252" y="165" class="m s">cachée</text><line x1="140" y1="176" x2="140" y2="210" class="l" marker-end="url(#fa)"/><text x="152" y="198" class="b">φ, par table</text><text x="470" y="198" class="c s end">chapitres 6 et 7</text><rect x="40" y="214" width="200" height="28" class="dim"/><text x="140" y="233" class="mid">a = (1, 0, 1, 2)</text><text x="252" y="233" class="m s">cachée</text><line x1="140" y1="244" x2="140" y2="278" class="l" marker-end="url(#fa)"/><text x="152" y="266" class="b">W₂ a</text><text x="470" y="266" class="c s end">chapitre 5</text><rect x="40" y="282" width="200" height="28" class="dim"/><text x="140" y="301" class="mid">y = (1, 3, 3, −2)</text><text x="252" y="301" class="m s">cachée</text><line x1="140" y1="312" x2="140" y2="346" class="l" marker-end="url(#fa)"/><text x="152" y="334" class="b">argmax</text><text x="470" y="334" class="c s end">chapitres 6 et 7</text><rect x="40" y="350" width="200" height="28" class="ring"/><text x="140" y="369" class="b mid">c = 1</text><text x="252" y="369" class="m s">publique</text></svg>
:::

:::exercice ★
Faites le même calcul pour $x = (3, 3, 3, 3)$.
:::reponse
Avec toutes les entrées égales à 3, chaque $h_i$ vaut 3 fois la somme de la ligne $i$ de $W_1$ :

$$h = (3 \cdot 3,\ 3 \cdot (-1),\ 3 \cdot 1,\ 3 \cdot 3) = (9, -3, 3, 9)$$

Puis $q = (\lfloor 11/4 \rfloor, \lfloor -1/4 \rfloor, \lfloor 5/4 \rfloor, \lfloor 11/4 \rfloor) = (2, -1, 1, 2)$, $s = (3, 3, 1, 3)$ et $a = (2, 0, 1, 2)$.

Enfin $y = (-2 + 2,\ 2 + 2,\ 0 + 1 + 2,\ 0 - 2) = (0, 4, 3, -2)$, dont le maximum 4 n'est atteint qu'en $v = 1$ : $c = 1$.
:::
:::

## Les bornes

Le prouveur calcule dans $\F_{97}$, où un entier $v$ est rangé comme $v \bmod 97$. Le représentant centré le relit correctement seulement si $|v| \le 48$ ([[entiers-signes]]). Il faut donc montrer que chaque valeur d'un calcul honnête reste dans $[-48, 48]$, quels que soient l'entrée et les poids ternaires.

:::exercice ★★
Montrez que $|h_i| \le 12$ pour tous poids dans $\{-1, 0, 1\}$ et toute entrée $x \in \{0,1,2,3\}^4$. Trouvez ensuite l'intervalle que $h$ atteint vraiment avec la matrice $W_1$ de la page, sur les 256 entrées.
:::reponse
Chaque terme vérifie $|W_1[i][k]\, x_k| \le 1 \times 3$, et $h_i$ en additionne 4 :

$$|h_i| \le \sum_{k=0}^{3} |W_1[i][k]| \cdot |x_k| \le 4 \times 3 = 12$$

Avec ces poids, chaque ligne atteint son minimum en mettant $x_k = 3$ là où le poids vaut $-1$ et $x_k = 0$ là où il vaut 1, et son maximum à l'inverse. Une ligne qui a $p$ coefficients égaux à 1 et $n$ égaux à $-1$ couvre donc $[-3n, 3p]$ :

| ligne | coefficients | $p$, $n$ | intervalle |
|---|---|---|---|
| 0 | $(0, 1, 1, 1)$ | 3, 0 | $[0, 9]$ |
| 1 | $(0, -1, -1, 1)$ | 1, 2 | $[-6, 3]$ |
| 2 | $(-1, 1, 1, 0)$ | 2, 1 | $[-3, 6]$ |
| 3 | $(1, 0, 1, 1)$ | 3, 0 | $[0, 9]$ |

Le minimum $-6$ vient de la ligne 1, pour $x = (\cdot, 3, 3, 0)$, et le maximum 9 des lignes 0 et 3, par exemple pour $x = (3, 3, 3, 3)$. Donc $h \in [-6, 9]$.
:::
:::

:::exercice ★
Déduisez de $|h_i| \le 12$ les intervalles de $q$, de $a$ et de $y$, et vérifiez qu'ils sont dans $[-48, 48]$.
:::reponse
Pour $h_i \in [-12, 12]$, $(h_i + 2)/4$ est dans $[-2{,}5;\ 3{,}5]$, donc $q_i = \lfloor (h_i + 2)/4 \rfloor \in [-3, 3]$. Puis $a_i = \max(q_i, 0) \in [0, 3]$. Enfin $y_i$ additionne 4 termes de valeur absolue au plus 3, donc $|y_i| \le 12$. Avec $s \in [0, 3]$, toutes les valeurs sont dans $[-12, 12]$, loin de 48.
:::
:::

L'intervalle de $q$ explique aussi la table de $\varphi$ : elle couvre $t \in [-3, 3]$, toutes les valeurs que $q$ peut prendre. Dans un calcul honnête, le corps ne confond donc aucune valeur. Un prouveur qui triche peut en revanche annoncer une valeur hors de ces intervalles, que le corps relirait autrement, et le chapitre [[arrondir]] montre comment les tables l'en empêchent.

## L'activation par une table

L'arrondi et l'activation ne sont pas des polynômes de petit degré, alors qu'un sumcheck ne contrôle que des sommes de polynômes. On cherche donc s'il vaut mieux écrire $\varphi$ comme un polynôme ou la donner par une table.

:::exercice ★★
La fonction $\varphi$ restreinte à $\{-3, \dots, 3\}$ est-elle un polynôme ? De quel degré au plus ? Pourquoi garder quand même une table ?
:::reponse
Oui. Par 7 points d'abscisses distinctes passe un polynôme de degré au plus 6 ([[polynomes]]), donc toute fonction sur 7 points en est un.

Le degré suit la taille de l'ensemble. Une fonction donnée par une table de $2^{16}$ lignes, la taille des tables d'intervalle de FlashProve (D2 §4), demande en général un polynôme de degré $65\,535$. Dans un sumcheck, le polynôme d'un tour a le degré de la fonction sommée en la variable du tour, donc un tel polynôme ferait envoyer 65 536 coefficients à chaque tour. Un lookup ([[lookups]]) prouve qu'une paire $(q_i, a_i)$ est une ligne de la table, et il coûte la même chose quelle que soit la fonction écrite dans la table.

Sur nos 7 points, un polynôme de degré 6 resterait petit, mais il accepterait n'importe quel $q_i$ du corps et lui associerait une valeur. La table n'a de lignes que pour $t \in [-3, 3]$, donc prouver que $(q_i, a_i)$ en est une ligne prouve aussi que $q_i$ est dans cet intervalle.
:::
:::

Notre prouveur donne donc $\varphi$ par sa table de 7 paires $(t, \varphi(t))$, et les chapitres [[arrondir]] et [[tables]] prouvent que chaque paire $(q_i, a_i)$ en est une ligne.

:::piege
**La règle d'égalité fait partie de la fonction.** Sans elle, « l'indice du plus grand $y_v$ » n'est pas défini sur $y = (1, 3, 3, -2)$. Un prouveur pourrait annoncer $c = 2$ aussi bien que $c = 1$.
:::

:::piege
**$\rq$ avec une division qui tronque.** Sur $h_1 = -3$, la troncature de $-1/4$ vers zéro donne $q_1 = 0$, et le reste $s_1 = -3 + 2 - 0 = -1$ n'est pas dans $[0, 3]$. La définition prend la partie entière inférieure : $q_1 = -1$, $s_1 = 3$.
:::

## Notre réseau et le modèle de FlashProve

FlashProve prouve un modèle en entiers de Llama 4 Maverick avec les mêmes quatre opérations, à une autre échelle, et avec des opérations que notre réseau n'a pas :

| | notre réseau | le modèle en entiers de FlashProve |
|---|---|---|
| poids | 32, dans $\{-1, 0, 1\}$ | 400,7 milliards (article, p. 46, §7.8) ; hors de la table d'embedding, chacun dans $[-4\,096, 4\,095]$, soit 13 bits avec signe (`docs/model.md` §3) |
| activations | dans $[0, 3]$, 2 bits | 12 bits avec signe, bornées par $\mathrm{clamp}(\cdot\,; 2\,047)$ (`docs/model.md` §1) |
| arrondi | $\rq(\cdot, 2)$ | $\rq(\cdot, k)$ après chaque projection, avec un reste dans $[0, 2^k)$ (format 11.2, « A rounding site ») |
| activation | $\max(t, 0)$ par une table | SiLU par la table FL (format 11.2 ; D2 §6.4) |
| choix final | argmax, plus petit indice | token de tête par des marges, avec la même règle d'égalité (format 11.4 ; D2 §7) |
| absent de notre réseau | | attention, norme, routeur des experts, encodage rotatif (`docs/model.md` §5 à §7 ; [[modele-entier]], [[attention]]) |
