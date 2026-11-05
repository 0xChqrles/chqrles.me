---
id: cacher
---
La preuve du chapitre [[prouveur-complet|Le prouveur complet]] convainc le vérifieur que le réseau, avec les poids engagés sous $R_w$, donne la classe $c$. Elle lui montre aussi des nombres calculés à partir des poids, et ce chapitre cherche ce qu'il peut en tirer. On lit d'abord la preuve en vérifieur curieux, qui garde tout ce qu'il reçoit, et on compte ce qu'elle montre : la ligne pliée envoyée en clair, les colonnes ouvertes, les polynômes des sumchecks et leurs valeurs de fin. On ajoute ensuite, pour chaque fuite, l'aléa qui la couvre : une queue aléatoire à chaque ligne encodée, un sel à chaque feuille, un mot masquant au cas de base, un polynôme masquant dans chaque sumcheck. On finit par ce que ces masques coûtent : un budget d'ouvertures, qui borne le nombre de preuves qu'une table peut servir.

## Le vérifieur curieux

On se place du côté d'un vérifieur qui suit le protocole de [[preuve-reseau]] sans tricher, mais qui garde chaque nombre qu'il lit et cherche à en déduire les 32 poids. On reprend les messages de la preuve d'une entrée, dans la version sans masques, et on cherche ceux qui dépendent des poids.

### La ligne pliée

Le pliage de la table des poids finit par le cas de base, qui envoie la ligne pliée $u = \sum_b \eq(\gamma, b)\, m^{(b)}$ en clair ([[test-proximite]]). Les défis $\gamma$ sont publics, donc les coefficients $\eq(\gamma, b)$ le sont aussi, et chaque place de $u$ est une combinaison des poids dont le vérifieur connaît les coefficients. Une preuve lui donne une telle combinaison par place, et une autre preuve, faite à d'autres défis, lui en donne une autre.

:::exercice ★★
Une table de deux lignes $m^{(0)}$ et $m^{(1)}$, de deux places chacune, sert deux preuves. La première plie en $\gamma = 6$ et envoie $u = (90, 19)$, la seconde plie en $\gamma' = 2$ et envoie $u' = (1, 7)$. Retrouvez les deux lignes. Combien de preuves faudrait-il pour la table des poids du réseau, qui a 4 lignes ?
:::reponse
Le pli s'écrit $u = (1 - \gamma)\, m^{(0)} + \gamma\, m^{(1)} = m^{(0)} + \gamma\,(m^{(1)} - m^{(0)})$. La différence des deux preuves élimine donc $m^{(0)}$ :

$$u' - u = (\gamma' - \gamma)(m^{(1)} - m^{(0)}) = -4\,(m^{(1)} - m^{(0)})$$

À gauche, $(1 - 90, 7 - 19) = (-89, -12) \equiv (8, -12)$. Le vecteur qui, multiplié par $-4$, donne $(8, -12)$ est $(-2, 3)$, donc $m^{(1)} - m^{(0)} = (-2, 3)$. On en déduit les deux lignes :

$$
\begin{aligned}
m^{(0)} &= u - 6\,(-2, 3) = (102, 1) \equiv (5, 1) \\
m^{(1)} &= m^{(0)} + (-2, 3) = (3, 4)
\end{aligned}
$$

La table du réseau a deux variables de ligne. À chaque place $j$, une preuve donne l'équation $\sum_b \eq(\gamma, b)\, m^{(b)}_j = u_j$, à 4 inconnues. Quatre preuves donnent donc 4 équations par place, et elles fixent la table dès que les quatre vecteurs $\eq(\gamma, \cdot)$ sont indépendants, ce qui arrive pour environ 99 % des tirages de défis (le notebook le mesure).
:::
:::

### Les colonnes ouvertes

Le cas de base ouvre aussi $t = 8$ colonnes de la table des poids, et chaque colonne contient, à sa position, le symbole de chacune des 4 lignes. Sans queue, la ligne $b$ est encodée par le polynôme $P_b(X) = \sum_{j<8} m^{(b)}_j X^j$, de degré au plus 7 ([[reed-solomon]]).

:::exercice ★★
Une preuve ouvre les colonnes de la table des poids à 8 positions distinctes. Que peut en tirer le vérifieur curieux ?
:::reponse
Chaque colonne donne une valeur de chacun des 4 polynômes $P_b$, en un point qu'il connaît. Un polynôme de degré au plus 7 est fixé par ses valeurs en 8 points distincts : on le retrouve par interpolation, comme un message de [[reed-solomon]] à partir de $\ell$ symboles. Les 8 colonnes donnent donc les 4 polynômes, et leurs coefficients sont les 32 poids.

Une seule preuve montre toute la table. Si des positions se répètent, il manque quelques points, et la preuve suivante les apporte.
:::
:::

Ouvrir moins de colonnes ne règle rien. Chaque colonne ouverte donne encore une équation sur chaque ligne, et le tour de requêtes perd les bits que lui donnaient ses positions ([[securite]]).

### Les polynômes des sumchecks

Chaque sumcheck de la preuve envoie un polynôme par tour, et ses coefficients sont des sommes partielles des termes de la somme. Dans le réseau, les termes contiennent des poids.

:::exercice ★
Le sumcheck de la couche 2 au point $z = (2, 5)$ ([[sumcheck-matrices]]) somme les termes $\tilde W_2(z, k)\, a_k$, avec $\tilde W_2(z, \cdot) = (-12, 5, -5, -19)$ et $a = (1, 0, 1, 2)$. Son premier tour envoie $g_1(K) = -17 + 10K - 31K^2$, où $K$ est le bit de poids faible de $k$. De quels termes $g_1(0)$ et $g_1(1)$ sont-ils les sommes ?
:::reponse
$g_1(0)$ somme les termes dont le bit de poids faible vaut 0, soit $k = 0$ et $k = 2$ :

$$g_1(0) = \tilde W_2(z, 0)\, a_0 + \tilde W_2(z, 2)\, a_2 = -12 - 5 = -17$$

$g_1(1)$ somme $k = 1$ et $k = 3$ : $5 \times 0 - 19 \times 2 = -38$, et on retrouve $g_1(1) = -17 + 10 - 31 = -38$. Chaque $\tilde W_2(z, k) = \sum_i \eq(z, i)\, W_2[i][k]$ est une combinaison connue de la colonne $k$ de $W_2$, donc $g_1(0)$ est une combinaison des poids de $W_2$, pondérée par les activations.
:::
:::

Les tours suivants montrent de même des sommes partielles où les premières variables sont fixées aux défis. La page [[sumcheck-masque]] mesure cette fuite sur le reçu.

La fin d'un sumcheck fuit aussi. Le prouveur y annonce les valeurs des fonctions sommées au point des défis, et ces valeurs deviennent des affirmations sur les tables engagées. Dans la preuve de [[preuve-reseau]], il annonce par exemple $\tilde h(\zeta) = \sum_{i,k} \eq(\zeta, i)\, x_k\, W_1[i][k]$, une combinaison des poids de $W_1$ dont le vérifieur connaît les coefficients, puisque $\zeta$ et $x$ sont publics.

### Les réponses hors domaine

Notre prouveur reste dans le régime du décodage unique et ne pose pas de question hors domaine ([[proximite]]). FlashProve en pose une par ligne de sa table (`docs/protocol.md` §5.5), et la réponse $\tilde m(z) = \sum_j \eq(z, j)\, m_j$ est une combinaison des entrées de la ligne dont le vérifieur connaît les coefficients ([[hors-domaine]]). Elle fuit donc de la même façon que la ligne pliée.

## Les masques

Ces fuites ont la même forme : le vérifieur lit une combinaison linéaire des poids dont il connaît les coefficients. On la couvre en ajoutant à ce qu'il lit un nombre aléatoire que le prouveur garde secret, et qui laisse passer les contrôles. La page [[zero-knowledge]] construit chacun de ces masques et montre pourquoi il cache ; on les pose ici sur le réseau.

**Les colonnes ouvertes.** On ajoute à chaque ligne encodée une **queue aléatoire** de $r$ coefficients, aux puissances les plus basses :

$$P_b(X) = \sum_{j<r} \eta^{(b)}_j X^j + \sum_{j<8} m^{(b)}_j X^{r+j}$$

Les symboles de $r$ positions distinctes sont alors uniformes, quel que soit le message. Les deux tables du réseau, celle des poids et celle des cellules, prennent $r = 8$, autant que les 8 positions que le cas de base ouvre.

**Les colonnes fermées.** Une feuille de l'arbre est le hachage d'une colonne de 4 symboles. On ajoute à chaque feuille un **sel**, des octets aléatoires hachés avec la colonne, pour qu'on ne puisse pas confirmer une colonne devinée en la hachant. Le notebook en met 16 par feuille.

**La ligne pliée.** Le cas de base n'envoie plus $u$, mais $M' = M^* + \lambda u$, où $M^*$ est une ligne uniforme, le **mot masquant**, sur laquelle le prouveur s'est engagé avant de recevoir le défi $\lambda$. Il envoie de même la queue pliée masquée, pour que le vérifieur puisse réencoder $M'$.

**Les sumchecks.** Chaque sumcheck porte sur $U + \varepsilon F$ au lieu de $F$, où $U$ est un **polynôme masquant** aléatoire dont le prouveur annonce la somme $\sigma$ avant le défi $\varepsilon$ ([[sumcheck-masque]]). Cela concerne tous les sumchecks de la preuve : le zéro-test des poids ternaires, ceux des lookups et de leurs arbres de produits, celui de la couche 2 et le pliage. La fin de chaque sumcheck laisse une affirmation sur $U$, donc $U$ est engagé comme le mot masquant. Les valeurs annoncées en fin de sumcheck, comme $\tilde h(\zeta)$, demandent un masque de plus : FlashProve ajoute pour cela une variable au sumcheck, décrite dans [[sumcheck-masque]].

## Le budget d'ouvertures

La queue cache $r$ positions et pas une de plus : la page [[zero-knowledge]] montre qu'avec $r + 1$ symboles d'une même ligne, le dernier est fixé par les autres et sépare deux messages. Or la queue d'une ligne engagée ne change pas d'une preuve à l'autre, puisque la racine $R_w$ la fixe. Deux preuves qui ouvrent chacune 8 positions différentes montrent donc 16 symboles du même polynôme. Le nombre de positions qu'on peut ouvrir sur toute la vie d'une table, toutes preuves confondues, s'appelle le **budget d'ouvertures**, ou **borne de requêtes**, et il vaut $r$.

La queue coûte aussi de la distance. Le code a maintenant la dimension $\ell + r$, donc son rendement devient $\rho = (\ell + r)/n$ et sa distance minimale $n - (\ell + r) + 1$.

:::exercice ★
La table des poids a $\ell = 8$, $r = 8$ et $n = 32$. Que valent son rendement et son rayon de décodage unique $\delta = (1 - \rho)/2$ ? Avec $t = 8$ positions, avec quelle probabilité le tour de requêtes laisse-t-il passer un mot à cette distance, et combien de bits cela fait-il ? Comparez avec la table sans queue du chapitre [[proximite|Le test de proximité]].
:::reponse
Le rendement vaut $\rho = 16/32 = 1/2$, donc $\delta = 1/4$. Une position tirée est une position où le mot est correct avec une probabilité d'au plus $3/4$, et les 8 positions passent toutes avec une probabilité d'au plus

$$(0{,}75)^8 \approx 0{,}100$$

soit $8 \log_2(4/3) \approx 3{,}3$ bits. Sans queue, $\rho = 1/4$ et $\delta = 0{,}375$ donnaient $(0{,}625)^8 \approx 0{,}023$, soit 5,4 bits. La queue a doublé la dimension du code, donc réduit sa distance, et le tour de requêtes a perdu 2 bits.
:::
:::

:::piege
**La redondance ne cache rien.** Ce qui cache, c'est le nombre $r$ de coefficients aléatoires. Ce que la redondance $n - (\ell + r)$ donne, c'est la distance, donc la solidité du test. Agrandir $n$ ne permet pas d'ouvrir plus de positions.
:::

:::exercice ★
Avec une queue de $r = 24$ et 8 positions par preuve, combien de preuves la table des poids peut-elle servir ? Que vaut alors son rendement ?
:::reponse
Le budget de 24 positions couvre 3 preuves, et davantage si des positions se répètent d'une preuve à l'autre, puisqu'une position déjà ouverte ne compte pas une seconde fois. Mais $\rho = (8 + 24)/32 = 1$ : la distance minimale vaut $32 - 32 + 1 = 1$, chaque mot de $\F_{97}^{32}$ est un mot du code, et le test de proximité ne peut plus rien détecter. Le corps jouet ne permet pas de codes plus longs que 32 points ([[domaine]]), donc il ne peut pas à la fois cacher beaucoup et tester.
:::
:::

La table des poids sert aussi une preuve avant toute entrée : celle des poids ternaires, faite à l'engagement.

:::exercice ★★
La preuve que les poids sont ternaires ([[preuve-reseau]]) finit par un pliage et un cas de base sur la table des poids, qui ouvrent 8 positions. Avec $r = 8$, combien de preuves d'entrée la table des poids peut-elle encore servir ? Quelle queue faudrait-il pour en servir une, et que deviendrait le tour de requêtes ?
:::reponse
Aucune : la preuve ternaire dépense à elle seule les 8 positions du budget. Une preuve d'entrée en ouvrirait jusqu'à 8 autres. Au-delà de 8 symboles d'une ligne, chaque symbole donne une équation exacte sur son message, et 16 symboles à des positions distinctes fixent le polynôme de degré au plus 15, donc toute la ligne.

Pour servir une preuve d'entrée, il faut $r \ge 16$. Alors $\rho = 24/32 = 3/4$ et $\delta = 1/8$, et les 8 positions laissent passer un mot à cette distance avec une probabilité d'au plus $(7/8)^8 \approx 0{,}34$, soit 1,5 bit. La table jouet ne peut pas cacher davantage sans perdre son test, parce que les codes du corps à 97 éléments s'arrêtent à 32 points.
:::
:::

FlashProve fait le même compte avec des nombres qui le permettent. Chaque ligne de sa table des poids a une queue de $r = 44\,040\,191$ entrées aléatoires (`prover/examples/target_full_f2/policy.txt`, ligne `table`, dont le quatrième nombre est « the number of random entries of a row » d'après `docs/format/08-parameters.md`). Le test fait une fois à l'engagement porte sur une première table, l'**ancre** (`docs/protocol.md` §4, §6.1), et en ouvre 62 colonnes (`docs/format/08-parameters.md` §8.5). Les requêtes sont servies par des copies de la même table, les **tables feuilles**, encodées avec des queues neuves. Chacune est reliée à l'ancre par une **preuve de lien** qui ouvre 62 colonnes de chacune des deux tables (`docs/protocol.md` §6.2 ; `docs/format/toys/3-key-and-entry.md` §8), puis chaque lot de requêtes ouvre 64 colonnes d'une table feuille (`docs/limits-all-rows.tsv`, ligne H5).

:::exercice ★
Combien de lots une table feuille peut-elle servir ? Combien de preuves de lien l'ancre peut-elle donner, donc combien de tables feuilles un engagement peut-il avoir ?
:::reponse
Une table feuille dépense 62 positions pour son lien, puis 64 par lot :

$$\left\lfloor \frac{44\,040\,191 - 62}{64} \right\rfloor = 688\,127 \text{ lots}$$

L'ancre dépense 62 positions pour son test, puis 62 par lien :

$$\left\lfloor \frac{44\,040\,191 - 62}{62} \right\rfloor = 710\,324 \text{ tables feuilles}$$

Ce sont les deux nombres que donne FlashProve (`guide/weight-hiding.md`, tableau ; `docs/protocol.md` §4 pour les 688 127 lots).
:::
:::

Puisque le budget se dépense sur toutes les preuves, le prouveur doit le compter. Avant chaque lot, celui de FlashProve ajoute au compteur de la table, sur disque, le nombre de colonnes que le lot va ouvrir, et il n'ouvre rien avant que le disque ait confirmé l'écriture (`docs/protocol.md` §6.3, étapes 1-2).

:::piege
**Restaurer une copie du compteur.** Une copie ancienne du compteur affiche moins d'ouvertures que la table n'en a faites. Le prouveur ouvrirait alors des colonnes au-delà du budget, et chacune donnerait des équations exactes sur les poids, sans que rien ne le signale. FlashProve interdit de copier, de sauvegarder ou de restaurer ce répertoire (`guide/weight-hiding.md`, « The counter »).
:::

Le notebook `11-cacher.py` refait le vérifieur curieux sur la preuve sans masques, puis montre que la même attaque échoue sur la table masquée, et tient le compteur du budget.

## Notre prouveur et FlashProve

| | notre preuve masquée | FlashProve |
|---|---|---|
| queue | $r = 8$ par ligne, dans les deux tables | $r = 44\,040\,191$ par ligne de la table des poids (`policy.txt`, ligne `table`) |
| budget | 8 positions, que la preuve ternaire épuise | 64 colonnes par lot, 688 127 lots par table feuille, compteur écrit sur disque avant l'ouverture (`docs/protocol.md` §4, §6.3 ; `docs/limits-all-rows.tsv`, ligne H5) |
| sel | 16 octets par feuille (notebook) | 40 octets par feuille (`docs/format/08-parameters.md`, ligne `salt`) |
| aléa des masques | `secrets` | dérivé d'une graine secrète par ChaCha20, donc un masquage au mieux calculatoire (`docs/protocol.md` §7) |
| ce qui est prouvé | rien | zero-knowledge en Lean à moins de $2^{-154}$, pour une requête par preuve, une table feuille, au plus $2^{64}$ hachages et 688 127 réponses ; ni les lots, ni les programmes (`guide/weight-hiding.md`) |

La page [[zero-knowledge]] détaille ce que FlashProve prouve et ce qu'il laisse voir, dont un bit par requête.

## La suite

Toutes les pièces de notre prouveur sont construites. Les trois derniers chapitres lisent FlashProve à pleine échelle avec ces pièces, et le chapitre suivant, [[flashprove-modele]], commence par la façon dont il écrit Llama 4 Maverick avec des entiers et découpe une passe en segments.

:::quiz
1. Que montre une colonne ouverte d'une table sans queue ?
2. La queue de FlashProve occupe les puissances les plus basses du polynôme. Est-ce cette place qui cache le message ?
3. Qu'est-ce que le budget d'ouvertures, et sur quoi se compte-t-il ?
4. Pourquoi chaque feuille reçoit-elle un sel ?
5. FlashProve cache-t-il tout ce qui dépend des poids ?
:::reponse Réponses
1. Le symbole de chaque ligne à cette position, c'est-à-dire une combinaison connue des entrées de chaque ligne. Avec autant de colonnes que de places, on retrouve toute la table.
2. Non. Ce qui cache, c'est que la queue ait $r$ coefficients aléatoires. Placée aux puissances $X^\ell, \dots, X^{\ell + r - 1}$, sa partie aléatoire vaudrait $z^\ell$ fois une somme de Vandermonde, et $z$ n'est jamais nul sur $7 \cdot H_n$. FlashProve suit l'encodage de CFW26, qui met la queue en bas (`blocks/code/code.h`).
3. Le nombre de positions qu'on peut ouvrir sans rien montrer, toutes preuves confondues, sur toute la vie de la table : $r$. Une position ouverte deux fois compte une fois.
4. Une colonne de 4 symboles de $\F_{97}$ n'a que $97^4$ valeurs : sans sel, on confirmerait une colonne devinée en la hachant.
5. Non. Un bit par requête, servie ou refusée, est révélé, et il dépend des poids (`guide/weight-hiding.md`).
:::
:::
