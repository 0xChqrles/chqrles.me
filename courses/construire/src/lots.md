---
id: lots
---
Un prouveur qui sert beaucoup de requêtes avec les mêmes poids finit chaque preuve par des affirmations sur ces poids, et il les fait contrôler en ouvrant des colonnes de la table engagée ([[engagement-colonnes]]). Chaque colonne ouverte use le budget d'ouvertures de la table, puisque sa queue aléatoire ne cache qu'un nombre fixé de colonnes, toutes preuves confondues ([[zero-knowledge]]). Si chaque requête ouvre ses propres colonnes, la table s'use au rythme des requêtes. On cherche donc à servir tout un lot de requêtes avec une seule ouverture de la table.

Cette page suit la construction de FlashProve (`docs/protocol.md` §6.3). On écrit d'abord la forme de l'affirmation que chaque requête fait sur les poids. On en sort les poids, en faisant engager le prouveur sur un vecteur court par requête. On contrôle ensuite tous ces vecteurs en un seul point, avec l'idée du [[freivalds|test de Freivalds]], ce qui laisse un seul vecteur à calculer sur la table pour tout le lot. On montre comment ce vecteur s'obtient avec une seule ouverture, puis dans quel ordre les défis doivent être tirés, et on finit par ce que le lot change au budget.

## L'affirmation d'une requête

FlashProve écrit tous les poids comme de petits chiffres signés et les range dans une matrice $M$, la **matrice des poids**, selon une règle publique. Chaque ligne de la table engagée contient un **bloc** de colonnes consécutives de $M$, avec toutes leurs lignes, donc une ligne de la table n'est pas une ligne de $M$ (`docs/protocol.md` §6.1, étape 1).

À la fin de la **première chaîne** d'une requête, toutes ses affirmations sur la table sont regroupées en une seule :

$$g \cdot M \cdot e + \mu = v$$

Le terme $g \cdot M \cdot e$ vaut $\sum_i \sum_j g_i\, M[i][j]\, e_j$. Le vérifieur connaît $g$, qui a un facteur par ligne de $M$, $e$, qui en a un par colonne, et la valeur annoncée $v$. Le terme $\mu$ est une combinaison connue de masques sur lesquels le prouveur s'est engagé au début de la chaîne (`docs/protocol.md` §6.3). Les facteurs $e$ viennent d'un point $\psi_c$ par la formule de l'extension multilinéaire, $e_j = \eq(\psi_c, j)$ (`blocks/iop/lin.h:9-11`).

On suit tout le raisonnement sur un jouet sans masques, donc avec $\mu = 0$ :

$$M = \begin{pmatrix} 1 & 2 & 0 & 3 \\ 2 & 1 & 1 & 0 \end{pmatrix} \qquad g = (2, 5) \qquad e = (1, 3, 0, 2)$$

Ce $e$ n'est pas de la forme $\eq(\psi_c, \cdot)$. Rien de ce qui suit n'utilise la forme de $e$, et ce choix garde de petits nombres.

:::exercice ★
Calculez $v = g \cdot M \cdot e$ de deux façons : d'abord le vecteur $gM$, puis son produit scalaire avec $e$ ; ensuite le vecteur $Me$, puis son produit scalaire avec $g$. Combien d'entrées a chacun des deux vecteurs intermédiaires ?

:::reponse
Le vecteur $gM$ combine les lignes de $M$ avec les poids 2 et 5 :

$$gM = 2\,(1, 2, 0, 3) + 5\,(2, 1, 1, 0) = (12, 9, 5, 6)$$

donc $\langle gM, e \rangle = 12 + 27 + 0 + 12 = 51$.

Le vecteur $Me$ a une entrée par ligne : $Me = (1 + 6 + 0 + 6,\ 2 + 3 + 0 + 0) = (13, 5)$, donc $\langle g, Me \rangle = 26 + 25 = 51$.

Les deux ordres donnent $v = 51$. Le vecteur $gM$ a une entrée par colonne de $M$, ici 4, et $Me$ une entrée par ligne, ici 2.
:::
:::

## Sortir les poids de l'équation

Le vérifieur n'a pas $M$, donc il ne peut calculer ni $gM$ ni $Me$. Pour contrôler l'affirmation, il faut plier la table et en ouvrir des colonnes, comme dans [[engagement-colonnes]]. Or l'affirmation fait intervenir le $g$ et le $e$ de la requête, de part et d'autre de $M$ : deux requêtes n'ont besoin ni du même vecteur $Me$ ni du même vecteur $gM$. Telle quelle, chaque requête devrait donc ouvrir la table pour son compte, et user le budget.

On sépare donc ce qui appartient à la requête de ce qui touche la table. Le prouveur s'engage sur le **vecteur de la requête**

$$w = gM$$

qui a une entrée par colonne de $M$. L'affirmation devient

$$\langle w, e \rangle + \mu = v$$

et elle ne porte plus que sur $w$, un vecteur que le prouveur a engagé dans la preuve de cette requête, pas sur la table. Ce qui touche encore la table, c'est l'égalité $w = gM$, et c'est elle qu'on cherche à contrôler pour tout le lot à la fois.

Le vecteur $w$ est court devant $M$. Dans FlashProve, $M$ a $3\,076\,096$ lignes et $2^{18} = 262\,144$ colonnes (`blocks/frame/tests/wf_frame_test.cpp:87`), soit $806\,380\,109\,824$ entrées, alors que $w$ en a $262\,144$.

## Contrôler tout le lot en un point

Le [[freivalds|test de Freivalds]] contrôle une égalité entre matrices sans calculer le produit : il multiplie les deux côtés par un vecteur aléatoire et compare les résultats. L'égalité à contrôler ici, $w = gM$, est une égalité entre deux vecteurs ligne. On la multiplie à droite par un vecteur $e^*$ tiré au hasard. Si $w = gM$, alors

$$\langle w, e^* \rangle = g \cdot M \cdot e^* = \langle g, M e^* \rangle$$

Le vecteur $Me^*$ ne dépend pas de la requête. Les requêtes du lot ont chacune leur $g$ et leur $w$, mais si elles utilisent toutes le même $e^*$, elles utilisent toutes le même vecteur

$$\Omega = M e^*$$

le **vecteur partagé**, qui a une entrée par ligne de $M$. Chaque requête contrôle alors

$$\langle w, e^* \rangle = \langle g, \Omega \rangle$$

qui ne demande que deux produits scalaires sur des vecteurs courts. Seul $\Omega$ demande la table, et il se calcule une fois pour tout le lot.

FlashProve tire $e^*$ comme $e$ : un point $\psi^*$, puis $e^*_j = \eq(\psi^*, j)$ (`docs/protocol.md` §6.3, « The shared chain » ; `blocks/iop/lin.h:17-18`). Dans le jouet, $j$ a deux bits, donc $\psi^*$ a deux coordonnées, et la première va avec le bit de poids faible de $j$, comme dans [[multilineaire]].

:::exercice ★★
On prend $\psi^* = (3, 5)$. Calculez $e^* = \big(\eq(\psi^*, j)\big)_{j = 0, 1, 2, 3}$, puis $\Omega = Me^*$. Faites le contrôle de la requête de l'exercice 1, puis celui d'une seconde requête $g' = (3, 1)$ sur la même matrice.

:::reponse
Avec $\eq(\psi^*, j) = \prod_k \big(\psi^*_k j_k + (1 - \psi^*_k)(1 - j_k)\big)$ et $1 - 3 = -2$, $1 - 5 = -4$ :

$$e^* = \big((-2)(-4),\ 3 \cdot (-4),\ (-2) \cdot 5,\ 3 \cdot 5\big) = (8, -12, -10, 15)$$

Le vecteur partagé vaut :

$$\Omega = Me^* = (8 - 24 + 0 + 45,\ 16 - 12 - 10 + 0) = (29, -6)$$

Pour la première requête, $w = (12, 9, 5, 6)$ :

$$
\begin{aligned}
\langle w, e^* \rangle &= 96 - 108 - 50 + 90 = 28 \\
\langle g, \Omega \rangle &= 58 - 30 = 28
\end{aligned}
$$

Pour la seconde, $w' = g'M = 3\,(1, 2, 0, 3) + (2, 1, 1, 0) = (5, 7, 1, 9)$ :

$$
\begin{aligned}
\langle w', e^* \rangle &= 40 - 84 - 10 + 135 = 81 \\
\langle g', \Omega \rangle &= 87 - 6 = 81
\end{aligned}
$$

Le même $\Omega$ a servi aux deux requêtes. Dans $\F_{97}$, $e^* \equiv (8, 85, 87, 15)$, et les deux contrôles restent vrais modulo 97.
:::
:::

## Ce que risque un faux vecteur

Le contrôle passe quand $w = gM$. On cherche maintenant ce qui arrive quand $w \neq gM$. On pose $d = w - gM$, qui n'est pas nul. Comme $\langle g, Me^* \rangle = \langle gM, e^* \rangle$, le contrôle passe exactement quand

$$\langle w, e^* \rangle - \langle gM, e^* \rangle = \langle d, e^* \rangle = 0$$

Dans le test de Freivalds, le vecteur aléatoire est uniforme. Ici $e^*$ a la forme $\eq(\psi^*, \cdot)$, donc

$$\langle d, e^* \rangle = \sum_j \eq(\psi^*, j)\, d_j = \tilde d(\psi^*)$$

C'est la valeur en $\psi^*$ de l'extension multilinéaire de $d$ ([[multilineaire]]). Ce polynôme vaut $d_j$ au point $j$ du cube, donc il n'est pas nul, et il a un degré au plus égal au nombre $n$ de ses variables. Par [[schwartz-zippel|Schwartz-Zippel]], il s'annule sur une part d'au plus $n/K$ des points, où $K$ est le nombre d'éléments du corps dans lequel on tire les coordonnées de $\psi^*$. Un faux $w$ passe donc avec une probabilité d'au plus $n/K$.

Dans le jouet, un prouveur veut faire passer la valeur fausse $v = 53$ au lieu de 51. Il s'engage sur $w = (12, 9, 5, 7)$, qui donne bien $\langle w, e \rangle = 12 + 27 + 0 + 14 = 53$, donc le contrôle $\langle w, e \rangle = v$ de sa requête passe.

:::exercice ★★
Avec ce faux $w$, calculez $\langle w, e^* \rangle$ en $\psi^* = (3, 5)$ et comparez avec $\langle g, \Omega \rangle$. Pour quels $\psi^* \in \F_{97}^2$ le faux $w$ passe-t-il le contrôle partagé ? Combien sont-ils, et comparez leur part à la borne $2/97$.

:::reponse
$\langle w, e^* \rangle = 28 + 15 = 43$, puisque $w$ ne diffère du vrai vecteur que par la dernière entrée, de 1, et $e^*_3 = 15$. Or $\langle g, \Omega \rangle = 28$, donc le contrôle rejette.

En général $d = (0, 0, 0, 1)$, donc $\langle d, e^* \rangle = \eq(\psi^*, 3) = \psi^*_1 \psi^*_2$. Ce produit est nul dans $\F_{97}$ exactement quand l'une des deux coordonnées est nulle : 97 points avec $\psi^*_1 = 0$, 97 avec $\psi^*_2 = 0$, et le point $(0, 0)$ compté deux fois, soit $2 \times 97 - 1 = 193$ points sur $97^2 = 9\,409$.

Leur part vaut $193/9\,409 \approx 0{,}0205$, sous la borne $2/97 \approx 0{,}0206$ que donne Schwartz-Zippel pour deux variables.
:::
:::

Dans FlashProve, $M$ a $2^{18}$ colonnes, donc $\psi^*$ a 18 coordonnées, tirées dans le corps des défis $\E$, de taille $p^3 \approx 2^{192}$ ([[extension]] ; `blocks/iop/lin.h:401`). La borne vaut alors $18/|\E| \approx 2^{-187{,}8}$ pour une requête. Dans un lot de $N$ requêtes, un tricheur peut placer un faux $w$ dans chacune, et il gagne si l'un d'eux passe au même $\psi^*$. Cette probabilité vaut au plus la somme des $N$ bornes, $18N/|\E|$, soit environ $2^{-181{,}8}$ à 64 requêtes. C'est la borne qu'écrit le commentaire du code, `psi*: N (k_lo + v) / |E| for N requests, since both sides of (Dot) are multilinear in psi* and W_c was fixed before`, où `k_lo + v` vaut $7 + 11 = 18$ : 7 coordonnées pour la place dans un bloc, 11 pour le bloc, donc pour les $2^{11}$ lignes de la table (`blocks/iop/lin.h:401-406` ; `lean/SOUNDNESS-PROOF-MAP.md`, « One round, worked »).

:::note
FlashProve ne cite pas Freivalds pour ce contrôle : l'idée de Freivalds est la lecture qu'en fait le cours. Pour la lecture de la table par un pli, le code renvoie à Brakedown, §4.1, en notant qu'un seul test qui sert plusieurs évaluations y est sous-entendu (`blocks/iop/foldeq.h:30-34`). La forme des deux affirmations de la seconde chaîne suit Greyhound (`blocks/iop/lin.h:26-29`). D1 §8 relève aussi un renvoi de l'article à TensorSwitch (p. 83, tableau 11), que cette page n'a pas vérifié.
:::

## Obtenir Ω avec une seule ouverture

Le vecteur $\Omega = Me^*$ est le seul endroit où la table intervient, et on cherche à le prouver en ouvrant la table une seule fois. Pour cela, on relie $\Omega$ à la ligne pliée de [[engagement-colonnes]].

On reprend la disposition de la table. L'indice $j$ d'une colonne de $M$ se coupe en deux : ses bits de poids fort donnent son bloc, donc la ligne de la table qui le contient, et ses bits de poids faible donnent sa place dans le bloc. Comme $\eq$ est un produit sur les bits de $j$, le point se coupe de la même façon, $\psi^* = (\psi_{\text{lo}}, \gamma)$, et chaque facteur est un produit de deux facteurs (`docs/protocol.md` §6.3 ; `blocks/iop/lin.h:221-223`, `401-405`) :

$$e^*_j = \eq(\psi_{\text{lo}}, \text{place de } j) \cdot \eq(\gamma, \text{bloc de } j)$$

:::exercice ★★
Dans le jouet, les blocs ont deux colonnes : la ligne 0 de la table contient les colonnes 0 et 1 de $M$, la ligne 1 les colonnes 2 et 3. La ligne de table $r$ range l'entrée $M[i][2r + k]$ à la place $k + 2i$, donc

$$m^{(0)} = (1, 2, 2, 1) \qquad m^{(1)} = (0, 3, 1, 0)$$

Avec $\psi^* = (3, 5)$, on a $\psi_{\text{lo}} = 3$ et $\gamma = 5$. Pliez les deux lignes en $\gamma$, puis combinez, pour chaque ligne $i$ de $M$, les deux places $k = 0, 1$ de la ligne pliée avec les facteurs $\eq(\psi_{\text{lo}}, k)$. Comparez avec $\Omega$.

:::reponse
Les facteurs de bloc valent $\eq(5, 0) = 1 - 5 = -4$ et $\eq(5, 1) = 5$. La ligne pliée vaut :

$$u = -4\,(1, 2, 2, 1) + 5\,(0, 3, 1, 0) = (-4, 7, -3, -4)$$

Ses places 0 et 1 appartiennent à la ligne $i = 0$ de $M$, ses places 2 et 3 à la ligne $i = 1$. Les facteurs de place valent $\eq(3, 0) = -2$ et $\eq(3, 1) = 3$, donc :

$$
\begin{aligned}
\Omega_0 &= -2 \cdot (-4) + 3 \cdot 7 = 29 \\
\Omega_1 &= -2 \cdot (-3) + 3 \cdot (-4) = -6
\end{aligned}
$$

C'est le $\Omega = (29, -6)$ de l'exercice 2. Le pli en $\gamma$ fait le travail des facteurs de bloc, et la seconde combinaison, celle des facteurs de place, ne lit plus que la ligne pliée.
:::
:::

Le calcul de $\Omega$ se fait donc en deux temps. Le pli en $\gamma$ est la seule étape qui lit la table, et [[engagement-colonnes]] le contrôle en ouvrant des colonnes. La combinaison en $\psi_{\text{lo}}$ est une relation linéaire entre la ligne pliée et $\Omega$, qui ne touche plus à la table.

La **chaîne partagée** de FlashProve suit ces deux temps, en cinq étapes (`docs/protocol.md` §6.3) :

1. Le prouveur plie les lignes de la table avec les facteurs de bloc et s'engage sur la ligne pliée.
2. Le vérifieur tire des positions, et le prouveur ouvre les colonnes de la table à ces positions. C'est la seule ouverture de la table pour tout le lot.
3. Chaque colonne ouverte, pliée par le vérifieur lui-même, donne une affirmation linéaire sur la ligne pliée. Les réponses hors domaine de la table ([[hors-domaine]]), pliées de la même façon, en donnent une de plus.
4. Le prouveur calcule $\Omega$ à partir de la ligne pliée, avec les facteurs de place, et s'engage sur lui.
5. Des tests de proximité ([[test-proximite]]) prouvent toutes ces affirmations linéaires sur les deux vecteurs.

À la différence de [[engagement-colonnes]], la ligne pliée n'est pas envoyée en clair : elle a $402\,653\,184$ entrées (`prover/examples/target_full_f2/policy.txt`, ligne `table`), donc le prouveur s'engage sur elle et la fait tester (`blocks/iop/foldeq.h:26-34`).

## La seconde chaîne

Il reste à relier chaque requête à $\Omega$. La **seconde chaîne** d'une requête part des deux sceaux, celui de sa première chaîne et celui de la chaîne partagée, et un test de proximité y prouve les deux affirmations linéaires

$$
\begin{aligned}
\langle w, e \rangle + \mu &= v \\
\langle w, e^* \rangle &= \langle g, \Omega \rangle
\end{aligned}
$$

sur les deux vecteurs engagés $w$ et $\Omega$ (`docs/protocol.md` §6.3 ; `blocks/iop/lin.h:220-222`, affirmations (Eval) et (Dot)).

Chaque requête reçoit ainsi un fichier de preuve en cinq parties : un en-tête qui nomme la table, sa première chaîne, sa place dans le lot, la chaîne partagée, et sa seconde chaîne. La chaîne partagée est la même, octet pour octet, dans tous les fichiers du lot (`docs/protocol.md` §6.3).

## L'ordre des tirages

La borne de Schwartz-Zippel suppose que $w$ est fixé avant que $\psi^*$ soit tiré.

:::exercice ★★
Supposez que le prouveur du jouet connaisse $\psi^* = (3, 5)$ avant de s'engager sur $w$. Trouvez un $w \neq gM$ qui passe les deux contrôles avec la valeur fausse $v = 53$.

:::reponse
On cherche $d = w - gM$ non nul avec deux conditions :

$$
\begin{aligned}
\langle d, e \rangle &= 53 - 51 = 2 \\
\langle d, e^* \rangle &= 0
\end{aligned}
$$

Ce sont deux équations linéaires à quatre inconnues, et leurs coefficients $e$ et $e^*$ ne sont pas proportionnels, donc le système a des solutions. Toute solution est non nulle, puisque $\langle d, e \rangle = 2$. Avec $d_3 = 0$, la première donne $d_0 + 3d_1 = 2$ et la seconde $8d_0 - 12d_1 - 10d_2 = 0$. Le choix $d_0 = -1$, $d_1 = 1$ satisfait la première, et la seconde donne alors $-20 - 10d_2 = 0$, donc $d_2 = -2$.

Avec $d = (-1, 1, -2, 0)$, le prouveur s'engage sur $w = (11, 10, 3, 6)$ :

$$
\begin{aligned}
\langle w, e \rangle &= 11 + 30 + 0 + 12 = 53 \\
\langle w, e^* \rangle &= 88 - 120 - 30 + 90 = 28 = \langle g, \Omega \rangle
\end{aligned}
$$

Les deux contrôles passent avec une valeur fausse.
:::
:::

Dans la preuve d'une seule requête, la [[fiat-shamir|chaîne de hachage]] fixe cet ordre, puisque chaque défi est le hachage de ce qui précède. Mais $\psi^*$ est partagé : il doit être tiré après que toutes les requêtes du lot ont fixé leur $w$, donc il doit dépendre de toutes les premières chaînes.

FlashProve fait finir chaque première chaîne par un **sceau**, le condensé sur lequel les chaînes suivantes se construisent. Les sceaux du lot sont les feuilles d'un petit [[merkle|arbre de Merkle]] salé, l'**arbre du lot**, dont la racine entre dans l'énoncé de la chaîne partagée et y remplace les octets aléatoires du départ (`docs/protocol.md` §6.3, « The slot » ; FORMAT R7.18, qui l'appelle *binding tree*). Le défi $\psi^*$ dépend donc de chaque $w$.

Un fichier de preuve contient la place de sa requête dans l'arbre, le sel de sa feuille et son chemin. Le vérifieur en recalcule la racine, à partir du sceau de la requête, et s'en sert comme entrée de la chaîne partagée, sans avoir besoin des autres requêtes (FORMAT R7.18). Les requêtes occupent des places tirées au hasard et les places vides reçoivent des condensés aléatoires, pour que le fichier ne montre ni la taille du lot ni les autres requêtes ; la durée d'un lot révèle quand même sa taille (`docs/protocol.md` §6.3).

:::figure L'ordre d'un lot de trois requêtes. Les sceaux des premières chaînes sont les feuilles de l'arbre du lot, dont la racine précède le tirage de $\psi^*$. Chaque seconde chaîne part du sceau de sa requête et de celui de la chaîne partagée.
<svg viewBox="0 0 480 296" role="img" aria-label="Trois requêtes, 1, 2 et 3. Chacune a une première chaîne qui s'engage sur son vecteur w et finit par un sceau. Les trois sceaux sont les feuilles de l'arbre du lot, et sa racine entre dans la chaîne partagée, unique pour le lot, qui tire psi étoile, plie la table, ouvre 64 colonnes et s'engage sur Omega. Chaque requête a ensuite une seconde chaîne qui prouve que le produit de w par e plus mu vaut v, et que le produit de w par e étoile vaut le produit de g par Omega."><text x="80" y="14" class="m s mid">requête 1</text><text x="240" y="14" class="m s mid">requête 2</text><text x="400" y="14" class="m s mid">requête 3</text><rect x="10" y="22" width="140" height="44" class="box"/><text x="80" y="40" class="b s mid">première chaîne</text><text x="80" y="58" class="s mid">w₁, puis un sceau</text><rect x="170" y="22" width="140" height="44" class="box"/><text x="240" y="40" class="b s mid">première chaîne</text><text x="240" y="58" class="s mid">w₂, puis un sceau</text><rect x="330" y="22" width="140" height="44" class="box"/><text x="400" y="40" class="b s mid">première chaîne</text><text x="400" y="58" class="s mid">w₃, puis un sceau</text><line x1="80" y1="66" x2="80" y2="92" class="l" marker-end="url(#fa)"/><line x1="240" y1="66" x2="240" y2="92" class="l" marker-end="url(#fa)"/><line x1="400" y1="66" x2="400" y2="92" class="l" marker-end="url(#fa)"/><rect x="10" y="96" width="460" height="30" class="dim"/><text x="240" y="115" class="s mid">arbre du lot : les trois sceaux en feuilles, puis sa racine</text><line x1="240" y1="126" x2="240" y2="148" class="lc" marker-end="url(#fac)"/><rect x="10" y="152" width="460" height="44" class="ring"/><text x="240" y="170" class="b s mid">chaîne partagée, une par lot</text><text x="240" y="188" class="s mid">tire ψ*, plie la table, ouvre 64 colonnes, s'engage sur Ω</text><line x1="80" y1="196" x2="80" y2="222" class="lc" marker-end="url(#fac)"/><line x1="240" y1="196" x2="240" y2="222" class="lc" marker-end="url(#fac)"/><line x1="400" y1="196" x2="400" y2="222" class="lc" marker-end="url(#fac)"/><rect x="10" y="226" width="140" height="62" class="box"/><text x="80" y="244" class="b s mid">seconde chaîne</text><text x="80" y="262" class="s mid">⟨w₁, e₁⟩ + μ₁ = v₁</text><text x="80" y="279" class="s mid">⟨w₁, e*⟩ = ⟨g₁, Ω⟩</text><rect x="170" y="226" width="140" height="62" class="box"/><text x="240" y="244" class="b s mid">seconde chaîne</text><text x="240" y="262" class="s mid">⟨w₂, e₂⟩ + μ₂ = v₂</text><text x="240" y="279" class="s mid">⟨w₂, e*⟩ = ⟨g₂, Ω⟩</text><rect x="330" y="226" width="140" height="62" class="box"/><text x="400" y="244" class="b s mid">seconde chaîne</text><text x="400" y="262" class="s mid">⟨w₃, e₃⟩ + μ₃ = v₃</text><text x="400" y="279" class="s mid">⟨w₃, e*⟩ = ⟨g₃, Ω⟩</text></svg>
:::

:::piege
**Confondre $e$ et $e^*$.** Le vecteur $e$ appartient à la requête : il vient de sa première chaîne et entre dans sa valeur $v$. Le vecteur $e^*$ appartient au lot : il vient de la chaîne partagée, tiré après tous les sceaux, et ne sert qu'à contrôler $w = gM$.
:::

## Le budget d'une table

On compte maintenant ce que le lot change au budget d'ouvertures. Une table dont chaque ligne a une queue de $r$ coefficients aléatoires cache au plus $r$ colonnes ouvertes, sur toute sa vie ([[zero-knowledge]]). Au-delà, d'après FlashProve, « columns shown beyond the limit give exact linear equations in the weights » (`docs/glossary.md`, « Limit »). Sans lots, chaque requête ouvre ses colonnes, et la table sert un nombre de requêtes égal au budget divisé par les colonnes d'une ouverture. Avec des lots, chaque lot ouvre ces colonnes une fois, pour toutes ses requêtes.

FlashProve sert ses lots sur des copies de la table, les **tables feuilles**, dont chaque ligne a une queue de $r = 44\,040\,191$ coefficients aléatoires (`policy.txt`, ligne `table`). Chacune a déjà ouvert 62 de ses colonnes pour la preuve qui la relie à la première table, et chaque lot en ouvre 64 (`docs/limits-all-rows.tsv`, ligne H5 ; `docs/protocol.md` §4, §6.2). Avant chaque lot, le prouveur ajoute ces 64 colonnes au compteur de la table, sur disque, et il n'ouvre rien avant que le disque ait confirmé l'écriture (`docs/protocol.md` §6.3, étape 2). Un lot compte dès qu'il commence, qu'il soit plein ou non, qu'il réussisse ou non (`docs/protocol.md` §4, point 2).

:::exercice ★
Une table feuille sert $\lfloor (44\,040\,191 - 62)/64 \rfloor = 688\,127$ lots, le compte fait au chapitre [[cacher]]. Combien de requêtes sert-elle au plus, avec des lots pleins de 64 ? Combien en servirait-elle si chaque requête ouvrait elle-même ses 64 colonnes ? Combien de colonnes du budget restent inutilisées ?

:::reponse
Avec des lots pleins, la table sert $688\,127 \times 64 = 44\,040\,128$ requêtes, contre $688\,127$ si chaque requête ouvrait ses 64 colonnes elle-même : le lot multiplie par 64 le nombre de requêtes servies.

Le lien et les lots dépensent $62 + 44\,040\,128 = 44\,040\,190$ colonnes, donc il en reste une, qui ne suffit pas à un lot de plus.
:::
:::

:::piege
**Compter les colonnes par requête.** Le budget se dépense par lot : un lot de 64 requêtes et un lot d'une seule requête ouvrent tous deux 64 colonnes. Un lot à moitié vide use donc la table autant qu'un lot plein.
:::

:::note
Ce que FlashProve démontre en Lean sur le zero-knowledge porte sur une requête par preuve et une table feuille, et ne couvre pas les lots, que les programmes servent pourtant (`guide/weight-hiding.md`, « What bounds that »). Le compteur de la table compte des lots, alors que le nombre 688 127 qui apparaît dans les théorèmes compte des réponses (`guide/weight-hiding.md`, « The counter »).
:::
