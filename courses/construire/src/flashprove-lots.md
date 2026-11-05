---
id: flashprove-lots
---
Notre preuve ouvre la table des poids pour chaque entrée, et le chapitre [[cacher|Cacher les poids]] a montré que chaque ouverture use un budget fixé à l'engagement. FlashProve sert jusqu'à 64 requêtes avec une seule ouverture de sa table, par un contrôle que le cours lit comme celui du [[freivalds|test de Freivalds]]. La page [[lots]] dérive ce contrôle et décrit les chaînes de FlashProve qui l'exécutent : on la travaille d'abord. Ce chapitre l'applique ensuite à notre réseau, avec deux entrées qui partagent une ouverture. Il lit enfin comment FlashProve organise ses tables autour de ce contrôle, puis ses paramètres et ses coûts mesurés : combien de colonnes, combien de bits, combien de secondes et de gigaoctets.

Comme le chapitre [[flashprove-modele|précédent]], c'est une lecture. FlashProve demande un GPU H100 et près de 300 Go de mémoire, donc on ne refait pas ses mesures : on refait leurs calculs.

## Une ouverture par entrée

Au chapitre [[prouveur-complet|Le prouveur complet]], la preuve d'une entrée regroupe toutes ses affirmations sur la table des poids en une seule, puis la contrôle par un pliage et un cas de base qui ouvrent 8 positions de la table ([[preuve-reseau]]). Le chapitre [[cacher|Cacher les poids]] a ajouté à chaque ligne une queue aléatoire de $r$ coefficients, qui cache $r$ positions ouvertes sur toute la vie de la table. Avec $r = 8$, la preuve faite une fois sur les poids ternaires épuise déjà ce budget, et il faut $r \ge 16$ pour servir une seule entrée. Même alors, la table jouet ne sert qu'une entrée, et chaque entrée de plus demanderait une nouvelle table.

FlashProve a le même problème à une autre échelle. Le chapitre [[cacher|Cacher les poids]] a compté qu'une de ses tables feuilles peut servir 688 127 contrôles de 64 colonnes. Si chaque requête faisait son propre contrôle, la table servirait donc 688 127 requêtes. On cherche à faire servir un seul contrôle à plusieurs requêtes.

## Deux entrées, une ouverture

On écrit d'abord notre table des poids comme FlashProve écrit la sienne, avec une matrice. La ligne $b$ de notre table est la colonne $b$ de $W_1$, suivie de la colonne $b$ de $W_2$ ([[preuve-reseau]]). On pose donc

$$M = \begin{pmatrix} W_1 \\ W_2 \end{pmatrix} = \begin{pmatrix} 0 & 1 & 1 & 1 \\ 0 & -1 & -1 & 1 \\ -1 & 1 & 1 & 0 \\ 1 & 0 & 1 & 1 \\ -1 & 0 & 0 & 1 \\ 1 & 0 & 0 & 1 \\ 0 & 1 & 1 & 1 \\ 0 & 1 & 0 & -1 \end{pmatrix}$$

une matrice de 8 lignes et 4 colonnes, dont la colonne $b$ est la ligne $b$ de la table : chaque ligne de notre table contient un bloc d'une seule colonne de $M$.

Une affirmation sur les poids prend alors la forme $g \cdot M \cdot e = v$ de la page [[lots]], où $g$ a un facteur par ligne de $M$ et $e$ un facteur par colonne. Dans la [[preuve-reseau|preuve du réseau]], la valeur $\tilde h(\zeta)$ devient une affirmation linéaire sur $W_1$, de coefficients publics $\eq(\zeta, i)\, x_k$ : $g$ porte les facteurs $\eq(\zeta, i)$ sur les quatre lignes de $W_1$, des zéros sur celles de $W_2$, et $e = x$. Pour garder de petits nombres, on remplace $\eq(\zeta, \cdot)$ par le vecteur $u = (1, 2, 3, 4)$ du test de Freivalds du chapitre [[hasard|Vérifier au hasard]].

La première entrée est l'exemple du cours, $x_A = (2, 1, 3, 1)$, qui donne $h_A = (5, -3, 2, 6)$. Son affirmation a pour facteurs $g_A = (1, 2, 3, 4, 0, 0, 0, 0)$ et $e_A = x_A$, et pour valeur $v_A = \langle u, h_A \rangle = 5 - 6 + 6 + 24 = 29$. Le prouveur s'engage sur son vecteur

$$w_A = g_A M = u W_1 = (1, 2, 6, 7)$$

et le vérifieur contrôle $\langle w_A, x_A \rangle = 2 + 2 + 18 + 7 = 29$.

La seconde entrée est l'entrée de contrôle $x_B = (3, 3, 3, 3)$, qui donne $h_B = (9, -3, 3, 9)$. Son affirmation additionne les quatre valeurs de $h_B$ : $g_B = (1, 1, 1, 1, 0, 0, 0, 0)$, $e_B = x_B$, et $v_B = 9 - 3 + 3 + 9 = 18$.

:::exercice ★
Calculez $w_B = g_B M$, puis $\langle w_B, x_B \rangle$, et comparez avec $v_B$.

:::reponse
Le vecteur $w_B$ additionne les quatre lignes de $W_1$, donc il contient les sommes de ses colonnes :

$$w_B = (0 + 0 - 1 + 1,\ 1 - 1 + 1 + 0,\ 1 - 1 + 1 + 1,\ 1 + 1 + 0 + 1) = (0, 1, 2, 3)$$

et $\langle w_B, x_B \rangle = 3 \times (0 + 1 + 2 + 3) = 18 = v_B$.
:::
:::

Sans lot, chaque entrée contrôle son affirmation sur la table par son propre pliage, et chacune ouvre 8 positions. Avec un lot, le prouveur s'engage sur $w_A$ et $w_B$, et il reste à contrôler $w_A = g_A M$ et $w_B = g_B M$. On tire pour cela un seul point après les deux engagements, on pose $e^* = \eq(\gamma, \cdot)$, et on calcule une fois le vecteur partagé $\Omega = Me^*$. Comme une ligne de notre table contient une seule colonne de $M$, le point n'a que des coordonnées de bloc : il s'écrit $\gamma$ et il a deux coordonnées, une par bit de l'indice de colonne. Notre prouveur tire ses défis dans $\E_{97}$, et on prend ici $\gamma = (3, 5)$ pour calculer à la main. On a alors, comme dans [[lots]] :

$$e^* = \eq\big((3, 5), \cdot\big) = (8, -12, -10, 15)$$

:::exercice ★★
Calculez $\Omega = Me^*$. Pliez ensuite les quatre lignes de la table en $\gamma = (3, 5)$, comme dans [[engagement-colonnes]], et comparez la ligne pliée avec $\Omega$. Faites enfin les contrôles $\langle w, e^* \rangle = \langle g, \Omega \rangle$ des deux entrées.

:::reponse
Chaque entrée de $\Omega$ combine une ligne de $M$ avec $e^* = (8, -12, -10, 15)$. Par exemple, la ligne $(0, 1, 1, 1)$ donne $-12 - 10 + 15 = -7$. Les huit lignes donnent :

$$\Omega = (-7, 37, -30, 13, 7, 23, -7, -27)$$

La ligne pliée vaut $8\, m^{(0)} - 12\, m^{(1)} - 10\, m^{(2)} + 15\, m^{(3)}$, où $m^{(b)}$ est la ligne $b$ de la table, et sa place $i$ vaut $\sum_b \eq(\gamma, b)\, m^{(b)}_i = \sum_b M[i][b]\, e^*_b = \Omega_i$, puisque $m^{(b)}_i = M[i][b]$. Par exemple, sa place 0 vaut $8 \cdot 0 - 12 \cdot 1 - 10 \cdot 1 + 15 \cdot 1 = -7$. La ligne pliée est donc $\Omega$.

Les contrôles :

$$
\begin{aligned}
\langle w_A, e^* \rangle &= 8 - 24 - 60 + 105 = 29 & \langle g_A, \Omega \rangle &= -7 + 74 - 90 + 52 = 29 \\
\langle w_B, e^* \rangle &= 0 - 12 - 20 + 45 = 13 & \langle g_B, \Omega \rangle &= -7 + 37 - 30 + 13 = 13
\end{aligned}
$$

Le premier contrôle redonne 29, la valeur $v_A$, par coïncidence : $e^*$ ne dépend pas de $x_A$, et le second contrôle donne 13, pas $v_B = 18$.

Dans $\F_{97}$, $\Omega \equiv (90, 37, 67, 13, 7, 23, 90, 70)$, et les contrôles restent vrais modulo 97.
:::
:::

Le vecteur partagé de notre réseau est donc la ligne pliée de [[engagement-colonnes]], que le vérifieur contrôle en ouvrant 8 positions de la table. Un seul pliage et une seule ouverture servent les deux entrées, et ils en serviraient autant qu'on veut. Avec $r = 16$, la table jouet servirait donc un lot au lieu d'une entrée. Les quatre dernières entrées de $\Omega$, sur les lignes de $W_2$, serviraient aux affirmations sur la couche 2, que chaque vraie preuve contient aussi.

Ce contrôle n'est sûr que si $\gamma$ est tiré après que $w_A$ et $w_B$ sont fixés : un prouveur qui connaîtrait le point à l'avance trouverait un faux $w$ qui passe ([[lots]], exercice 5).

Le notebook `13-flashprove-lots.py` refait ces calculs, avec autant d'entrées qu'on veut sur le même $\Omega$.

## Les tables de FlashProve

FlashProve organise ses tables autour de ce contrôle partagé (`docs/protocol.md` §4, §6.1-6.3).

**L'engagement, une fois.** Le fournisseur encode les poids dans une première table, l'**ancre**, la hache en une racine, et prouve dans un **fichier de clé** public que la table est bien formée. Ce fichier contient la racine, les réponses hors domaine de la table, une preuve que les chiffres des poids sont dans leurs intervalles, et un test fait une seule fois sur l'ancre, qui en ouvre 62 colonnes (`docs/protocol.md` §6.1 ; `docs/format/08-parameters.md` §8.5).

**Pourquoi des copies.** Si les lots tournaient sur l'ancre, son budget, après les 62 colonnes de son test, servirait $\lfloor (44\,040\,191 - 62)/64 \rfloor = 688\,127$ lots pour tout l'engagement. On cherche donc à dépenser moins de colonnes de l'ancre par lot servi.

**Les copies.** Dans le même appel, le fournisseur encode les mêmes poids autant de fois qu'il en aura besoin, chaque fois avec un aléa neuf : ce sont les **tables feuilles**, qu'on ne peut pas ajouter plus tard. Chacune a un fichier public qui contient une **preuve de lien**. Cette preuve plie l'ancre et la table feuille avec les mêmes facteurs, ouvre 62 colonnes de chacune, et montre par un test de proximité que chaque ligne pliée correspond à sa table et que les deux lignes pliées coïncident en un point aléatoire, sur la partie qui contient les poids (`docs/protocol.md` §6.2 ; `docs/limits-all-rows.tsv`, ligne H5, pour les 62 colonnes de la table feuille). Chaque lien dépense donc 62 colonnes de l'ancre et donne une table neuve qui sert 688 127 lots. Le chapitre [[cacher|Cacher les poids]] a compté que l'ancre permet ainsi $\lfloor (44\,040\,191 - 62)/62 \rfloor = 710\,324$ liens.

**Un lot.** Le prouveur réunit des requêtes en un lot et choisit une table feuille au hasard, jamais l'ancre. Il ajoute au compteur de cette table, sur disque, les 64 colonnes que le lot va ouvrir, et il n'ouvre rien avant que le disque ait confirmé l'écriture. Il calcule ensuite le modèle à nombres entiers sur chaque requête, puis il produit les chaînes de [[lots]] : une première chaîne par requête, une chaîne partagée par lot, qui seule ouvre la table, et une seconde chaîne par requête (`docs/protocol.md` §6.3).

## Les paramètres

Le tableau rassemble les nombres de la configuration par défaut de FlashProve, à pleine taille :

| | valeur |
|---|---|
| corps, défis | Goldilocks ; $\E = \F[X]/(X^3 - 2)$ |
| matrice des poids $M$ | $3\,076\,096$ lignes, $2^{18}$ colonnes |
| table | $2^{11}$ lignes, $2^{32}$ positions, $\ell = 402\,653\,184$ places, une queue de $r = 44\,040\,191$ coefficients aléatoires par ligne |
| rendement $\rho = (\ell + r)/2^{32}$, distance $\delta$, rayon de Johnson $1 - \sqrt{\rho}$ | 0,1040 ; 0,6641 ; 0,6775 |
| colonnes ouvertes | 64 par lot ; 62 pour le test unique de l'ancre ; 62 + 62 pour un lien ; 219 positions au premier test d'un segment, où $\delta = 0{,}290134$ |
| preuve de travail | 20 bits dans les chaînes d'une requête, 28 dans la chaîne partagée, 32 dans les fichiers de clé et de feuille |
| sel, réponses hors domaine | 40 octets par feuille d'arbre ; une réponse par ligne de la table |
| lot maximal | 64 requêtes |

Sources : `prover/examples/target_full_f2/policy.txt`, lignes `table 11 32 402653184 44040191 0 18`, `slots 64`, `salt 40`, `answers 1`, `work positions 20 28 32` ; `blocks/frame/tests/wf_frame_test.cpp:87` pour la forme de $M$ ; `lean/SOUNDNESS-PROOF-MAP.md`, « One round, worked », pour $\rho$, $\delta = 2\,852\,142\,980/2^{32}$ et $\sqrt{\rho}$ ; `prover/examples/TARGET-KITS.md` et `docs/limits-all-rows.tsv`, ligne H5, pour les 64 colonnes d'un lot et les 62 du lien d'une table feuille ; `docs/format/08-parameters.md` §8.5, colonne `record.f2.txt`, pour les 62 colonnes du test de l'ancre et de chaque côté d'un lien, et pour les 219 positions de la première étape du groupe `link`, celui des segments d'une requête.

:::incertain
L'article (p. 14, tableau 2, relevé par D1 §4.3, sans relecture du PDF) arrondit le rendement vers le haut et la distance vers le bas : 0,1041 et 0,6640.
:::

Le nombre de colonnes d'un lot dépend de la distance $\delta$. Un mot qui diffère du code en une part $\delta$ des positions passe chaque colonne ouverte avec une probabilité d'au plus $1 - \delta$ ([[distance]]). Chaque tour vise une erreur d'au plus $2^{-128}$, preuve de travail comprise (`policy.txt`, ligne `sec 128`), donc il faut assez de colonnes pour que les colonnes et la preuve de travail atteignent ensemble 128 bits.

La page [[securite]] fait ce compte sur deux tours : les 64 colonnes d'un lot donnent $64 \log_2\big(1/(1 - 0{,}664066)\big) \approx 100{,}72$ bits, et les 28 bits de preuve de travail de la chaîne partagée les portent à 128,72 ; les 219 positions de la première étape d'un segment en donnent environ 108,27, et 20 bits de travail les portent au-dessus de 128.

Ces bits comptent un tour pour une requête. Un lot réunit $N$ requêtes, et chacune passe par les tours de ses propres chaînes, donc un tricheur a $N$ essais au lieu d'un.

:::exercice ★★
Un tour d'une requête laisse passer un tricheur avec une probabilité d'au plus $\varepsilon$. Le tricheur place $N$ requêtes dans un lot et gagne dès que ce tour laisse passer l'une d'elles. Bornez sa probabilité de gagner, puis déduisez-en combien de bits le tour perd quand on compte le lot ensemble.

:::reponse
L'événement « le tour laisse passer l'une des $N$ requêtes » est la réunion de $N$ événements de probabilité au plus $\varepsilon$ chacun. La probabilité d'une réunion vaut au plus la somme des probabilités, donc le tricheur gagne avec une probabilité d'au plus $N \varepsilon$. En bits :

$$\log_2 \frac{1}{N\varepsilon} = \log_2 \frac{1}{\varepsilon} - \log_2 N$$

et $\log_2 64 = 6$.
:::
:::

Les programmes impriment ce compte : pour un lot plein de $N$ requêtes, chaque tour des chaînes propres d'une requête perd $\log_2 N$ bits, et le plus faible passe de 128,00 à 122,00 bits à 64 requêtes (`docs/limits.md`, « The error bounds that the programs print are their own calculation, not a security level »). La source donne ce résultat sans le dériver, donc la réunion d'événements est la lecture du cours. Elle ajoute qu'on ne sait pas si ce compte joint est celui qui s'applique à une requête seule.

## Les coûts mesurés

Toutes les mesures qui suivent viennent des mêmes exécutions : Llama 4 Maverick dans une conversion publique à 4 bits, un GPU H100 de 80 Go et 24 des 96 processeurs de sa machine, masques actifs, des fenêtres de 1 024 tokens, et des preuves qui contrôlent chacune un seul token, le suivant. Chaque mesure est la moyenne de trois exécutions, avec l'écart type (`guide/performance.md`).

| requêtes par lot | tokens par seconde | secondes par requête |
|---:|---:|---:|
| 1 | 17,41 ± 0,15 | 58,796 |
| 8 | 76,34 ± 0,37 | 13,413 |
| 24 | 111,23 ± 0,92 | 9,206 |
| 64 | 123,31 ± 0,42 | |

Ce sont des débits de préremplissage : les 1 024 tokens de chaque requête comptent, et rien n'est généré (`guide/performance.md`). À 64 par lot, le GPU a atteint 80 629 de ses 81 559 Mio, et la source précise que ce réglage « is not to be relied on with an 80 GB card ». Une requête attend tout son lot : de son départ à ses preuves, un lot de 24 prend 220,7 à 225,9 s, et un lot de 64 prend 533,3 à 537,9 s.

:::exercice ★
Retrouvez 111,23 tokens par seconde à partir de 9,206 s par requête et de fenêtres de 1 024 tokens, puis 17,41 à partir de 58,796 s. Vérifiez aussi que l'attente d'un lot de 24 vaut à peu près 24 fois le temps par requête.

:::reponse
$1\,024 / 9{,}206 \approx 111{,}23$ et $1\,024 / 58{,}796 \approx 17{,}42$, dans l'écart de $17{,}41 \pm 0{,}15$ que donne la source : la moyenne des débits n'est pas exactement $1\,024$ divisé par la moyenne des temps.

$24 \times 9{,}206 \approx 220{,}9$ s, dans l'intervalle de 220,7 à 225,9 s.
:::
:::

Les autres coûts :

| mesure | valeur | source |
|---|---|---|
| s'engager, une fois par engagement, avec une table feuille | 2 323,77 s, environ 39 min | `docs/figures.tsv`, ligne `commit-time-drawn` |
| taille d'une preuve | 18,74 à 18,81 Mo | `docs/figures.tsv`, ligne `proof-size` |
| ce que le client télécharge une fois : fichier de clé et fichier de feuille | 6,24 Mo | `guide/performance.md`, « Sizes » |
| ce que le fournisseur garde par engagement | 2,15 Go | `guide/performance.md`, « Sizes » |
| `cp_verify` sur une preuve, un seul fil, sans GPU | 21,14 s | `docs/figures.tsv`, ligne `verify-time` |
| mémoire de `cp_verify`, au plus (24 fils) | 3,53 Go | `guide/performance.md`, « Checking a proof » |
| mémoire de la machine pour servir à 24 par lot | 269,7 Go | `guide/performance.md`, « Machine » |
| mémoire de la machine pour s'engager | 299,6 Go | `guide/performance.md`, « Machine » |

:::exercice ★★
Une table feuille sert 688 127 lots. Combien de requêtes sert-elle à 24 par lot, et combien de temps un GPU met-il à l'user au débit mesuré ? Même question avec des lots d'une requête.

:::reponse
À 24 par lot, la table sert $688\,127 \times 24 = 16\,515\,048$ requêtes, et à 9,206 s par requête :

$$16\,515\,048 \times 9{,}206 \approx 1{,}52 \times 10^8 \text{ s} \approx 4{,}8 \text{ ans}$$

Avec des lots d'une requête, elle n'en sert que 688 127, et à 58,796 s par requête elle s'use en environ $4{,}05 \times 10^7$ s, soit 1,3 an. Le lot de 24 sert donc 24 fois plus de requêtes avec la même table. Un lot qui commence compte entier, plein ou non (`docs/protocol.md` §4), donc des lots à moitié vides useraient la table plus vite que ce calcul.
:::
:::

## Face à vLLM

La source compare ce débit à celui de vLLM, un moteur de service sans preuve. Elle calcule chaque rapport par GPU, à partir du débit stable à 24 par lot, sans compter le démarrage ni l'engagement. vLLM faisait tourner la version FP8 du modèle sur huit H100, lors d'autres exécutions (`guide/performance.md`, « Cost »).

| prouver à 24 par lot, face à vLLM | fois plus lent | intervalle |
|---|---:|---:|
| préremplissage à la plus forte charge essayée | 93,0 | 92,2 à 94,1 |
| préremplissage de 24 requêtes à la fois | 71,4 | 65,2 à 76,4 |
| décodage d'autant de tokens avec 512 flux | 20,1 | 19,7 à 20,5 |

:::exercice ★★
Pourquoi le rapport de 20,1 avec le décodage ne donne-t-il pas le coût de prouver une réponse générée ?

:::reponse
Le décodage produit des tokens de réponse. Un passage de FlashProve traite les 1 024 tokens qu'on lui donne et n'en contrôle qu'un, le token suivant. Le rapport compare donc des tokens traités, alors que prouver une réponse demande de contrôler chacun de ses tokens. La source le dit : « a pass checks one token, so this is not the cost of proving a generated reply ».

Elle mesure à part des réponses entières contrôlées token par token, sous la politique plus lâche de l'écart plafonné, sur des réponses enregistrées et sans moteur : 39,1 ± 1,0 tokens de réponse par seconde à 24 par lot (`guide/performance.md`, « Whole replies »).
:::
:::

:::piege
**Lire 111,23 tokens par seconde comme un débit de génération.** C'est un débit de préremplissage : chaque preuve traite une fenêtre de 1 024 tokens et contrôle un seul token.
:::

## Notre prouveur et FlashProve

| | notre preuve | FlashProve |
|---|---|---|
| ouverture de la table | 8 positions par entrée, ou 8 pour tout un lot avec le point partagé | 64 colonnes pour tout un lot de 64 requêtes au plus |
| budget | avec une queue $r \ge 16$ ([[cacher]]), une entrée, ou un lot avec le point partagé | 688 127 lots par table feuille, jusqu'à 710 324 tables feuilles |
| copies de la table | aucune | des tables feuilles, chacune liée à l'ancre par une preuve de lien |
| vecteur partagé | la ligne pliée, 8 entrées | $\Omega$, une entrée par ligne de $M$, soit 3 076 096, calculé à partir d'une ligne pliée de 402 653 184 places |

Les nombres de FlashProve viennent des sources de la section « Les paramètres » et de `docs/protocol.md` §4 et §6.3.

## La suite

On sait maintenant comment FlashProve prouve chaque requête d'un lot et ce que cela coûte. Le chapitre suivant, [[ce-que-dit-une-preuve|Ce que dit une preuve]], lit ce qu'une preuve acceptée garantit au client, ce que Lean démontre de FlashProve, et ce que le client doit vérifier lui-même.

:::quiz
1. Combien de fois la table est-elle ouverte pour un lot, et combien de colonnes ?
2. Sur quel vecteur le prouveur s'engage-t-il pour chaque requête, et combien d'entrées a-t-il ?
3. Pourquoi tirer $e^*$ après les sceaux de toutes les requêtes ?
4. Combien de lots une table feuille sert-elle ?
5. Combien de temps le client met-il à vérifier une preuve ?
6. Le débit de 111,23 tokens par seconde est-il un débit de génération ?

:::reponse Réponses
1. Une fois, dans la chaîne partagée, et 64 colonnes, quel que soit le nombre de requêtes du lot.
2. Sur $w = gM$, qui a une entrée par colonne de $M$, soit $2^{18}$ entrées.
3. Sinon une requête pourrait choisir un $w$ faux qui passe le contrôle en $e^*$ ([[lots]], exercice 5).
4. 688 127, soit $\lfloor (44\,040\,191 - 62)/64 \rfloor$.
5. 21,14 s sur un seul fil d'exécution, sans GPU (`cp_verify`).
6. Non. C'est un débit de préremplissage : chaque preuve traite 1 024 tokens donnés et contrôle un seul token.
:::
:::
