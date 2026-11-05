---
id: engagement-colonnes
---
Le prouveur s'est engagé sur une table de $2^v$ lignes, chacune un message de $\ell$ nombres. Le vérifieur veut contrôler une affirmation linéaire sur ces messages, comme la valeur $\tilde w(z) = \tau$ de leur [[multilineaire|extension multilinéaire]] en un point $z$ qu'il a tiré, en ouvrant peu de colonnes.

On construit d'abord l'engagement : chaque ligne est encodée par un code de [[reed-solomon|Reed-Solomon]], et chaque colonne devient une feuille d'un [[merkle|arbre de Merkle]]. On montre ensuite qu'une valeur de $\tilde w$ se lit sur une seule combinaison des lignes, la ligne pliée, puis que plier les mots des lignes donne le mot de la ligne pliée. On en déduit qu'une colonne ouverte donne une équation linéaire sur la ligne pliée. On assemble ces pièces en un protocole, et on finit par ce qu'il ne contrôle pas.

## S'engager sur une table

On note $m^{(0)}, \dots, m^{(2^v - 1)}$ les lignes de la table. Le prouveur encode chacune sur le même domaine de $n$ points, ce qui donne une table de $2^v$ lignes et $n$ positions dont chaque ligne est un mot du code :

$$T[b][x] = \Enc(m^{(b)})(x)$$

Une table de mots ainsi empilés s'appelle un **code entrelacé**. La **colonne** de la position $x$ est la liste $(T[b][x])_{b < 2^v}$ des symboles de toutes les lignes à cette position. Le prouveur fait de chaque colonne une feuille d'un arbre de Merkle, et publie la racine. Ouvrir une position montre alors le symbole de chaque ligne à cette position, avec un seul chemin.

## Une évaluation se lit sur une ligne

On cherche à lire une valeur de l'extension multilinéaire de toutes les entrées de la table. On range les $2^v \ell$ entrées dans un vecteur $w$ en mettant l'entrée (ligne $b$, place $c$) à l'indice

$$i = b + 2^v c$$

comme FlashProve (`blocks/README.md`, règle 3). Les $v$ bits de poids faible de $i$ donnent la ligne, les autres la place. Comme dans [[multilineaire]], la première variable va avec le bit de poids faible. On coupe donc le point $z$ en $z_{\text{bas}}$, ses $v$ premières coordonnées, qui vont avec les bits de la ligne, et $z_{\text{haut}}$, les suivantes, qui vont avec les bits de la place.

:::exercice ★★
Montrez que $\eq(z, i) = \eq(z_{\text{bas}}, b)\, \eq(z_{\text{haut}}, c)$, puis que :

$$\tilde w(z) = \sum_c \eq(z_{\text{haut}}, c) \sum_b \eq(z_{\text{bas}}, b)\, m^{(b)}_c$$
:::reponse
$\eq(z, i)$ est un produit d'un facteur par bit de $i$. Les $v$ premiers facteurs portent sur les bits de $b$ et les coordonnées de $z_{\text{bas}}$, et leur produit vaut $\eq(z_{\text{bas}}, b)$. Les autres portent sur les bits de $c$ et donnent $\eq(z_{\text{haut}}, c)$.

On remplace dans la définition $\tilde w(z) = \sum_i \eq(z, i)\, w_i$, avec $w_{b + 2^v c} = m^{(b)}_c$ :

$$
\begin{aligned}
\tilde w(z) &= \sum_c \sum_b \eq(z_{\text{bas}}, b)\, \eq(z_{\text{haut}}, c)\, m^{(b)}_c \\
&= \sum_c \eq(z_{\text{haut}}, c) \sum_b \eq(z_{\text{bas}}, b)\, m^{(b)}_c
\end{aligned}
$$
:::
:::

La somme intérieure ne dépend que de $z_{\text{bas}}$ et de la place $c$. Pour un point $\gamma$ de $v$ coordonnées, on appelle **ligne pliée** en $\gamma$ le vecteur de $\ell$ nombres

$$u = \sum_{b < 2^v} \eq(\gamma, b)\, m^{(b)}$$

Avec une seule variable de ligne ($v = 1$), elle vaut $(1 - \gamma)\, m^{(0)} + \gamma\, m^{(1)}$. En général, $(1 - \gamma_1)$ multiplie la ligne $2b$ et $\gamma_1$ la ligne $2b + 1$, puisque $\gamma_1$ va avec le bit de poids faible de $b$.

L'exercice montre qu'une valeur de $\tilde w$ est une affirmation linéaire sur la ligne pliée en $\gamma = z_{\text{bas}}$ :

$$\tilde w(z) = \langle \eq(z_{\text{haut}}, \cdot),\ u \rangle$$

:::exercice ★★
On prend $w = (5, 3, 1, 4)$, donc $v = 1$ et $\ell = 2$. Le bit de poids faible de l'indice donne la ligne, donc les lignes sont $(w_0, w_2) = (5, 1)$ et $(w_1, w_3) = (3, 4)$. Calculez $\tilde w(3, 5)$ de deux façons : directement à partir des quatre poids $\eq((3, 5), i)$, puis par la ligne pliée en $\gamma = 3$.
:::reponse
Directement, $\eq((3, 5), \cdot) = \big((1-3)(1-5),\ 3(1-5),\ (1-3) \cdot 5,\ 3 \cdot 5\big) = (8, -12, -10, 15)$, donc :

$$\tilde w(3, 5) = 8 \cdot 5 - 12 \cdot 3 - 10 \cdot 1 + 15 \cdot 4 = 40 - 36 - 10 + 60 = 54$$

Par le pli en 3, avec les poids $1 - 3 = -2$ et $3$ :

$$u = (-2 \cdot 5 + 3 \cdot 3,\ -2 \cdot 1 + 3 \cdot 4) = (-1, 10)$$

puis $\langle (1 - 5, 5), (-1, 10) \rangle = 4 + 50 = 54$.
:::
:::

Le prouveur peut envoyer $u$, $\ell$ nombres au lieu des $2^v \ell$ entrées, et le vérifieur calcule lui-même $\langle \eq(z_{\text{haut}}, \cdot), u \rangle$. Il reste à relier $u$ à la racine.

## Plier les mots

Le vérifieur ne voit que quelques colonnes de la table, donc il ne peut pas plier les messages lui-même. On cherche ce que donne le même pli appliqué aux mots des lignes.

:::exercice ★
Montrez que plier les mots donne le mot de la ligne pliée :

$$\sum_b \eq(\gamma, b)\, \Enc(m^{(b)}) = \Enc(u)$$
:::reponse
L'encodage est linéaire ([[reed-solomon]]) : l'encodage d'une combinaison de messages est la même combinaison des mots. Avec les coefficients $\eq(\gamma, b)$ :

$$\Enc\Big(\sum_b \eq(\gamma, b)\, m^{(b)}\Big) = \sum_b \eq(\gamma, b)\, \Enc(m^{(b)})$$

Le membre de gauche est $\Enc(u)$.
:::
:::

Encoder puis plier donne donc la même chose que plier puis encoder (FlashProve le dit de sa table : `blocks/iop/foldeq.h:11-13`). Position par position, le symbole de $\Enc(u)$ en $x$ est le pli de la colonne $x$.

:::exercice ★★
Les deux lignes $(5, 1)$ et $(3, 4)$ sont encodées sur $D_8 = (7, 90, 40, 57, 38, 59, 37, 60)$ :

$$
\begin{aligned}
\Enc(5, 1) &= (12, 95, 45, 62, 43, 64, 42, 65) \\
\Enc(3, 4) &= (31, 72, 66, 37, 58, 45, 54, 49)
\end{aligned}
$$

Pliez les deux lignes en $\gamma = 6$ pour obtenir $u$, puis pliez les huit colonnes, et comparez avec $\Enc(u)$.
:::reponse
Les poids valent $1 - 6 = -5$ et $6$. La ligne pliée est :

$$u = (-5 \cdot 5 + 6 \cdot 3,\ -5 \cdot 1 + 6 \cdot 4) = (-7, 19) \equiv (90, 19)$$

La colonne 0 est $(12, 31)$, et son pli vaut $-5 \cdot 12 + 6 \cdot 31 = 126 \equiv 29$. Les huit plis valent :

$$(29, 54, 74, 9, 36, 47, 17, 66)$$

De son côté, $\Enc(u)$ a pour symboles $90 + 19 z_x$ : en position 0, $90 + 133 = 223 \equiv 29$. Les huit symboles sont les mêmes que les plis des colonnes.
:::
:::

## Une colonne ouverte donne une équation

Le vérifieur ouvre la position $x$ et reçoit la colonne $(T[b][x])_b$. Il calcule lui-même son pli, puis il le compare au symbole de $\Enc(u)$ en $x$ :

$$\sum_b \eq(\gamma, b)\, T[b][x] = \sum_{j < \ell} u_j\, z_x^j$$

Le membre de gauche est un nombre que le vérifieur connaît. Le membre de droite est linéaire en $u$, avec les coefficients $(1, z_x, z_x^2, \dots, z_x^{\ell-1})$, qu'on appelle la **ligne génératrice** de la position $x$. Chaque colonne ouverte donne donc une équation linéaire sur $u$.

:::exercice ★
Écrivez l'équation linéaire sur $u = (u_0, u_1)$ que donne la colonne ouverte en position 3 ($z = 57$) de l'exemple précédent, et vérifiez-la pour $u = (90, 19)$.
:::reponse
La colonne 3 est $(62, 37)$, et son pli vaut $-5 \cdot 62 + 6 \cdot 37 = -88 \equiv 9$. L'équation est :

$$u_0 + 57\, u_1 = 9$$

Pour $u = (90, 19)$, $90 + 57 \times 19 = 1173 = 12 \times 97 + 9 \equiv 9$.
:::
:::

## Le protocole

On assemble les pièces. Le vérifieur a la racine de la table et une affirmation $\tilde w(z) = \tau$.

1. Le prouveur envoie la ligne pliée $u$ en $\gamma = z_{\text{bas}}$, soit $\ell$ nombres.
2. Le vérifieur contrôle $\langle \eq(z_{\text{haut}}, \cdot), u \rangle = \tau$.
3. Le vérifieur tire $t$ positions. Le prouveur ouvre les colonnes à ces positions, avec leurs chemins.
4. Le vérifieur contrôle chaque chemin, plie chaque colonne en $\gamma$, et compare le pli au symbole de $\Enc(u)$ à la même position.

D'après le commentaire de `blocks/iop/foldeq.h:27-35`, une table dont les lignes sont des mots du code et dont les colonnes sont hachées en arbre est l'engagement de Ligero et de Brakedown, et la lecture de la table en un point qui plie ses lignes vient de Brakedown.

On cherche ce que risque un prouveur qui envoie un faux $u'$ pour faire passer une fausse valeur, en supposant que les lignes engagées sont de vrais mots du code. Les plis des colonnes forment alors $\Enc(u)$ pour la vraie ligne pliée $u$.

:::exercice ★★
Sur l'exemple à deux lignes ($\ell = 2$, $n = 8$), le prouveur envoie un $u' \neq u$. En combien de positions au moins le contrôle de l'étape 4 échoue-t-il ? Bornez la probabilité que le prouveur passe quand le vérifieur tire $t$ positions au hasard, indépendamment.
:::reponse
$\Enc(u')$ et $\Enc(u)$ sont deux mots de messages différents, donc ils diffèrent en au moins $d = 8 - 2 + 1 = 7$ positions ([[reed-solomon]]). Le contrôle échoue en chacune de ces positions, puisque le pli de la colonne y vaut le symbole de $\Enc(u)$. Chaque position tirée passe avec une probabilité d'au plus $1/8$, et le prouveur passe les $t$ positions avec une probabilité d'au plus $(1/8)^t$.
:::
:::

## Ce que le contrôle ne voit pas

Le raisonnement précédent suppose que les lignes engagées sont des mots du code. Rien dans l'engagement ne l'impose : le prouveur peut placer n'importe quels symboles dans la table. Les plis des colonnes ne forment alors plus forcément un mot du code.

:::exercice ★★
Le prouveur s'engage sur $\Enc(5, 1)$ et sur un faux deuxième mot, égal à $\Enc(3, 4)$ sauf en position 5, où il met 0. Il envoie $u = (90, 19)$. En combien de positions le contrôle échoue-t-il ? Avec $t = 2$ positions tirées au hasard, indépendamment, quelle chance le prouveur a-t-il de passer ?
:::reponse
Les colonnes sont celles de l'exemple, sauf en position 5, où la colonne vaut $(64, 0)$. Son pli vaut $-5 \cdot 64 + 6 \cdot 0 = -320 \equiv 68$, alors que $\Enc(u)$ vaut 47 en position 5. Partout ailleurs, le pli vaut le symbole de $\Enc(u)$. Le contrôle échoue donc en la seule position 5.

Le prouveur passe si aucune des deux positions tirées n'est la position 5, avec une probabilité $(7/8)^2 \approx 0{,}77$.
:::
:::

Ce tricheur n'y gagne rien, puisqu'il envoie le vrai $u$. On cherche maintenant une table qui laisse au prouveur le choix de $u$.

:::exercice ★★★
Le prouveur s'engage sur $\Enc(5, 1)$ et sur un deuxième mot égal à $\Enc(3, 4)$ aux positions 0 à 3 et à $\Enc(3, 5)$ aux positions 4 à 7. On plie en $\gamma = 6$. Montrez que deux lignes $u$ font passer le contrôle en 4 positions chacune, et qu'aucune autre n'en passe plus de 2. Avec $t$ positions tirées au hasard, indépendamment, quelle chance a chacune de passer ? Quelle valeur de $\tilde w(6, 2) = \langle \eq(2, \cdot), u \rangle$ chacune annonce-t-elle ?
:::reponse
Aux positions 0 à 3, les colonnes sont celles de $\Enc(5, 1)$ et $\Enc(3, 4)$, donc leurs plis valent les symboles de $\Enc(u_A)$ avec $u_A = (90, 19)$, comme dans l'exemple. Aux positions 4 à 7, les plis valent les symboles du mot de

$$u_B = (-5 \cdot 5 + 6 \cdot 3,\ -5 \cdot 1 + 6 \cdot 5) = (-7, 25) \equiv (90, 25)$$

Chacune passe donc en 4 positions. Une autre ligne $u'$ a un mot qui coïncide avec $\Enc(u_A)$ en au plus $\ell - 1 = 1$ position, et avec $\Enc(u_B)$ en au plus 1 position, donc avec les plis en au plus 2 positions.

Chaque position tirée passe avec la probabilité $1/2$ pour $u_A$ comme pour $u_B$, donc chacune passe les $t$ positions avec la probabilité $(1/2)^t$, bien plus que la borne $(1/8)^t$ d'une table de vrais mots.

Avec $\eq(2, \cdot) = (1 - 2, 2) = (-1, 2)$, $u_A$ annonce $-90 + 2 \times 19 = -52 \equiv 45$ et $u_B$ annonce $-90 + 2 \times 25 = -40 \equiv 57$. La table ne fixe aucune des deux valeurs : le prouveur choisit celle qui l'arrange après avoir vu le point.
:::
:::

Une table dont les lignes ne sont pas des mots du code ne fixe donc pas de message à elle seule. Le chapitre [[proximite]] mesure de combien un mot s'écarte du code, et construit le [[test-proximite|test]] qui le contrôle.

:::piege
**Deux erreurs faciles.** Inverser les poids du pli : $(1 - \gamma_1)$ va avec la ligne $2b$ et $\gamma_1$ avec la ligne $2b + 1$ (`blocks/README.md`, règle 3). Croire ensuite que les colonnes ouvertes contrôlent les messages : elles ne contrôlent que $\Enc(u)$ en quelques positions.
:::

## Notre prouveur et FlashProve

| | notre prouveur | FlashProve |
|---|---|---|
| ligne pliée | envoyée en clair | engagée comme un nouveau message, $G_u$, puis testée (`blocks/iop/foldeq.h:6-20`) |
| lignes de la table | message seul | message et queue aléatoire ; l'équation d'une colonne ouverte porte sur les deux, avec la ligne génératrice $(z^{r+j})_j$ pour le message et $(z^j)_j$ pour la queue (`docs/format/toys/1-product.md`, partie 4, §0 et §1) |
| contrôle des lignes | aucun (chapitre [[proximite]]) | test de proximité sur $G_u$ |

Le commentaire de `blocks/iop/foldeq.h:31-35` marque cette différence avec Brakedown : « there the combination of the rows is sent; here it is committed ».
