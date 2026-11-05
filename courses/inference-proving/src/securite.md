---
id: securite
---
On veut un nombre : la probabilité qu'un prouveur qui triche fasse accepter une fausse preuve, et ce qu'elle devient quand il peut calculer beaucoup de hachages.

Cette page donne d'abord une erreur à chaque tour où le vérifieur tire un défi, puis elle l'écrit en bits. Elle additionne ensuite les tours d'une preuve, et elle voit ce que change la [[fiat-shamir|chaîne de hachage]] : l'erreur grandit avec le nombre de hachages du tricheur. Elle finit par les chiffres de FlashProve, ceux que ses programmes comptent et celui que Lean démontre.

## L'erreur d'un tour

Un tour est un message du prouveur suivi d'un tirage du vérifieur. On suppose que l'affirmation que le prouveur défend avant ce tour est fausse. L'**erreur** du tour est la probabilité que le tirage la laisse passer, c'est-à-dire qu'après ce tirage le prouveur n'ait plus qu'une affirmation vraie à défendre, ou que le contrôle final passe. Les tours de nos preuves sont de deux sortes.

Dans un **tour algébrique**, l'affirmation fausse survit si le défi est une racine d'un polynôme non nul de degré au plus $d$. Un tel polynôme a au plus $d$ racines, donc l'erreur vaut au plus

$$\frac{d}{|\mathbb{E}|}$$

C'est le cas d'un tour de [[sumcheck]] de degré 2 ($d = 2$), d'un regroupement de $m$ affirmations par les puissances d'un $\chi$ ($d = m - 1$, [[horner]]) et du défi $\alpha$ d'un lookup à $N$ clés dont les multiplicités ont pour somme $N$ ($d = N - 1$, [[lookups]]). Cette erreur ne dépend que de $d$ et de la taille du corps des défis, et c'est pour la réduire qu'on tire les défis dans l'[[extension]].

Dans un **tour de positions**, le vérifieur ouvre $t$ positions d'un mot engagé. Si ce mot est à une distance relative d'au moins $\delta$ du mot du code dont parle le prouveur, chaque position tirée montre une différence avec une probabilité d'au moins $\delta$. Les $t$ positions sont tirées indépendamment, donc elles manquent toutes les différences avec une probabilité d'au plus

$$(1 - \delta)^t$$

Un mot plus proche que $\delta$ d'un mot du code n'est pas dangereux en décodage unique, puisqu'il désigne ce mot-là ([[test-proximite]]). Au-delà du rayon de décodage unique, plusieurs mots du code peuvent être proches, et la taille de la liste multiplie certaines erreurs.

Le pli du test de proximité a une erreur de plus : il faut qu'un mot loin du code reste loin après le pli. [[test-proximite]] énonce ce résultat sans le démontrer.

:::incertain
Le notebook compte pour chaque tour de pli une erreur de $2/|\mathbb{E}| + n/|\mathbb{E}|$, avec $n = 32$ la longueur du code. Le terme $n/|\mathbb{E}|$ est la forme connue de l'écart de proximité en décodage unique (Ben-Sasson, Carmon, Ishai, Kopparty, Saraf, ePrint 2020/654), reprise de mémoire et pas vérifiée dans la source pour ce cours.
:::

## Les bits

Une erreur se lit mieux par son exposant de 2. On définit

$$\text{bits} = -\log_2(\text{erreur})$$

Une erreur de $2^{-20}$ vaut 20 bits ; diviser l'erreur par 2 ajoute un bit.

:::exercice ★
Combien de bits pour une erreur de $2/97$ (un tour de degré 2 avec des défis dans $\mathbb{F}_{97}$), de $2/97^3$ (le même tour dans $\mathbb{E}_{97}$) et de $(0{,}625)^8$ (8 positions à $\delta = 0{,}375$) ?

:::reponse
$\log_2(97/2) \approx 5{,}6$ bits ; $\log_2(97^3/2) = \log_2(456\,336{,}5) \approx 18{,}8$ bits ; $8 \log_2(1/0{,}625) = 8 \times 0{,}678 \approx 5{,}4$ bits.

Tirer dans $\mathbb{E}_{97}$ plutôt que dans $\mathbb{F}_{97}$ fait passer un tour de degré 2 de 5,6 à 18,8 bits. Le tour de positions ne dépend pas du corps : il reste à 5,4 bits.
:::
:::

Dans notre preuve, un tour de positions vaut donc environ 5 bits. Pour monter, il faut ouvrir plus de positions.

:::exercice ★
Combien de positions faut-il à $\delta = 0{,}375$ pour qu'un tour de positions vaille 128 bits ? Notre code de longueur 32 le permet-il ?

:::reponse
Chaque position vaut $\log_2(1/0{,}625) \approx 0{,}678$ bit, donc il en faut $128/0{,}678 \approx 188{,}8$, soit 189. La borne reste juste avec des tirages qui se répètent, mais notre code n'a que 32 positions : 189 tirages les ouvrent presque toutes, et ouvrir toutes les colonnes revient à lire toute la table, ce que la preuve devait éviter. Dans $\mathbb{F}_{97}$ les codes s'arrêtent à 32 points ([[test-proximite]]) ; dans Goldilocks ils vont jusqu'à $2^{32}$, et 189 positions y sont une petite part du mot.
:::
:::

## Plusieurs tours

Une preuve a beaucoup de tours, et le tricheur gagne si l'un d'eux laisse passer son mensonge. La probabilité qu'au moins un tour le laisse passer vaut au plus la somme des erreurs des tours :

$$\varepsilon \le \sum_i \varepsilon_i$$

C'est la borne de l'union. Elle est dominée par les tours les plus faibles.

:::exercice ★★★
Un sumcheck de 23 tours de degré 2 tire ses défis dans le corps $\mathbb{E}$ de Goldilocks, qui a $p^3 \approx 2^{192}$ éléments. Quelle est son erreur totale ? Qu'en conclut-on sur les tours où FlashProve met de la preuve de travail ?

:::reponse
Chaque tour a l'erreur $2/2^{192}$, donc les 23 tours ensemble au plus

$$\frac{23 \times 2}{2^{192}} = \frac{46}{2^{192}} \approx 2^{-186{,}5}$$

puisque $\log_2 46 \approx 5{,}5$. Les tours algébriques ne sont pas le point faible de FlashProve : ce sont les tours de positions, et c'est avant eux seulement qu'il exige de la preuve de travail.
:::
:::

Le notebook du chapitre compte ainsi la preuve d'une entrée de notre réseau, qui a 105 tours. Un tour peut tirer plusieurs défis à la suite, sans message du prouveur entre eux, comme le tour qui suit la racine des cellules $R_c$ et tire $\beta$ puis un $\alpha$ par lookup ([[preuve-reseau]]).

:::exercice ★★
Le notebook compte $28/|\mathbb{E}|$ pour $\beta$ (4 clés et 7 lignes : une paire hors de $T_\varphi$ n'égale une ligne $t + \beta \varphi(t)$ que pour au plus une valeur de $\beta$), $3/|\mathbb{E}|$ pour l'$\alpha$ de $R_4$ et pour celui de $T_\varphi$, et $198/|\mathbb{E}|$ pour celui de $R_{32}$ ([[tables]]). Pourquoi l'erreur du tour est-elle la somme de ces quatre erreurs ? Combien de bits vaut ce tour dans $\mathbb{E}_{97}$ ?

:::reponse
Les quatre défis sont tirés après le même message, $R_c$. Le tricheur gagne si l'un des quatre laisse passer son mensonge, et la borne de l'union majore cette probabilité par la somme des quatre erreurs. Après Fiat-Shamir, les quatre se lisent sur le même état de la chaîne : chaque nouvel essai de cellules lui donne d'un coup un nouveau $\beta$ et trois nouveaux $\alpha$, donc on compte ces tirages comme un seul tour.

$$\frac{28 + 3 + 3 + 198}{912\,673} = \frac{232}{912\,673} \approx 2^{-11{,}94}$$

Le tour vaut 11,94 bits, et l'$\alpha$ de $R_{32}$ en fait à lui seul 198 sur 232.
:::
:::

Les deux tours de positions valent 5,42 bits chacun. Le plus faible des autres est ce tour de $\beta$ et des $\alpha$, à 11,94 bits, puis viennent les tours de pli, à 14,71 bits avec le terme supposé plus haut. Toutes les erreurs additionnées donnent 4,40 bits, à peine moins que les deux tours de positions seuls.

:::exercice ★
La preuve regroupe 25 affirmations sur la table des cellules par les puissances d'un défi $\chi$ de $\mathbb{E}_{97}$. Combien de bits vaut ce tour ?

:::reponse
Le regroupement de $m = 25$ affirmations a l'erreur $(m - 1)/|\mathbb{E}| = 24/912\,673$, soit $\log_2(912\,673/24) \approx 15{,}2$ bits.
:::
:::

La chaîne de hachage change le compte. Dans un dialogue, un tour donne au tricheur une seule chance. Après Fiat-Shamir, il peut recommencer un tour autant de fois qu'il calcule de hachages ([[fiat-shamir]]) : avec $q$ hachages, un tour d'erreur $\varepsilon$ le laisse passer avec une probabilité d'environ $q \varepsilon$. On ne peut donc pas donner une erreur pour la preuve sans dire combien de hachages le tricheur calcule. On fixe plutôt une cible par tour, et on borne la preuve en fonction de $q$.

Une preuve de travail de $\kappa$ bits divise l'erreur d'un tour par $2^\kappa$ face à ce tricheur, donc elle compte pour $\kappa$ bits de plus dans ce tour. Pour une chaîne de hachage comme celle de FlashProve, c'est une hypothèse ([[fiat-shamir]]).

## Les chiffres de FlashProve

FlashProve vise 128 bits par tour, preuve de travail comptée (`sec 128` dans `prover/examples/target_full_f2/policy.txt`), et son vérifieur refuse une cible plus basse (`docs/protocol.md` §6.4).

:::exercice ★★
Vérifiez deux tours de positions de FlashProve : 64 colonnes à $\delta = 0{,}66407$ avec 28 bits de travail, et 219 positions à $\delta = 0{,}2901$ avec 20 bits.

:::reponse
$64 \log_2\big(1/(1 - 0{,}66407)\big) = 64 \times 1{,}5738 \approx 100{,}72$, plus 28 : $128{,}72$ bits.

$219 \log_2(1/0{,}7099) = 219 \times 0{,}4943 \approx 108{,}25$, plus 20 : $128{,}25$ bits.

Ce sont les lignes « 100.72 by the lists + 28 by work » et « 108.26 by the lists + 20 by work » de `verifier/tests/known_answers/kit_rounds/target_full_f2.txt`. Les nombres de positions et les distances sont dans `docs/format/08-parameters.md` §8.5, colonne `record.f2.txt` : 64 colonnes par lot à $\delta = 0{,}664066$, et 219 positions à $\delta = 0{,}290134$ à la première étape du groupe `link`, celui des segments d'une requête. Avec ce $\delta$ à six décimales, le second calcul donne 108,27 ; le fichier imprime 108,26, ce qui s'accorde avec une troncature à deux décimales. Sans le travail, ces tours valent environ 100,7 et 108,3 bits : c'est la preuve de travail qui les amène à la cible.
:::
:::

Ses programmes impriment plusieurs lectures des mêmes tours, à la taille réelle et avec les paramètres par défaut (`docs/limits.md`, « The error bounds that the programs print ») :

| | travail compté | travail non compté |
|---|---|---|
| le tour le plus faible | 128,00 bits | 96,23 bits |
| toute la borne en un nombre | 126,21 bits | 96,23 bits |
| tous les tours des fichiers de clé, de feuille et de requête additionnés | 119,38 bits | 92,42 bits |

Dans un lot complet de 64 requêtes comptées ensemble, chaque tour des chaînes propres à une requête vaut $\log_2 64 = 6$ bits de moins. La même page avertit : « Never quote "128 bits" by itself. None of the figures here is a security level. » Ces chiffres sont le calcul des programmes, sur des hypothèses énoncées, et non un niveau de sécurité.

## Ce que Lean démontre

FlashProve démontre six théorèmes en Lean ; celui de correction porte sur le vérifieur écrit en Lean, `verify`, sous la politique exact match (`lean/THEOREM.md`). Si le committer et le prouveur calculent ensemble au plus $q$ hachages, la probabilité que `verify` accepte des tokens de sortie qui ne sont pas ceux du modèle, avec les poids qu'un extracteur lit dans l'engagement, vaut au plus

$$\varepsilon(q) = \frac{16\,T}{2^{128}} + \frac{(T + 2)^2}{2^{256}}, \qquad T = q + 1 + 2^{23}$$

(paper p.20, théorème 5.1 ; `lean/THEOREM.md`, « The error »). Le terme $2^{23}$ réserve une part fixe pour les hachages du vérifieur lui-même (`docs/protocol.md` §6.4). Pour $q$ grand devant $2^{23}$, cette borne vaut environ $q/2^{124} + 2^{-101}$.

:::exercice ★★
Évaluez $q/2^{124} + 2^{-101}$ pour $q = 2^{64}$ et pour $q = 2^{100}$. À partir de quel $q$ la borne ne dit-elle plus rien ?

:::reponse
$2^{64}/2^{124} = 2^{-60}$, et $2^{-101}$ est négligeable devant : $\varepsilon \approx 2^{-60}$.

$2^{100}/2^{124} = 2^{-24}$ : un tricheur qui calcule $2^{100}$ hachages a une chance sur 16 millions.

La borne atteint 1 vers $q = 2^{124}$ et ne dit plus rien au-delà. Le notebook trouve les mêmes exposants avec la formule exacte.
:::
:::

Rien n'est démontré sur les programmes en C++ et CUDA, `cp_verify` compris : « Nothing is proved about the released programs, and no security level is claimed for them » (paper p.6, §1.4 ; D3 §2.1).

:::piege
**Citer une cible par tour comme un niveau de sécurité.** 128 bits par tour ne dit pas qu'une fausse preuve passe une fois sur $2^{128}$ : l'erreur d'une preuve additionne ses tours et grandit avec les hachages du tricheur.

**Oublier les hachages.** Après Fiat-Shamir, l'erreur d'une preuve dépend de $q$ ; une borne sans $q$ suppose un tricheur qui ne recommence jamais.

**Prendre les bits du jouet pour de la sécurité.** Les 5 bits de notre tour de positions viennent d'un corps choisi pour que chaque nombre se lise.
:::
