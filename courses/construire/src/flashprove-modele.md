---
id: flashprove-modele
---
On lit maintenant FlashProve à pleine échelle. Ce chapitre montre comment il écrit Llama 4 Maverick avec des entiers, quelles opérations s'ajoutent à celles de notre réseau (la norme, l'attention, le routeur des experts), et comment il découpe une passe en 25 segments, prouvés l'un après l'autre dans une seule preuve. On ne peut pas le faire tourner : il demande un GPU H100 et, selon l'étape, de 270 à 300 Go de mémoire (`guide/performance.md`, « Machine »). On le lit donc avec les outils construits jusqu'ici, et chaque mécanisme se ramène à un exercice à la main.

On commence par la forme du modèle, puis on résume ce que les pages [[modele-entier]] et [[attention]] construisent. On en vient ensuite au découpage en segments, à ce qui se passe dans un segment et aux sumchecks qu'il lance, et on regarde notre réseau comme un segment de ce découpage. On finit par ce que FlashProve dit lui-même ne pas prouver.

## La forme du modèle

FlashProve prouve une passe de Llama 4 Maverick sur une fenêtre de $T = 1\,024$ tokens. Les dimensions sont publiques (`docs/model.md` §2) :

| symbole | sens | valeur |
|---|---|---|
| $T$ | positions de la fenêtre | 1 024 |
| $L$ | couches | 48 |
| $d$ | largeur du flux résiduel | 5 120 |
| $n_h$, $n_g$ | têtes de requêtes, têtes de clés et valeurs | 40, 8 |
| $d_h$ | dimension d'une tête | 128 |
| $f$, $f_e$ | unités d'une couche dense, d'un expert | 16 384, 8 192 |
| $N_E$ | experts routés | 128 |
| $V$ | vocabulaire | 202 048 |

Les couches impaires sont des couches à experts, les couches paires sont denses. Le modèle a 400,7 milliards de poids engagés, et une passe sur un token en utilise 16,15 milliards (paper p.46, §7.8). Ces poids ne sont pas ceux de Meta : ce sont ceux d'une quantification sur 4 bits publiée par un tiers, les fichiers UD-Q4_K_XL d'Unsloth (paper p.40, §7.1).

Une couche à experts a, en plus d'un expert partagé que tout token traverse, 128 experts routés, et son routeur n'en choisit qu'un par token (`docs/model.md` §7). Chaque expert a trois matrices : la porte et la montée, de taille $d \times f_e$, et la descente, de taille $f_e \times d$ (`docs/model.md` §3).

:::exercice ★★
Quelle part des poids engagés une passe utilise-t-elle ? Calculez le nombre de poids d'un expert, puis celui de tous les experts routés des 24 couches à experts, et déduisez-en d'où vient l'écart. La table de plongement, de taille $V \times d$, compte aussi parmi les poids engagés, et un token n'en lit qu'une ligne.

:::reponse
La part utilisée vaut $16{,}15 / 400{,}7 \approx 4\,\%$.

Un expert a $3 \times 5\,120 \times 8\,192 = 125\,829\,120$ poids, et les 128 experts routés d'une couche en ont 128 fois plus, environ 16,1 milliards. Sur les 24 couches à experts, cela fait environ 386,5 milliards, soit 96 % des poids engagés. Un token n'utilise qu'un expert routé par couche, donc $386{,}55 \times 127/128 \approx 383{,}53$ milliards de poids ne servent pas à ce token. La table de plongement a $202\,048 \times 5\,120 \approx 1{,}03$ milliard de poids, dont le token ne lit qu'une ligne de 5 120. Avec les 400,71 milliards exacts de la forme, il reste :

$$400{,}71 - 383{,}53 - 1{,}03 \approx 16{,}15 \text{ milliards}$$

le nombre que donne l'article, qui compte de cette façon la tête entière et la seule ligne de plongement lue (paper p.46, §7.8).
:::
:::

## Le modèle en entiers

Notre réseau n'avait qu'un produit, un arrondi, une ReLU par table et un argmax. La page [[modele-entier]] construit ce que le modèle de FlashProve ajoute :

- la norme calcule une somme de carrés qui dépasse $p$, en base 256 avec des retenues, puis une racine entière et une réciproque, prouvées chacune par deux écarts positifs ;
- la fonction SiLU se lit dans une table dont les deux colonnes sont empaquetées en un nombre ;
- la rotation RoPE est linéaire, et elle passe dans le facteur public de l'affirmation sur les poids ;
- le routeur choisit un expert par un vecteur engagé qui vaut 1 en une seule position ;
- la tête montre les marges du token annoncé, sans engager les logits.

Chaque opération se ramène ainsi à des arrondis, des écarts positifs, des tables et des marges. Ces égalités tiennent modulo $p$, et elles deviennent des égalités entre entiers parce que le [[test-petitesse|test de petitesse]] montre que chaque cellule reste sous $2^{18}$.

## L'attention

L'attention est la seule opération où deux matrices de données se multiplient, et elle demande un maximum, une exponentielle et une division. La page [[attention]] l'écrit en entiers et la prouve : les scores par un sumcheck de degré 3, le maximum par deux conditions, l'exponentielle par une table, la normalisation par une division arrondie, et le masque causal par une marge ajoutée aux paires interdites.

## Les segments

Le prouveur s'engage sur toutes les valeurs intermédiaires de la passe, la **trace**. Dans notre preuve du réseau, la table des cellules sert jusqu'au bout : le cas de base final ouvre des positions de cette table, donc le prouveur la garde en entier. Pour une passe de 48 couches sur 1 024 positions, cette table serait la trace entière. FlashProve découpe donc la passe en **segments**, et ne transmet d'un segment au suivant qu'un engagement court, « so it need not keep the whole trace » (`docs/protocol.md` §6.3).

Les couches sont prises par groupes de 4. Le segment $G_g$ couvre tout le groupe $g$ sauf la fonction d'attention ; le segment $A_g$ couvre l'attention de ces quatre couches ; le segment $H$ est la tête. Ils viennent dans l'ordre $G_0, A_0, G_1, A_1, \dots, H$ (format 11, « The sub-proofs of a segment »). $G_g$ engage aussi les requêtes, les clés, les valeurs et la sortie de l'attention de ses couches, et $A_g$ lit ces cellules pour montrer que la sortie est bien l'attention des trois autres (format 11.3, « What the segment computes », point 1 ; D2 §8).

:::exercice ★
Combien de segments compte une passe ? Pourquoi un de plus que deux par groupe ?

:::reponse
48 couches en groupes de 4 donnent 12 groupes, donc $2 \times 12 = 24$ segments $G_g$ et $A_g$. La tête $H$ en ajoute un : 25 segments, le « $G = 25$ » de la table 2 de l'article (paper p.14 ; D2 §0).
:::
:::

### Dans un segment

Un segment suit les étapes de notre preuve du réseau ([[preuve-reseau]]), dans cet ordre (format 11.1 ; paper, construction D.9, p.80) :

1. le prouveur s'engage sur les cellules du segment ;
2. un seul lookup contrôle les clés de toutes les tables du segment ;
3. des sumchecks ramènent les égalités du segment à des affirmations sur les cellules et sur les poids ;
4. le prouveur s'engage sur `U3`, les sommes partielles par lesquelles les affirmations lisent les cellules ;
5. le test de petitesse borne toutes les cellules ;
6. toutes les affirmations sur ce qui est engagé sont regroupées en **une seule équation linéaire** ;
7. cette équation est pliée et portée au segment suivant.

Chaque affirmation de l'étape 6 est linéaire. Une valeur en un point d'une extension multilinéaire est une combinaison linéaire des entrées du vecteur, à coefficients publics, et aucun tour ne fait de test à part : chaque contrôle d'un tour devient une forme affine qui doit valoir 0 (format 11.1, première partie : « Nothing is tested during the rounds » ; D2 §0). Le vérifieur tire alors un défi $\chi$, et l'affirmation $c_i = 0$ est multipliée par $\chi^i$ ([[horner]]) :

$$\sum_i \chi^i\, c_i = 0$$

:::exercice ★★
Un segment regroupe ainsi 1 000 affirmations, avec $\chi$ tiré dans $\mathbb{E}$, de taille $p^3 \approx 2^{192}$. Quelle borne d'erreur pour ce regroupement ?

:::reponse
Si une affirmation est fausse, $\sum_i \chi^i c_i$ est un polynôme non nul en $\chi$ de degré au plus 999, qui a au plus 999 racines ([[horner]]). L'erreur vaut au plus :

$$\frac{999}{|\mathbb{E}|} \approx \frac{2^{10}}{2^{192}} = 2^{-182}$$
:::
:::

L'équation du segment porte sur les tables engagées du segment. Au lieu de la contrôler sur place par un [[test-proximite|test de proximité]], comme notre preuve le fait pour sa table des cellules, FlashProve plie la table du segment comme au [[proximite|chapitre 9]], et le résultat plié, deux lignes, est engagé à nouveau en tête du groupe du segment suivant (format, règle R12.16, dans `docs/format/09-key-and-leaf-files.md` ; paper, construction D.9 (b), p.80, un changement de code « from the group of segment $g - 1$ to a message that also holds the cells of segment $g$ »). Un seul test de proximité porte sur le dernier engagement court (`docs/protocol.md` §6.3). Les affirmations de chaque segment sur les poids s'accumulent à part, et elles sont regroupées à la fin en une seule équation $g \cdot M \cdot e + \mu = v$ sur la table des poids (`docs/protocol.md` §6.3), que lit le [[flashprove-lots|chapitre 13]].

:::figure Les 25 segments d'une passe. Chacun porte au suivant une équation linéaire pliée, et ses affirmations sur les poids rejoignent une seule équation à la fin.
<svg viewBox="0 0 480 210" role="img" aria-label="Une rangée de segments : G0, A0, G1, A1, des points de suspension, G11, A11 et H. Des flèches relient chaque segment au suivant : une équation linéaire pliée passe de l'un à l'autre. G0 et A0 forment le groupe 0, G1 et A1 le groupe 1, G11 et A11 le groupe 11, H est la tête. De chaque segment, une ligne pointillée descend vers une barre : toutes les affirmations sur les poids, regroupées en g · M · e + μ = v. Après H, un seul test de proximité porte sur le dernier engagement court."><text x="55" y="14" class="m s mid">groupe 0</text><path d="M 2 26 V 20 H 108 V 26" class="lm"/><text x="179" y="14" class="m s mid">groupe 1</text><path d="M 126 26 V 20 H 232 V 26" class="lm"/><text x="343" y="14" class="m s mid">groupe 11</text><path d="M 290 26 V 20 H 396 V 26" class="lm"/><text x="436" y="14" class="m s mid">tête</text><rect x="2" y="32" width="44" height="34" class="box"/><text x="24" y="54" class="b mid">G₀</text><rect x="64" y="32" width="44" height="34" class="box"/><text x="86" y="54" class="b mid">A₀</text><rect x="126" y="32" width="44" height="34" class="box"/><text x="148" y="54" class="b mid">G₁</text><rect x="188" y="32" width="44" height="34" class="box"/><text x="210" y="54" class="b mid">A₁</text><text x="261" y="54" class="b mid">…</text><rect x="290" y="32" width="44" height="34" class="box"/><text x="312" y="54" class="b mid">G₁₁</text><rect x="352" y="32" width="44" height="34" class="box"/><text x="374" y="54" class="b mid">A₁₁</text><rect x="414" y="32" width="44" height="34" class="ring"/><text x="436" y="54" class="b mid">H</text><line x1="47" y1="49" x2="61" y2="49" class="lc" marker-end="url(#fac)"/><line x1="109" y1="49" x2="123" y2="49" class="lc" marker-end="url(#fac)"/><line x1="171" y1="49" x2="185" y2="49" class="lc" marker-end="url(#fac)"/><line x1="233" y1="49" x2="247" y2="49" class="lc" marker-end="url(#fac)"/><line x1="273" y1="49" x2="287" y2="49" class="lc" marker-end="url(#fac)"/><line x1="335" y1="49" x2="349" y2="49" class="lc" marker-end="url(#fac)"/><line x1="397" y1="49" x2="411" y2="49" class="lc" marker-end="url(#fac)"/><line x1="24" y1="67" x2="24" y2="114" class="lm dash" marker-end="url(#fam)"/><line x1="86" y1="67" x2="86" y2="114" class="lm dash" marker-end="url(#fam)"/><line x1="148" y1="67" x2="148" y2="114" class="lm dash" marker-end="url(#fam)"/><line x1="210" y1="67" x2="210" y2="114" class="lm dash" marker-end="url(#fam)"/><line x1="312" y1="67" x2="312" y2="114" class="lm dash" marker-end="url(#fam)"/><line x1="374" y1="67" x2="374" y2="114" class="lm dash" marker-end="url(#fam)"/><line x1="436" y1="67" x2="436" y2="114" class="lm dash" marker-end="url(#fam)"/><rect x="2" y="118" width="456" height="30" class="box"/><text x="230" y="138" class="b mid">poids : g · M · e + μ = v</text><line x1="2" y1="170" x2="22" y2="170" class="lc" marker-end="url(#fac)"/><text x="30" y="174" class="c s">une équation linéaire, pliée, portée au segment suivant</text><text x="2" y="198" class="m s">après H : un test de proximité sur le dernier engagement court</text></svg>
:::

Les 25 segments ne sont pas 25 preuves. La première chaîne de hachage de la preuve traverse tous les segments dans l'ordre (format 11), et chacun ne se contrôle qu'à travers l'équation qu'il porte au suivant : « Our segments are not proofs of their own: one proof runs through all of them in order » (paper p.85 ; D2 §8).

## Les sumchecks d'un segment

Chaque sumcheck d'un segment a un terme qui est un produit de fonctions multilinéaires, et le degré de ses tours est le nombre de facteurs qui dépendent de la variable du tour (D2 §1.3) :

| où | terme | degré |
|---|---|---:|
| segments feed-forward et tête | une lecture de cellules fois un facteur des poids | 2 |
| attention : scores et sommes pondérées | $W \cdot A \cdot B$ | 3 |
| attention : lecture des clés à la position du maximum (`SD`) | une clé fois une indicatrice par bit de la position | jusqu'à $\log_2 T + 2 = 12$ |
| lookup : lien des plans de bits | $P_{j+1}^2\, G_j$ | 3 |

Dans un segment feed-forward, tous les produits par les poids sont placés côte à côte et prouvés par un seul sumcheck, l'étape 11, qui compte 23 tours simples de degré 2 à pleine échelle (format 11.2, « The panels of step 11 » et « A worked example »).

:::exercice ★
Combien de termes ce sumcheck additionne-t-il ? Combien de nombres le prouveur envoie-t-il pour ses 23 tours, sachant qu'un tour de degré $k$ n'envoie pas le coefficient que l'équation du tour fixe ([[sumcheck]]) ?

:::reponse
23 variables booléennes donnent $2^{23} = 8\,388\,608$ termes. Un polynôme de degré 2 a 3 coefficients, et le prouveur en envoie 2 par tour, soit 46 pour les 23 tours. L'étape 11 envoie 86 nombres en tout, en comptant ses valeurs finales et le masquage (format 11.2, « A worked example »).
:::
:::

## Notre réseau comme un segment

Notre preuve du petit réseau ([[preuve-reseau]]) a la forme d'un seul segment qui contiendrait aussi la tête. Elle fait les étapes 1, 2, 3 et 6 de la liste. Le prouveur s'engage sur $q$, $a$ et les plans de bits des multiplicités, un seul lookup contrôle les trois tables $R_4$, $T_\varphi$ et $R_{32}$, des sumchecks ramènent les produits $W_1 x$ et $W_2 a$ à des affirmations sur les poids, et ces affirmations sont regroupées par les puissances d'un défi. À la place de l'étape 7, un pliage et un cas de base finissent la preuve sur la table des cellules. Elle n'a ni l'étape 4 ni l'étape 5 : pas de lectures `U3` et pas de test de petitesse.

:::exercice ★★
Pour chacune des valeurs $h$, $s$, $q$, $a$, $y$ et $\Delta$ du réseau, dites quelle table ou quel argument la borne. Pourquoi notre preuve n'a-t-elle pas besoin du test de petitesse ?

:::reponse
- $s$ est une clé de $R_4$, donc $s \in [0, 3]$.
- $(q, a)$ est une ligne de $T_\varphi$, donc $q \in [-3, 3]$ et $a = \max(q, 0)$.
- $\Delta$ est une clé de $R_{32}$, donc $\Delta \in [0, 31]$.
- $h = W_1 x$ et $y = W_2 a$ n'ont pas de table : ils sont bornés par la taille. Les poids sont ternaires, prouvé une fois à l'engagement, $x \in [0, 3]$ est public et $a \in [0, 3]$ vient de la table, donc $|h| \le 12$ et $|y| \le 12$.

Toutes nos valeurs sont donc bornées par une table ou par un argument de taille, et nos clés à deux colonnes passent par un défi $\beta$, $q + \beta a$, qui ne demande pas de borne préalable. FlashProve empaquette ses clés et décale ses clés de contrôle d'intervalle, deux procédés qui ne valent que si les cellules sont déjà petites ([[intervalles|Contrôles d'intervalle]], [[tables|chapitre 7]]) : c'est cette borne préalable que donne le test de petitesse.
:::
:::

## Ce qui n'est pas prouvé

FlashProve énonce lui-même trois limites de cette partie.

- Aucune clé de lookup ne contient la sortie $o$ de l'attention, et le format ne connaît aucun test qui montre la borne que ses conditions de non-débordement supposent pour elle (format 11.3, « No overflow », dernier paragraphe).
- Les pages du format donnent chaque affirmation comme une formule, mais pas d'argument qui montre que les affirmations entraînent la fonction entière, ni qu'une égalité dans le corps tient entre entiers (format 11.2 à 11.4, « What this part does not specify »).
- Le lemme 4.9, qui relie la relation prouvée au modèle, est vérifié par machine en deux moitiés, jointes sur papier (paper p.17 ; D2 §0).

:::exercice ★★
Montrez que chez un prouveur honnête, la sortie $o$ d'une tête d'attention reste dans $[-2047, 2047]$, l'intervalle des valeurs $v_j$.

:::reponse
$\mathrm{acc}/Z = \sum_j ew_j v_j / \sum_j ew_j$ est une moyenne des $v_j$ avec des poids positifs, donc elle est comprise entre le plus petit et le plus grand $v_j$, dans $[-2047, 2047]$. $o$ est cette moyenne arrondie au plus proche, et les bornes $-2047$ et 2047 sont des entiers, donc l'arrondi reste dans l'intervalle.

C'est la borne que décrivent les commentaires du code, « a rounded mean of values of v », et le format dit qu'aucun test ne la montre pour un prouveur qui triche (format 11.3, « No overflow »).
:::
:::

:::piege
**Toutes les valeurs intermédiaires ne sont pas bornées.** Le test de petitesse borne chaque cellule, et aucun lookup ne borne la sortie $o$ de l'attention, de l'aveu même du format.
:::

## Notre prouveur et FlashProve

| | notre réseau | FlashProve |
|---|---|---|
| segments | 1 | 25 : $G_0, A_0, \dots, G_{11}, A_{11}, H$ (format 11) |
| opérations | produit, arrondi, ReLU, argmax | en plus : norme (racine entière, réciproque), RoPE, attention (maximum, exponentielle, division), routeur, SiLU, tête par marges (`docs/model.md` §5-8) |
| bornes des cellules | une table par valeur, la taille des poids pour $h$ et $y$ | test de petitesse : toutes les cellules sous $2^{18}$ (format 11.1) |
| sommes plus grandes que $p$ | aucune | somme des carrés de la norme jusqu'à $2^{78}$ : base 256 et retenues (format 11.2, groupe 5) |
| fin de la preuve | pliage et cas de base sur la table des cellules | équation pliée portée de segment en segment, un test de proximité sur le dernier engagement court (`docs/protocol.md` §6.3) |

## La suite

Les affirmations des 25 segments sur les poids finissent regroupées en une seule équation $g \cdot M \cdot e + \mu = v$ sur la table des poids. Le chapitre suivant, [[flashprove-lots]], montre comment une seule ouverture de cette table sert toutes les requêtes d'un lot.

:::quiz
1. Combien de segments compte une passe, et lesquels ?
2. Que porte un segment au suivant ?
3. Quel degré a le sumcheck des scores de l'attention, et pourquoi ?
4. Que dit FlashProve de la borne de la sortie $o$ de l'attention ?
5. Que borne le test de petitesse ?

:::reponse Réponses
1. 25 : $G_0, A_0, \dots, G_{11}, A_{11}$, puis la tête $H$.
2. Une seule équation linéaire, qui regroupe toutes ses affirmations sur ce qu'il a engagé, pliée en un engagement court.
3. 3 : son terme est un produit $W \cdot A \cdot B$ de trois fonctions multilinéaires, chacune de degré 1 dans la variable du tour.
4. Qu'aucun lookup ni aucun test connu du format ne la montre.
5. Chaque cellule, sous $2^{18}$ en valeur absolue, deux fois la fenêtre $2^{17}$ des combinaisons, sauf avec une probabilité d'au plus $2^{-128}$.
:::
:::
