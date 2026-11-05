---
id: zero-knowledge
---
Une preuve doit convaincre le vérifieur que le calcul est juste sans rien lui apprendre sur les poids. Or une table engagée et contrôlée comme dans [[engagement-colonnes]] lui montre des combinaisons des poids : les symboles des colonnes ouvertes, et la ligne pliée envoyée en clair. Cette page dit d'abord précisément ce que « ne rien apprendre » veut dire. Elle construit ensuite un masque pour chaque endroit où la preuve montre une combinaison des poids : une queue aléatoire pour les colonnes ouvertes, avec la borne qu'elle impose au nombre d'ouvertures, un sel pour les colonnes fermées, un pad pour les réponses hors domaine et un mot masquant pour la ligne pliée. Elle finit par ce que FlashProve prouve de ces masques, et ce qu'il laisse voir.

## Ce que veut dire ne rien apprendre

Le vérifieur lit des messages, tire des défis et ouvre des colonnes. On appelle **vue** l'ensemble de ce qu'il a lu à la fin de la preuve. La vue dépend des poids, puisque le prouveur s'en sert pour répondre, et la question est de savoir si on peut en tirer quelque chose sur eux.

On répond par une comparaison. Un **simulateur** est un programme qui n'a pas les poids et ne connaît que l'énoncé. S'il produit des vues qui ont exactement la même loi que les vraies, la vue n'apprend rien sur les poids : tout ce qu'on calculerait à partir d'une vraie vue, on le calculerait aussi bien à partir d'une vue simulée, fabriquée sans eux. Une preuve qui a un tel simulateur est **zero-knowledge**. Dans cette page, le vérifieur suit le protocole et tire ses défis au hasard ; la dernière section dit ce que FlashProve prouve contre un vérifieur quelconque.

Dans une table engagée, la vue contient les symboles des colonnes ouvertes. Sans aléa, ces symboles sont fixés par les poids, donc un simulateur qui ne les a pas ne peut pas les produire. On cherche donc un encodage où les symboles de quelques positions sont uniformes et indépendants du message : le simulateur n'aura qu'à tirer des nombres au hasard.

## La queue aléatoire

Il faut ajouter de l'aléa aux symboles sans perdre ce qui fait marcher l'engagement : chaque ligne doit rester un mot d'un code de [[reed-solomon|Reed-Solomon]], pour que le pliage et le test des colonnes s'appliquent. On ajoute donc au polynôme de la ligne un polynôme aléatoire. On place le message dans d'autres coefficients que lui, sinon la somme ne désignerait plus un seul message :

$$P(X) = \sum_{j<r} \eta_j X^j + \sum_{j<\ell} m_j X^{r+j}$$

Les $r$ coefficients $\eta_0, \dots, \eta_{r-1}$ sont tirés uniformément et gardés secrets : c'est la **queue aléatoire**. Le code a maintenant la dimension $\ell + r$. En une position de point $z$, le symbole est la somme d'une partie aléatoire et d'une partie fixée par le message :

$$P(z) = \sum_{j<r} \eta_j z^j + \sum_{j<\ell} m_j z^{r+j}$$

On cherche ce que voient $r$ positions, en commençant par le plus petit cas : $\ell = 2$ et $r = 2$ sur le domaine $D_8 = (7, 90, 40, 57, 38, 59, 37, 60)$ de [[domaine]], donc $P(X) = \eta_0 + \eta_1 X + m_0 X^2 + m_1 X^3$. Avec $m = (5, 1)$ et $\eta = (2, 7)$, le mot vaut $(57, 49, 17, 79, 86, 2, 44, 70)$.

:::exercice ★★
Retrouvez les symboles 57 et 49 du mot de $m = (5, 1)$, $\eta = (2, 7)$ en positions 0 ($z = 7$) et 1 ($z = -7$). Trouvez ensuite une queue qui donne les mêmes deux symboles pour le message $(0, 0)$.
:::reponse
On a $P(X) = 2 + 7X + 5X^2 + X^3$, donc :

$$
\begin{aligned}
P(7) &= 2 + 49 + 245 + 343 = 639 \equiv 57 \\
P(-7) &= 2 - 49 + 245 - 343 = -145 \equiv 49
\end{aligned}
$$

Pour le message $(0, 0)$, il ne reste que la queue, $\eta_0 + \eta_1 X$, et on cherche :

$$
\begin{aligned}
\eta_0 + 7\eta_1 &= 57 \\
\eta_0 - 7\eta_1 &= 49
\end{aligned}
$$

La somme donne $2\eta_0 = 106$, donc $\eta_0 = 53$. La différence donne $14\eta_1 = 8$. Comme $14 \times 7 = 98 \equiv 1$, l'inverse de 14 vaut 7, et $\eta_1 = 56$.
:::
:::

Un vérifieur qui ouvre les positions 0 et 1 lit donc 57 et 49 dans les deux cas, et rien ne lui indique lequel des deux messages a été encodé. Il reste à montrer que ce n'est pas propre à ces valeurs.

:::exercice ★★★
Soient $z_0, \dots, z_{r-1}$ des points distincts. Montrez que l'application qui envoie $\eta$ sur $\big(\sum_{j<r} \eta_j z_i^j\big)_{i<r}$ est une bijection de $\F^r$ dans $\F^r$. Déduisez-en que, si la queue est uniforme, les symboles de $r$ positions distinctes sont uniformes, quel que soit le message.
:::reponse
L'application est linéaire, d'un espace de dimension $r$ dans un espace de même dimension. Il suffit donc de montrer que seule la queue nulle donne $(0, \dots, 0)$. Si $\sum_{j<r} \eta_j z_i^j = 0$ pour tout $i$, le polynôme $\sum_{j<r} \eta_j X^j$, de degré au plus $r - 1$, a $r$ racines distinctes. Un polynôme non nul de degré au plus $r - 1$ a au plus $r - 1$ racines ([[polynomes]]), donc ce polynôme est nul et $\eta = 0$. L'application est injective, donc bijective. Sa matrice, $(z_i^j)$, s'appelle une matrice de Vandermonde.

Une bijection envoie la loi uniforme sur la loi uniforme : quand $\eta$ parcourt les $|\F|^r$ queues, la partie aléatoire prend chaque valeur de $\F^r$ une fois. Le message ajoute à cette partie un vecteur fixé, et ajouter un vecteur fixé est encore une bijection. Les $r$ symboles sont donc uniformes, et leur loi ne dépend pas du message.
:::
:::

Le simulateur des positions ouvertes est donc simple : il tire $r$ nombres uniformes. FlashProve énonce la même propriété dans son code (`blocks/code/code.h`, commentaire de `hiding_positions`), d'après l'encodage zero-knowledge des codes de Reed-Solomon de CFW26 (Prop. 3.19, cité par D1 §2.1).

:::note
La place basse de la queue n'est pas ce qui cache. Aux puissances $X^\ell, \dots, X^{\ell + r - 1}$, la partie aléatoire vaudrait $z^\ell \sum_{j<r} \eta_j z^j$, et le facteur $z^\ell$ n'est jamais nul sur $7 \cdot H_n$, donc l'argument de l'exercice vaut encore. FlashProve met la queue en bas parce qu'il suit l'encodage de CFW26 (`blocks/code/code.h`, en-tête).
:::

## Une position de trop

La queue a $r$ coefficients, et on cherche ce qui se passe quand le vérifieur ouvre une position de plus.

:::exercice ★★
Reprenez les deux mots de l'exercice 1 : $(5, 1)$ avec la queue $(2, 7)$, et $(0, 0)$ avec la queue $(53, 56)$. Que vaut chacun en position 2 ($z = 40$) ? Qu'en conclut un vérifieur qui ouvre les positions 0, 1 et 2 ?
:::reponse
Le premier mot vaut 17 en position 2. Le second vaut $53 + 56 \times 40 = 2293 \equiv 62$. Les symboles des positions 0 et 1 fixent, pour chaque message, une seule queue, donc le symbole de la position 2 n'a plus aucune liberté : il vaut 17 si le message est $(5, 1)$ et 62 s'il est $(0, 0)$. Le vérifieur qui lit 17 sait que le message n'est pas $(0, 0)$.
:::
:::

Le même raisonnement vaut en général. Pour un message donné, les symboles de $r$ positions ouvertes fixent la queue (exercice 2), donc chaque position suivante a une valeur fixée par le message et par ces $r$ symboles. Chaque position au-delà de $r$ donne ainsi une équation exacte sur le message. Le nombre de positions qu'une queue de $r$ coefficients cache s'appelle la **borne de requêtes**, ou **budget d'ouvertures**, et il vaut $r$ (`blocks/code/code.h`, `hiding_positions` ; `docs/glossary.md`, « Query bound »).

La queue ne change pas d'une preuve à l'autre, donc ce budget se compte sur toute la vie de la ligne, toutes preuves confondues. Une position ouverte deux fois montre deux fois le même symbole, donc elle ne compte qu'une fois. Le chapitre [[cacher|Cacher les poids]] fait ce compte pour la table des poids du réseau.

:::piege
**Compter deux fois une position répétée.** Une position déjà ouverte ne dépense rien de plus : le vérifieur relit un symbole qu'il connaît (`blocks/code/code.h`). À l'inverse, deux preuves qui ouvrent des positions différentes dépensent chacune sa part du même budget.
:::

## Le sel

Les colonnes non ouvertes ne sont connues que par leur hachage, dans l'arbre de [[merkle|Merkle]]. Un hachage ne se retourne pas, mais il permet de confirmer une supposition : celui qui devine la colonne la hache et compare le résultat à la feuille.

:::exercice ★★
Une colonne de la table des poids du réseau contient 4 symboles de $\F_{97}$. Combien de colonnes possibles y a-t-il ? Pourquoi est-ce trop peu pour une feuille sans sel ?
:::reponse
Il y en a $97^4 = 88\,529\,281 \approx 2^{26{,}4}$. Un ordinateur calcule des millions de hachages par seconde : le notebook en essaie $97^2$, mesure son rythme, et en déduit qu'il lui faudrait moins d'une minute pour les essayer toutes. Celui qui le fait trouve la colonne dont le hachage est la feuille, donc le contenu d'une colonne fermée.
:::
:::

On ajoute donc à chaque feuille un **sel**, des octets aléatoires hachés avec la colonne, que le prouveur n'envoie que si la colonne est ouverte. Pour confirmer une colonne devinée, il faudrait aussi deviner le sel. FlashProve met 40 octets de sel par feuille, soit $2^{320}$ valeurs (`docs/format/08-parameters.md`, ligne `salt` ; `docs/glossary.md`, « Salt »).

## Le pad des réponses hors domaine

Quand le protocole pose une question hors domaine ([[hors-domaine]]), le prouveur répond $\tilde m(z) = \sum_j \eq(z, j)\, m_j$, une combinaison des entrées du message dont le vérifieur connaît les coefficients. FlashProve réserve pour cela, dans le message de chaque ligne, des entrées tirées au hasard, les **pads**, qui entrent dans la réponse avec un facteur $\beta$ non nul et connu : la réponse vaut $\tilde m(z) + \beta \cdot \mathrm{pad}$ (D1 §5.2, d'après paper p.15, déf. 4.3 ; `PUBLISHED-WORKS.md`, ligne de `send.h`, « the pad under a non-zero factor »). Le pad est uniforme et $\beta \neq 0$, donc $\beta \cdot \mathrm{pad}$ est uniforme, et la réponse l'est aussi, pour la même raison que les symboles sous la queue : ajouter un nombre fixé est une translation.

:::exercice ★★
Le prouveur répond à deux questions hors domaine sur la même ligne avec le même pad : $a = \tilde m(z) + \beta\,\mathrm{pad}$ et $a' = \tilde m(z') + \beta'\,\mathrm{pad}$. Que peut calculer le vérifieur ?
:::reponse
La combinaison $\beta' a - \beta a'$ élimine le pad :

$$\beta' a - \beta a' = \beta' \tilde m(z) - \beta\, \tilde m(z')$$

C'est une combinaison des entrées du message dont le vérifieur connaît les coefficients : la fuite revient. Chaque réponse demande son propre pad, comme chaque position ouverte dépense un coefficient de la queue. FlashProve donne un pad à chaque réponse (`docs/protocol.md` §7, « The OOD answers »).
:::
:::

## Le mot masquant de la ligne pliée

Dans le protocole de [[engagement-colonnes]], le prouveur envoie la ligne pliée $u$ en clair, et le cas de base du [[test-proximite]] fait de même avec la dernière ligne pliée. On note $\langle c, u \rangle = \tau$ l'affirmation qu'elle doit vérifier. Avec des queues, la ligne pliée a aussi une queue pliée $\eta_u$, la combinaison des queues des lignes avec les mêmes coefficients que $u$, et le prouveur l'envoie pour que le vérifieur puisse réencoder. Le vérifieur fait alors deux contrôles, l'un sur l'affirmation, l'autre à chaque position ouverte $x$, où $y(x)$ est la colonne ouverte pliée :

$$
\begin{aligned}
\langle c, u \rangle &= \tau \\
\Enc(u, \eta_u)(x) &= y(x)
\end{aligned}
$$

$u$ est une combinaison des poids à coefficients connus. On ne peut pas lui ajouter un aléa quelconque, puisque les deux contrôles changeraient et que le vérifieur ne saurait plus quoi comparer. On lui ajoute donc une ligne entière, encodée comme les autres, dont le vérifieur peut lire la part dans chaque contrôle : un nombre annoncé pour le premier, les symboles ouverts pour le second. Le prouveur tire une ligne uniforme $M^*$ avec sa queue $\eta^*$, s'engage sur son mot $\Enc(M^*, \eta^*)$ dans un arbre, et envoie $\tau^* = \langle c, M^* \rangle$. Le vérifieur tire alors un défi $\lambda$, et le prouveur envoie :

$$M' = M^* + \lambda u, \qquad \eta' = \eta^* + \lambda \eta_u$$

On note $M^*(x)$ le symbole en $x$ du **mot masquant** $\Enc(M^*, \eta^*)$, que le vérifieur ouvre avec la colonne. Le produit scalaire et l'encodage sont linéaires, donc les deux contrôles deviennent :

$$
\begin{aligned}
\langle c, M' \rangle &= \tau^* + \lambda \tau \\
\Enc(M', \eta')(x) &= M^*(x) + \lambda\, y(x)
\end{aligned}
$$

FlashProve décrit ce cas de base masqué dans `docs/format/toys/1-product.md`, Part 3 §3, où la ligne pliée s'appelle $M_0$ et sa queue $R_0$.

:::exercice ★
On reprend le cas de base de [[test-proximite]] : $c = (82, 43)$, $u = (90, 19)$ et $\tau = 49$. Le prouveur tire $M^* = (10, 20)$, et le vérifieur tire $\lambda = 4$. Calculez $\tau^*$ et $M'$, puis faites le premier contrôle.
:::reponse
$\tau^* = 82 \times 10 + 43 \times 20 = 1680 \equiv 31$, et

$$M' = (10 + 4 \times 90, 20 + 4 \times 19) = (370, 96) \equiv (79, 96)$$

Le premier contrôle compare :

$$
\begin{aligned}
\langle c, M' \rangle &= 82 \times 79 + 43 \times 96 = 10\,606 \equiv 33 \\
\tau^* + \lambda \tau &= 31 + 196 = 227 \equiv 33
\end{aligned}
$$
:::
:::

$M'$ et $\eta'$ sont uniformes : $M^*$ et $\eta^*$ le sont, et leur ajouter les vecteurs fixés $\lambda u$ et $\lambda \eta_u$ est une translation. Le vérifieur ne lit donc plus rien de $u$. Les contrôles doivent pourtant toujours lier $u$, et c'est l'ordre des messages qui l'assure.

:::exercice ★★
Pourquoi le prouveur doit-il s'engager sur $M^*$ et annoncer $\tau^*$ avant de recevoir $\lambda$ ? Montrez comment un prouveur qui connaîtrait $\lambda$ d'avance ferait passer une affirmation fausse, $\langle c, u \rangle \neq \tau$.
:::reponse
Notons $\tau_0 = \langle c, u \rangle$ la vraie valeur. Un prouveur qui connaît $\lambda$ garde le vrai $M^*$ et annonce

$$\tau^* = \langle c, M^* \rangle + \lambda\,(\tau_0 - \tau)$$

Alors $\langle c, M' \rangle = \langle c, M^* \rangle + \lambda \tau_0 = \tau^* + \lambda \tau$ : le premier contrôle passe, et le second aussi, puisque $M'$ et $\eta'$ sont honnêtes.

Si $\lambda$ est tiré après $\tau^*$, le mensonge $\tau^* - \langle c, M^* \rangle$ doit valoir $\lambda (\tau_0 - \tau)$, avec $\tau_0 - \tau \neq 0$ : un seul $\lambda$ convient. L'engagement sur $M^*$ avant $\lambda$ sert au second contrôle : sans lui, le prouveur choisirait après coup les symboles $M^*(x)$, donc n'importe quel $M'$.
:::
:::

## Les sumchecks

Les polynômes de tour d'un sumcheck montrent eux aussi des sommes partielles des données. Leur masque, un polynôme aléatoire joint à la fonction sommée par un défi, a sa propre page : [[sumcheck-masque]].

:::piege
**Croire que le vérifieur contrôle les masques.** Rien dans les contrôles ne distingue une preuve masquée d'une preuve sans masques : une preuve qui a perdu un masque, par un bug ou une panne, peut être acceptée. Le masquage est l'affaire du prouveur seul (`docs/protocol.md` §3).
:::

## Ce que FlashProve prouve

FlashProve prouve en Lean que son protocole est zero-knowledge, pour un prouveur écrit en Lean, au sens de cette page : la vue d'un vérifieur, même tricheur, est simulée à partir des fichiers publics et des requêtes, à une distance statistique inférieure à $2^{-154}$. Le théorème vaut sous des conditions précises : un engagement avec une table feuille, une requête par preuve, la politique exact match, des masques neufs et vraiment aléatoires, au plus $2^{64}$ hachages et 688 127 réponses (`guide/weight-hiding.md`, tableau).

Le simulateur reçoit aussi un bit par requête : si elle a été servie ou refusée. Ce bit dépend des poids, et il est révélé (`guide/weight-hiding.md`, « In short »). Celui qui essaie chaque token possible pour une même invite apprend ainsi le token suivant du modèle par ce seul bit (paper p.38, remarque 6.44, d'après D3 §2.5 ; `docs/protocol.md` §7 : « over many requests these bits tell what the model answers »).

Le théorème ne couvre ni les lots, qui sont ce que les programmes servent, ni les programmes C++ et CUDA eux-mêmes (`guide/weight-hiding.md`, « What bounds that »). Ces programmes tirent leurs masques d'une graine secrète par ChaCha20, donc leur masquage est au mieux calculatoire (`docs/protocol.md` §7). Les auteurs concluent : « we expect, rather than know, that the programs hide the weights » (`guide/what-is-proved.md`).
