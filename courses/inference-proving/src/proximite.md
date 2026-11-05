---
id: proximite
---
Le chapitre [[engager]] contrôle la ligne pliée en quelques positions, et les deux derniers exercices de [[engagement-colonnes]] ont montré ce que ce contrôle ne voit pas : un mot qui ne diffère d'un mot du code qu'en une position passe presque toujours, et une table proche de deux mots du code laisse au prouveur le choix entre deux valeurs. Ce chapitre montre d'abord quels mots sont dangereux : ceux qui sont loin de tout mot du code. Il mesure ensuite cet écart et ce qu'il coûte de le détecter ([[distance]]), et il montre pourquoi le test peut ne regarder qu'une ligne pliée. Il explique pourquoi FlashProve va plus loin que le rayon du décodage unique, et comment une question posée hors du domaine fixe alors le mot du code dont parle le prouveur ([[hors-domaine]]). Il finit par le test complet, appliqué à la table des poids du réseau : plier les lignes par un sumcheck, puis envoyer la dernière ligne ([[test-proximite]]).

## Le tricheur presque honnête

On reprend le tricheur de [[engagement-colonnes]]. Il s'engage sur deux lignes, $\Enc(5, 1)$ et $\Enc(3, 4)$ altéré en la seule position 5, sur le domaine $D_8$. Il envoie la vraie ligne pliée en $\gamma = 6$, $u = (90, 19)$, et le contrôle n'échoue qu'en la position 5. Avec $t = 2$ positions, il passe avec probabilité $(7/8)^2 \approx 0{,}77$.

Ce tricheur n'a rien gagné, puisqu'il a envoyé la vraie ligne $u$ et défend donc la vraie valeur. Pour annoncer une autre valeur, il doit envoyer une autre ligne $u'$.

:::exercice ★★
Le tricheur envoie $u' \neq (90, 19)$. En combien de positions au moins le contrôle échoue-t-il ? Avec $t = 2$ positions, bornez sa chance de passer. (Le code a $\ell = 2$ et $n = 8$, donc deux mots du code différents diffèrent en au moins 7 positions.)
:::reponse
$\Enc(u')$ et $\Enc(u)$ diffèrent en au moins 7 positions. Les colonnes pliées valent $\Enc(u)$ partout sauf peut-être en la position 5. Parmi les positions où $\Enc(u')$ diffère de $\Enc(u)$, une au plus est la position 5, donc $\Enc(u')$ diffère des colonnes pliées en au moins 6 positions.

Une position tirée passe donc avec probabilité au plus $2/8$, et deux positions avec probabilité au plus $(2/8)^2 = 1/16$.
:::
:::

La position altérée laisse la ligne à distance 1 de $\Enc(3, 4)$, sous le rayon du décodage unique, qui vaut 3 pour ce code ([[distance]]). La ligne désigne donc toujours le message $(3, 4)$, et un faux $u'$ se voit presque partout. Une ligne proche d'un seul mot du code n'est pas dangereuse.

Le raisonnement de l'exercice ne tient plus pour une ligne loin de tout mot du code. Une telle ligne ne désigne aucun message, donc aucune ligne $u$ n'est « la vraie », et l'affirmation ne porte sur aucun poids. Il faut donc montrer qu'une telle ligne fait échouer le contrôle quel que soit le $u$ envoyé.

## Ce que le test doit garantir

On demande donc au test : si une ligne engagée est à distance relative au moins $\delta$ du code, le vérifieur rejette, sauf avec une probabilité d'environ $(1 - \delta)^t$. Ce nombre vient de [[distance]] : si les colonnes pliées forment un mot à distance au moins $\delta$ du code, elles diffèrent de $\Enc(u)$ en au moins $\delta n$ positions, quel que soit le $u$ envoyé, et $t$ positions tirées indépendamment les manquent toutes avec probabilité au plus $(1 - \delta)^t$.

La table des poids du réseau a des lignes de $\ell = 8$ places encodées sur $n = 32$ points. Sa distance minimale vaut $d = 32 - 8 + 1 = 25$, donc le décodage unique corrige $\lfloor 24/2 \rfloor = 12$ erreurs, et notre test prend $\delta = 12/32 = 0{,}375$.

:::exercice ★
Notre prouveur ouvre $t = 8$ positions à $\delta = 0{,}375$. Quelle probabilité de laisser passer une ligne à cette distance ? Combien de bits ?
:::reponse
$$(1 - 0{,}375)^8 = 0{,}625^8 \approx 0{,}0233$$

soit $8 \log_2(1/0{,}625) \approx 5{,}4$ bits.
:::
:::

Dans $\mathbb{F}_{97}$, aucun code n'a plus de 32 positions ([[domaine]]), donc une ligne de 8 places a un rendement d'au moins $1/4$, et le rayon du décodage unique ne dépasse pas $0{,}375$. Chaque position n'y donne que $0{,}68$ bit. Le chapitre [[prouveur-complet]] compte ces bits avec les autres ([[securite]]).

## Plier sans rapprocher du code

Le vérifieur ne compare pas chaque ligne au code : il compare $\Enc(u)$ aux colonnes pliées. Si des lignes loin du code avaient un pli proche du code, le test ne les verrait pas.

:::exercice ★★
Le vérifieur plie en $\gamma = 6$, et le prouveur connaît ce défi avant de s'engager. Montrez qu'il peut engager deux lignes loin du code dont le pli est un mot du code $c$ choisi d'avance. (Partez d'une ligne 0 quelconque loin du code, et cherchez la ligne 1.)
:::reponse
Il prend pour ligne 0 un mot $f$ loin du code, et pour ligne 1

$$r_1 = \frac{c - (1 - \gamma) f}{\gamma}$$

Le pli vaut alors $(1 - \gamma) f + \gamma r_1 = c$, un mot du code, et toutes les positions passent avec $u$ le message de $c$.

La ligne 1 est aussi loin du code que $f$ : multiplier un mot par une constante non nulle et lui ajouter un mot du code ne change pas sa distance au code, parce que ces deux opérations envoient le code sur lui-même. Le notebook le fait avec $f = (3, 1, 4, 1, 5, 9, 2, 6)$, à distance 6 du code, et $c = \Enc(90, 19)$.
:::
:::

Le défi du pliage doit donc être tiré après la racine. Pour un défi tiré au hasard après la racine, on admet un résultat sur les codes, que [[test-proximite]] énonce et illustre : si une ligne est à distance au moins $\delta$ du code, avec $\delta$ sous le rayon de Johnson, le pli est lui aussi à distance au moins $\delta$, sauf pour une petite part des défis. Le test peut donc ne regarder que la ligne pliée.

## Plus loin que le décodage unique

Chaque position donne $\log_2(1/(1 - \delta))$ bits, donc un test qui garantit une plus grande distance ouvre moins de positions. FlashProve se place près du rayon de Johnson ([[distance]]) : sa table des poids a un rendement d'environ $0{,}104$, un rayon de Johnson d'environ $0{,}6775$, et le test prend $\delta = 0{,}66407$ (`docs/format/08-parameters.md` §8.5 : rendement 0,104004, distance 0,664066).

:::exercice ★★
Un lot de FlashProve ouvre 64 colonnes de la table à $\delta = 0{,}66407$, ce qui donne $64 \log_2\big(1/(1 - 0{,}66407)\big) \approx 100{,}72$ bits : c'est le nombre que donnent les tests de FlashProve pour ce tour, « 100.72 by the lists + 28 by work » (`verifier/tests/known_answers/kit_rounds/target_full_f2.txt`), les 28 autres bits venant d'une preuve de travail ([[fiat-shamir]]). Combien de colonnes faudrait-il au rayon du décodage unique, $\delta = (1 - \rho)/2 \approx 0{,}448$, pour le même nombre de bits ?
:::reponse
À $\delta = 0{,}448$, une colonne donne $\log_2(1/0{,}552) \approx 0{,}857$ bit, donc il en faudrait $100{,}72/0{,}857 \approx 117{,}5$, soit 118 colonnes au lieu de 64.
:::
:::

Au-delà du rayon du décodage unique, une ligne engagée peut être proche de plusieurs mots du code, et le prouveur pourrait parler de l'un dans une affirmation et d'un autre dans la suivante. FlashProve l'en empêche par l'[[hors-domaine|échantillon hors domaine]] : juste après l'engagement, le vérifieur tire un point $z$, le prouveur donne la valeur de l'extension multilinéaire de son message en $z$, et ce nombre désigne un seul mot de la liste. Aucune position n'est tirée avant cette réponse.

Notre prouveur reste au rayon du décodage unique. Chaque ligne y est proche d'au plus un mot du code, donc il n'a pas besoin d'échantillon hors domaine, et il paie ce choix en positions.

:::piege
**Proche du code n'est pas égal à un mot du code.** Le test ne montre pas que chaque ligne engagée est un mot du code : la ligne altérée en une position passe presque toujours. Il montre que chaque ligne est proche d'un mot du code, et c'est ce mot, et son message, que les affirmations engagent. Dans le régime de Johnson, cela ne vaut qu'une fois la réponse hors domaine donnée, et FlashProve refuse de tirer des positions avant (`blocks/README.md`, règle 6).
:::

## Le test sur la table des poids

Le chapitre [[engager]] a laissé l'affirmation de la couche 2 sur la table des poids :

$$\tilde w(6, 9, 2, 5, 1) = 31$$

Les deux premières coordonnées indexent les 4 lignes de la table, et les trois autres ses 8 places. L'affirmation s'écrit donc $\langle c, m \rangle = 31$, avec les coefficients

$$c_{b,j} = \eq((6, 9), b) \cdot e_j, \qquad e = \eq((2, 5, 1), \cdot) = (0, 0, 0, 0, 4, -8, -5, 10)$$

Le chapitre [[engager]] pliait les lignes en $(6, 9)$ et le prouveur envoyait la ligne pliée. Notre test plie plutôt par un sumcheck sur les 2 variables de ligne, avec des défis tirés après la racine. Il le fait parce que le chapitre [[prouveur-complet]] regroupe cette affirmation avec celle de la couche 1, dont les poids de ligne sont les entrées $x_b$, et avec d'autres : l'affirmation regroupée n'a plus de point de pli unique ([[test-proximite]] le montre). On fait ici le test sur la seule affirmation 31, pour suivre chaque nombre.

Notre prouveur tire ses défis dans $\mathbb{E}_{97}$. Pour calculer à la main, on prend des défis dans $\mathbb{F}_{97}$, et chaque calcul reste le même.

Au premier tour, le prouveur envoie

$$g_1(X) = 36 + 28X + 28X^2$$

:::exercice ★
Vérifiez que $g_1(0) + g_1(1)$ vaut l'affirmation 31, puis calculez l'affirmation suivante $g_1(2)$, pour le défi $\gamma_1 = 2$.
:::reponse
$g_1(0) + g_1(1) = 36 + (36 + 28 + 28) = 128 \equiv 31$.

$g_1(2) = 36 + 56 + 112 = 204 \equiv 10$.
:::
:::

Au second tour, le prouveur envoie $g_2(X) = 15 + 64X + 13X^2$, qui vérifie $g_2(0) + g_2(1) = 15 + 92 = 107 \equiv 10$. Le défi $\gamma_2 = 3$ donne la dernière affirmation :

$$\tau' = g_2(3) = 15 + 192 + 117 = 324 \equiv 33$$

La ligne pliée en $\gamma = (2, 3)$ a pour poids $\eq((2, 3), \cdot) = (2, -4, -3, 6)$ :

$$u = 2 m_0 - 4 m_1 - 3 m_2 + 6 m_3 = (-1, 13, -9, 5, 4, 8, -1, -10)$$

La ligne $u$ a 8 places, donc le prouveur l'envoie : c'est le cas de base. Il reste au vérifieur les coefficients pliés $c' = c(\gamma)$.

:::exercice ★★
Montrez que $c' = \eq((6, 9), (2, 3)) \cdot e$, et calculez $c'$. Le vérifieur a-t-il besoin de la table pour cela ?
:::reponse
Chaque place de $c$ est le produit de $e_j$ par $\eq((6, 9), b)$, donc la plier en $\gamma$ multiplie $e_j$ par

$$\sum_b \eq((2, 3), b)\, \eq((6, 9), b) = 2 \times 40 - 4 \times (-48) - 3 \times (-45) + 6 \times 54 = 731 \equiv 52$$

C'est aussi la formule produit de $\eq$ : $(6 \times 2 + 5)(9 \times 3 + 16) = 17 \times 43 = 731$, parce que $b \mapsto \eq((6, 9), b)$ est multilinéaire et que son extension en $(2, 3)$ est donnée par la même formule.

$c' = 52\, e = (0, 0, 0, 0, 14, 69, 31, 35)$, soit $(0, 0, 0, 0, 14, -28, 31, 35)$. Le vérifieur n'a besoin que des points $(6, 9)$, $(2, 5, 1)$ et des défis, pas de la table.
:::
:::

:::exercice ★
Faites le contrôle B1 : $\langle c', u \rangle = \tau'$.
:::reponse
Seules les places 4 à 7 comptent :

$$14 \times 4 - 28 \times 8 + 31 \times (-1) + 35 \times (-10) = 56 - 224 - 31 - 350 = -549 \equiv 33$$

C'est bien $\tau' = 33$.
:::
:::

Le vérifieur tire enfin $t = 8$ positions parmi les 32, ouvre ces colonnes de la table, plie chacune avec les poids $(2, -4, -3, 6)$ et compare le pli au symbole de $\Enc(u)$ : c'est le contrôle B2. Le notebook tire les positions et fait les 8 comparaisons, qui passent pour le prouveur honnête. Si une ligne de la table était à distance au moins $0{,}375$ du code, le pli le serait aussi sauf pour une petite part des défis, et les 8 positions la laisseraient passer avec probabilité au plus $0{,}023$.

## Notre prouveur et FlashProve

| | notre réseau | FlashProve |
|---|---|---|
| régime | décodage unique, $\delta = 0{,}375$, pas d'échantillon hors domaine | rayon de Johnson moins une marge, $\delta = 0{,}6640$ pour la table, liste d'au plus 26 mots (`docs/format/08-parameters.md` §8.5 ; paper p.14, p.62) |
| positions | $t = 8$, environ 5,4 bits | 64 colonnes par lot ; 62 dans le fichier de clé et pour les liens ; 219 pour le premier test d'un segment, à $\delta = 0{,}2901$ (paper p.14 ; D1 §4.3 ; 64 et 62 aussi dans `docs/format/08-parameters.md` §8.5) |
| étapes | plier, puis cas de base | regrouper, puis plier et changer de code à chaque étage, puis cas de base ; $2^3$ à $2^5$ lignes pliées par étage (`policy.txt`, `blocks/frame/parameters.h` ; D1 §4.1-4.2) |
| origine | | CFW26, constructions 6.3, 9.7 et 7.2, « with changes » (paper p.78 ; D1 §4.4) |

Notre test plie 4 lignes en une, et la ligne pliée, 8 nombres, est envoyée en clair. Dans FlashProve, une ligne pliée de la table a des centaines de millions d'entrées, donc chaque étage s'engage sur elle par un nouveau code plus court et recommence, jusqu'à une ligne assez courte pour le cas de base ([[test-proximite]]). Le cas de base de FlashProve envoie une copie masquée de cette ligne, que le chapitre [[cacher]] construit.

## La suite

Le test porte une seule affirmation, et le vérifieur y tire lui-même ses défis et ses positions. Le chapitre [[prouveur-complet]] regroupe toutes les affirmations sur les poids en une, remplace le vérifieur par une chaîne de hachage, et compte en bits l'erreur de chaque tour, dont les $5{,}4$ bits des positions.

## Quiz

:::quiz
1. Qu'est-ce que la distance relative d'un mot au code ?
2. Pourquoi la probabilité de laisser passer un mot loin du code vaut-elle au plus $(1 - \delta)^t$ ?
3. Pourquoi le défi du pliage doit-il être tiré après la racine ?
4. À quoi sert l'échantillon hors domaine, et pourquoi notre prouveur n'en a-t-il pas besoin ?
5. Que fait le pliage d'un groupe de $2^k$ lignes ?
6. Que fait le cas de base ?
:::reponse Réponses
1. La plus petite part des positions où il diffère d'un mot du code.
2. Le mot comparé diffère du mot du code de référence en au moins une part $\delta$ des positions, donc chaque position tirée passe avec probabilité au plus $1 - \delta$, et les $t$ tirages sont indépendants.
3. Un prouveur qui connaît le défi peut engager des lignes loin du code dont le pli en ce défi est un mot du code.
4. À fixer un seul mot du code quand plusieurs sont proches du mot engagé, avant tout tirage de positions. Notre prouveur reste au rayon du décodage unique, où chaque ligne est proche d'au plus un mot du code.
5. Un sumcheck sur les $k$ variables de ligne, qui ramène l'affirmation sur $2^k$ lignes à une affirmation sur une seule ligne virtuelle, pliée en un point tiré au hasard.
6. Il envoie la dernière ligne en clair, contrôle l'affirmation sur elle (B1), et compare son encodage aux colonnes pliées en $t$ positions (B2).
:::
:::
