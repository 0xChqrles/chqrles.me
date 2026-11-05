---
id: prouveur-complet
---
Toutes les pièces existent. Ce chapitre les assemble sur le réseau. Il remplace d'abord le vérifieur, qui tirait les défis, par une chaîne de hachage, pour que la preuve soit un fichier qu'on vérifie seul. Il écrit ensuite le protocole complet, tour par tour, et suit chaque tricheur des chapitres précédents jusqu'à l'endroit où il est pris. Il finit par compter en bits la probabilité qu'une fausse preuve passe, et par comparer ce que lit le vérifieur à ce que coûterait refaire le calcul, comme promis au chapitre 1.

## D'un dialogue à un fichier

Chaque protocole du cours est un dialogue. Dans le [[sumcheck]], le vérifieur tire un défi après chaque polynôme de tour ; dans un [[lookups|lookup]], il tire $\alpha$ après l'engagement des clés ; dans le [[test-proximite|test de proximité]], il tire les positions après la ligne pliée. La sécurité de chacun vient de cet ordre : le prouveur fixe son message avant de connaître le défi qui le contrôle.

Une preuve doit être un fichier, que le prouveur écrit seul et qu'un vérifieur lit plus tard. La page [[fiat-shamir]] remplace chaque tirage par la lecture d'un état de hachage, qui absorbe tout ce que le prouveur a envoyé. Pour notre réseau, chaque entrée a sa chaîne, et son état de départ contient l'étiquette, les paramètres et l'énoncé $(x, c, R_w)$. Sur l'exemple du cours :

$$S_0 = H\big(\text{étiquette}, \text{paramètres}, (2, 1, 3, 1), 1, R_w\big)$$

Chaque défi de la preuve dépend donc de l'entrée, de la classe 1 annoncée et des poids engagés.

## La preuve du réseau, tour par tour

La page [[preuve-reseau]] écrit le protocole complet : une preuve faite une fois, à l'engagement, que les poids sont ternaires, puis pour chaque entrée l'engagement des cellules, les défis $\beta$ et $\alpha$, les trois lookups, le retour des clés vers le réseau et les deux tests de proximité.

:::exercice ★
Dans la preuve d'une entrée, quelles racines de Merkle apparaissent ? Lesquelles sont dans l'énoncé plutôt que dans la preuve ?

:::reponse
$R_w$, la racine de la table des poids, est fixée une fois, à l'engagement : elle est dans l'énoncé, donc dans $S_0$. $R_c$, la racine de la table des cellules, est la seule racine que la preuve transporte ; la chaîne l'absorbe avant de tirer $\beta$ et $\alpha$. Les deux cas de base envoient leur ligne pliée en clair et n'ajoutent pas de racine. Le chapitre [[cacher]] en ajoutera pour les masques.
:::
:::

Le notebook du chapitre fait tourner ce protocole sur l'exemple $x = (2, 1, 3, 1)$, $c = 1$, et le vérifieur accepte. La preuve se répartit ainsi entre les étapes :

| étape | messages du prouveur | octets | tirages du vérifieur |
|---|---:|---:|---:|
| engagement des cellules | 1 | 32 | 0 |
| défis $\beta$ et $\alpha$ | 0 | 0 | 4 |
| lookup $R_4$ | 16 | 123 | 16 |
| lookup $T_\varphi$ | 26 | 204 | 26 |
| lookup $R_{32}$ | 55 | 447 | 55 |
| clés ramenées au réseau | 5 | 39 | 2 |
| test de la table des poids | 5 | 514 | 4 |
| test de la table des cellules | 8 | 709 | 7 |

Les lookups font la plupart des tours, parce que chacun prouve quatre produits par GKR et que les arbres des plans de $R_{32}$ ont 5 étages. Les octets viennent surtout des deux tests, qui envoient les colonnes ouvertes et les condensés de leurs chemins. La preuve a 105 tours et tient en 2 068 octets, que le notebook compte aussi par contenu, à 1 octet par élément de $\mathbb{F}_{97}$ et 3 par élément de $\mathbb{E}_{97}$ :

| contenu | nombre | octets |
|---|---:|---:|
| racine $R_c$ | 1 | 32 |
| éléments de $\mathbb{E}_{97}$ : polynômes de tour, produits et valeurs annoncés, lignes pliées | 308 | 924 |
| colonnes ouvertes : 6 de la table des poids (4 symboles), 8 de la table des cellules (32 symboles) | 14 | 280 |
| condensés des chemins de Merkle | 26 | 832 |

La preuve faite une fois à l'engagement ajoute 9 tours et 553 octets.

Les tricheurs des chapitres précédents sont tous rejetés : celui qui tronque au lieu d'arrondir ([[arrondir|chapitre 6]]), celui qui annonce une autre classe, celui qui change une activation, celui qui s'engage sur un poids égal à 2 et celui qui calcule avec d'autres poids que ceux de $R_w$. L'exercice 8 de [[preuve-reseau]] demande à quelle étape chacun est pris, et sa réponse dit où le notebook rejette chacun.

## Combien de bits

La page [[securite]] donne une erreur à chaque tour et l'écrit en bits. Dans notre preuve, les deux tours de positions sont les plus faibles : 8 positions à $\delta = 0{,}375$ laissent passer un mot loin du code avec une probabilité de $(0{,}625)^8 \approx 0{,}023$, soit 5,4 bits. C'est voulu : le corps $\mathbb{F}_{97}$ limite les codes à 32 points, donc on ne peut pas ouvrir beaucoup plus de positions, et le jouet garde des nombres qu'on lit. Les autres tours, avec des défis dans $\mathbb{E}_{97}$, valent entre 11,9 et 19,8 bits dans le notebook. Le plus faible d'entre eux tire $\beta$ et les trois $\alpha$ après $R_c$, et presque toute son erreur vient de l'$\alpha$ de $R_{32}$ : le compte de ce lookup, vérifié modulo 97, laisse passer des multiplicités de somme 198, donc jusqu'à 198 valeurs de $\alpha$ où l'identité tient malgré une clé fausse ([[tables]]).

:::exercice ★★
Avec $t = 8$ positions et $\delta = 0{,}375$, combien de bits de preuve de travail faudrait-il pour amener le tour de positions à 18,8 bits, la valeur d'un tour de sumcheck de degré 2 dans $\mathbb{E}_{97}$ ?

:::reponse
Le tour vaut $8 \log_2(1/0{,}625) \approx 5{,}4$ bits, et chaque bit de travail compte pour un bit de plus. Il manque $18{,}8 - 5{,}4 = 13{,}4$ bits, donc 14 bits de travail, soit environ $2^{14} = 16\,384$ hachages pour le prouveur honnête à chaque tour de positions.
:::
:::

Le notebook refait la preuve avec 14 bits de travail. Les tours de positions passent à 19,4 bits, et le plus faible devient le tour de $\beta$ et des $\alpha$, qui reste à 11,9 bits, puisque le travail ne précède que les tirages de positions.

## Refaire le calcul ou vérifier la preuve

Le chapitre 1 a posé la première exigence d'une preuve : le vérifieur doit lire beaucoup moins que le calcul ne manipule. On peut maintenant mesurer ce seuil sur notre prouveur.

:::exercice ★
Combien d'opérations faut-il pour refaire le passage du réseau ? Pourquoi le vérifieur de notre preuve en fait-il beaucoup plus ?

:::reponse
Refaire le passage demande 32 produits par $-1$, 0 ou 1, c'est-à-dire au plus 32 additions ou soustractions, 4 arrondis, 4 lectures de la table de $\varphi$ et 3 comparaisons pour l'argmax.

Le vérifieur suit des sumchecks, des étages de GKR, deux plis, et il ouvre et plie des colonnes des deux tables. Ce travail dépend peu de la taille du réseau, mais ici le réseau est minuscule, donc le mécanisme de la preuve coûte bien plus que le calcul. Une preuve ne paie que sur un calcul beaucoup plus grand que ce mécanisme.
:::
:::

Le notebook compte le vérifieur : 9 313 produits dans $\mathbb{E}_{97}$ et 562 hachages SHA-256, contre 32 produits par $\pm 1$ pour refaire le calcul. À l'autre bout, `cp_verify`, le vérifieur de FlashProve, prend 21,14 s sur un fil (`docs/figures.tsv`, ligne `verify-time`) sans lire les poids, alors que refaire le passage demanderait les 400,7 milliards de poids engagés (paper p.46, §7.8).

## Ce qui manque

Le vérifieur accepte une preuve juste et rejette nos tricheurs, mais il apprend beaucoup trop. Le cas de base envoie en clair la ligne pliée, une combinaison connue des lignes de la table, et chaque test ouvre jusqu'à 8 colonnes, alors qu'une ligne de 8 places se retrouve à partir de 8 de ses symboles. Le chapitre [[cacher]] lit cette preuve en vérifieur curieux et ajoute les masques qui la rendent zero-knowledge.

## Notre prouveur et FlashProve

| | notre preuve | FlashProve |
|---|---|---|
| hachage | SHA-256 (notebook) | BLAKE2b, avec une étiquette de 16 octets par usage (`FORMAT.md`, R2.1) |
| chaînes | une par entrée, plus celle de l'engagement | une première chaîne par requête, une chaîne partagée par lot, une seconde chaîne par requête (`docs/protocol.md` §6.3) |
| preuve de travail | aucune ($\kappa$ au choix dans le notebook) | avant chaque tirage de positions : 20 bits dans les chaînes d'une requête, 28 dans la chaîne partagée, 32 dans les fichiers faits une fois (`prover/examples/target_full_f2/policy.txt` ; `prover/examples/TARGET-KITS.md`) |
| segments | un seul calcul | 25 segments par passage, $G_0, A_0, \dots, H$ (`docs/format/11-sub-proofs.md` ; D2 §0) |
| taille d'une preuve | 2 068 octets (notebook) | 18,74 à 18,81 Mo, 18,78 Mo en moyenne (`docs/figures.tsv`, lignes `proof-size` et `proof-size-mean`) |

:::quiz
1. Que contient le premier état de la chaîne ?
2. Pourquoi l'engagement des cellules vient-il avant $\beta$ et $\alpha$ ?
3. Quel tricheur la table $R_4$ prend-elle ?
4. Que garantit la preuve faite une fois sur les poids ?
5. Pourquoi ne jamais citer « 128 bits » seul pour FlashProve ?

:::reponse Réponses
1. L'étiquette, les paramètres et l'énoncé : $x$, $c$ et la racine $R_w$.
2. Sinon le prouveur choisirait ses cellules en connaissant ces défis, par exemple une paire hors de $T_\varphi$ dont la clé est égale à une ligne pour ce $\beta$.
3. Celui qui tronque au lieu d'arrondir : son reste $-1$ n'est pas dans $R_4$.
4. Que les poids sont dans $\{-1, 0, 1\}$, ce qui borne $h$ et $y$ par 12 et permet de passer des égalités dans le corps aux égalités entières.
5. 128 bits est une cible par tour, preuve de travail comptée. Le tour le plus faible en vaut 96,23 sans elle, et aucun de ces chiffres n'est un niveau de sécurité (`docs/limits.md`).
:::
:::
