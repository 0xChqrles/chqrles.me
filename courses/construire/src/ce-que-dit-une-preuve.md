---
id: ce-que-dit-une-preuve
---
Le chapitre [[prouver-sans-refaire|Prouver un calcul sans le refaire]] posait trois exigences et une mise en garde : une preuve établit un calcul, pas la vérité d'une réponse. Les chapitres suivants ont construit les pièces qui répondent aux trois exigences, sur notre réseau puis dans FlashProve. Ce chapitre lit ce que FlashProve établit exactement quand un client reçoit une réponse, une preuve et un verdict d'acceptation. On lit d'abord sous quelle politique un token est accepté, puis ce qui est démontré en Lean et ce qui ne l'est pas. On cherche ensuite ce qu'une preuve laisse fuir par construction, et ce que le client doit vérifier lui-même. Le chapitre finit en reprenant les trois exigences du chapitre 1.

## Deux verdicts d'acceptation

Le client vérifie une preuve avec `cp_verify`, le vérifieur en C++ de FlashProve. Ce programme accepte de deux façons. Sa dernière ligne est `YES` quand la configuration impose la politique exact match, et `WITHIN LIMITS: …` sous une politique à écart plafonné ([[politiques]]). Dans les deux cas, `cp_verify` se termine avec le code 0 (`guide/terms.md`, « YES » ; `guide/verify-a-proof.md`, « Last line and exit code »), donc un programme qui ne lit que le code de sortie ne les distingue pas.

Notre prouveur applique déjà une politique sans la nommer. Son énoncé annonce la classe $c$, et les marges de [[argmax]] prouvent que $c$ est la première position du maximum de $y$. Les sorties $y$ jouent le rôle des logits, et la réponse a un seul token compté, la classe.

:::exercice ★
Pour l'entrée $x = (2, 1, 3, 1)$, le réseau donne $y = (1, 3, 3, -2)$. Calculez l'écart et le coût, définis dans [[politiques]], de chacune des 4 classes. Lesquelles respectent exact match ? Lesquelles respectent la politique $(257, 257, 0)$ ?
:::reponse
Pour chaque classe $v$, l'écart est le plus grand des termes $y_{v'} - y_v + [v' < v]$ :

$$
\begin{aligned}
\mathrm{gap}(0) &= \max(0,\ 2,\ 2,\ -3) = 2 \\
\mathrm{gap}(1) &= \max(-1,\ 0,\ 0,\ -5) = 0 \\
\mathrm{gap}(2) &= \max(-1,\ 1,\ 0,\ -5) = 1 \\
\mathrm{gap}(3) &= \max(4,\ 6,\ 6,\ 0) = 6
\end{aligned}
$$

Les coûts valent donc $(258, 256, 257, 262)$.

Exact match n'accepte qu'un coût de 256 : la classe 1, celle que prouve notre énoncé.

Sous $(257, 257, 0)$, un seul token compté passe si son coût ne dépasse pas 257. Les classes 1 et 2 passent. La classe 2 a la même sortie que la classe 1 mais vient après elle : cette politique accepte l'égalité tranchée dans l'autre sens.

Notre prouveur prouve donc l'énoncé d'exact match, sur un seul token.
:::
:::

## Ce qui est démontré

On veut une phrase précise derrière la troisième exigence du chapitre 1 : le vérifieur rejette un calcul faux, sauf avec une probabilité qu'on sait chiffrer. Un calcul faux est faux par rapport à des poids, et le vérifieur ne les a pas : il n'a que l'identifiant d'engagement. Le théorème de **correction** (soundness) de FlashProve fixe donc ces poids par une règle, l'**extracteur**, qui lit des poids $M^*$ dans l'engagement et dans les requêtes au hachage de celui qui l'a fait, avant toute preuve.

Le théorème décrit une expérience (`lean/THEOREM.md`, « The experiment ») :

1. La fonction de hachage est tirée au hasard : c'est le modèle de l'oracle aléatoire de [[fiat-shamir]].
2. Celui qui s'engage fait au plus $a$ requêtes au hachage et publie un engagement.
3. L'extracteur reçoit l'engagement, les requêtes de celui qui s'est engagé et leurs réponses, et renvoie des poids $M^*$, ou rien.
4. Le prouveur fait au plus $b$ requêtes, puis choisit un prompt $x$, une sortie $y$ et une preuve.
5. Le vérifieur écrit en Lean, `verify`, accepte ou rejette.

Le théorème dit que, pour la politique exact match et avec $q = a + b$,

$$\Pr\big[\texttt{verify} \text{ accepte, et } y \text{ n'est pas une sortie gloutonne de } M^* \text{ sur } x\big] \le \varepsilon(q)$$

quels que soient celui qui s'engage et le prouveur (article p. 20, théorème 5.1 ; `lean/THEOREM.md`, « In exact terms »). Si l'extracteur ne renvoie rien, toute acceptation compte comme un échec. La borne vaut

$$\varepsilon(q) = \frac{16\, T}{2^{128}} + \frac{(T + 2)^2}{2^{256}}, \qquad T = q + 1 + 2^{23}$$

où le 1 compte la requête de l'analyseur de la preuve, et $2^{23}$ une provision pour les requêtes du vérifieur lui-même (`lean/THEOREM.md`, « The error »). La page [[securite]] a évalué cette borne ; on cherche ici d'où vient sa forme approchée.

:::exercice ★★
Montrez que $\varepsilon(q)$ vaut environ $q/2^{124} + 2^{-101}$ pour $q \le 2^{124}$.
:::reponse
Le premier terme se développe :

$$\frac{16\,(q + 1 + 2^{23})}{2^{128}} = \frac{q}{2^{124}} + \frac{2^{23} + 1}{2^{124}} \approx \frac{q}{2^{124}} + 2^{-101}$$

Le second terme vaut environ $(q + 2^{23})^2 / 2^{256}$. Pour $q \ge 2^{23}$, c'est au plus $(2q)^2/2^{256} = q^2/2^{254}$, soit le premier terme multiplié par $q/2^{130}$, qui reste sous $2^{-6}$ pour $q \le 2^{124}$. Pour $q < 2^{23}$, il vaut au plus environ $2^{48}/2^{256} = 2^{-208}$.

Le second terme ne compte donc pas, et la forme approchée est celle qu'évalue [[securite]] : environ $2^{-60}$ à $q = 2^{64}$, la valeur que donne `lean/THEOREM.md`.
:::
:::

La borne compte des requêtes qui renvoient 32 octets. Un appel à BLAKE2b qui renvoie 64 octets compte pour deux, donc les 124 bits par requête valent au moins 123 bits par appel réel (`lean/THEOREM.md`, « The error »). Ce sont les seuls bits démontrés. Les programmes affichent un objectif de 128 bits par tour, preuve de travail comptée, qui n'est pas un niveau de sécurité, et FlashProve demande de ne jamais citer « 128 bits » seul (`docs/limits.md`, « The error bounds that the programs print » ; [[securite]]).

### Les conditions du théorème

Le théorème porte sur `verify`, le vérifieur écrit en Lean, et pas sur `cp_verify`. L'article le dit ainsi : « Nothing is proved about the released programs, and no security level is claimed for them » (article p. 6, §1.4).

Il porte sur exact match seulement. Sous une politique à écart plafonné, Lean démontre seulement qu'une sortie acceptée respecte la politique pour les poids $M^*$ (article p. 23, théorème 5.11), et [[politiques]] a montré que cela n'interdit rien à un fournisseur qui choisit des poids sous lesquels toute sortie passe.

Il porte sur un engagement, un prompt, une sortie, une preuve et un appel de `verify`. Une preuve faite dans un lot et vérifiée seule est couverte à $\varepsilon(q)$, et $N$ preuves envoyées en même temps le sont à $N\, \varepsilon(q)$ (article p. 4, corollaire 5.10). Pour des preuves envoyées l'une après l'autre, aucune borne n'est énoncée (article p. 6 ; `guide/what-is-proved.md`, « Soundness »).

:::exercice ★
Un client reçoit en même temps les 64 preuves d'un lot complet, et les tricheurs ont fait au plus $2^{64}$ requêtes. Quelle borne le corollaire donne-t-il ?
:::reponse
$64\, \varepsilon(2^{64}) \approx 2^6 \times 2^{-60} = 2^{-54}$.
:::
:::

L'extracteur, enfin, est une fonction mathématique définie avec l'axiome du choix, sans algorithme, et rien ne montre qu'elle se calcule. Le théorème ne montre pas que le prouveur connaissait les poids (`guide/terms.md`, « Extractor »).

Deux autres propriétés sont démontrées en Lean pour le protocole, avec un prouveur écrit en Lean, qui est une définition et pas le prouveur CUDA. La **complétude** dit qu'une requête servie honnêtement est acceptée, sauf avec une probabilité d'au plus $2^{-40}$ (article p. 33, théorème 6.29). Le **zero-knowledge** dit que ce que voit le vérifieur se simule sans les poids, à une distance statistique inférieure à $2^{-154}$, tant que le vérifieur fait au plus $2^{64}$ requêtes au hachage et demande au plus 688 127 réponses (article p. 36, théorème 6.37). Les deux valent à exact match, avec des masques neufs, pour un engagement, une requête par preuve et une table feuille, pas pour les lots (article p. 4, tableau 1 ; `guide/how-it-works.md`, « What is established »).

:::exercice ★★★
Le client vérifie avec `cp_verify`, pas avec `verify`. Que lui garantit le théorème ? Que peut-il faire pour être couvert ?
:::reponse
Rien directement. Le théorème porte sur `verify`, et aucun théorème ne dit que `cp_verify` exécute le même protocole : cela repose sur des tests et sur la lecture du code (`guide/how-it-works.md`, « What is established »). Ces tests sont étroits : toute preuve honnête en taille réelle soumise au vérifieur Lean a été acceptée, mais à deux configurations environ et sur des poids synthétiques, et aucune des 57 preuves mensongères essayées n'a été acceptée par l'un ou l'autre vérifieur (`lean/THEOREM.md`, « In short »).

Pour être couvert, le client peut obtenir le verdict de `verify` lui-même avec `lean-verify`, qui exécute sa forme exécutable dans Lean, en des dizaines de minutes. Il doit encore contrôler les lignes de politique, et il fait alors confiance à l'évaluateur, au compilateur et à l'environnement d'exécution de Lean (`guide/verify-a-proof.md`, « The verifier that Lean proves sound »).
:::
:::

## Ce que révèle chaque requête

Le chapitre [[cacher|Cacher les poids]] a ajouté des masques pour que la preuve n'apprenne rien des poids au vérifieur. Les masques laissent voir une information, par construction : si la requête est servie. Une requête est **servie** quand elle est bien formée, que le modèle a un résultat sur elle, et que ce résultat est la sortie annoncée (`guide/terms.md`, « Served request »). Sinon elle est refusée et reçoit une preuve vide. Ce bit dépend des poids, et le théorème de zero-knowledge le donne au simulateur : il ne prétend pas le cacher (article p. 38, remarque 6.44).

:::exercice ★★
Le serveur de notre réseau sert une requête $(x, c)$ seulement si $c$ est la classe que donnent les poids engagés, et il ne montre jamais les poids. Comment un client apprend-il la classe de $x = (2, 1, 3, 1)$ ? Combien de requêtes lui faut-il au plus ?
:::reponse
Il envoie les requêtes $(x, 0)$, $(x, 1)$, $(x, 2)$ l'une après l'autre. Une seule requête $(x, v)$ est servie, celle de la classe que calculent les poids, ici $c = 1$ : la requête $(x, 0)$ est refusée, la requête $(x, 1)$ servie, et il s'arrête. Si les trois requêtes sont refusées, la classe est 3, puisque le réseau donne toujours une classe. Il lui faut donc au plus 3 requêtes, une de moins que de classes. Aucune ne lui montre un nombre calculé à partir des poids.
:::
:::

FlashProve fait la même remarque : « whoever tries each possible token for a prompt learns the model's next one from this bit alone, unless all are refused » (article p. 38, remarque 6.44). Chez FlashProve, le modèle peut n'avoir aucun résultat sur un prompt, et alors tous les tokens sont refusés. Des refus ne désignent donc pas le token restant, et une recherche complète essaie chaque token du vocabulaire, qui en compte $V = 202\,048$ (`docs/model.md` §2 ; remarque 6.44).

:::exercice ★
Le théorème de zero-knowledge est énoncé pour au plus 688 127 réponses. Quelle part de ce budget une recherche complète consomme-t-elle ? Combien de recherches complètes tiennent dans le budget ?
:::reponse
$202\,048 / 688\,127 \approx 0{,}294$, soit environ 29 %. Trois recherches demandent $606\,144$ réponses et tiennent dans le budget, une quatrième le dépasse.
:::
:::

L'article précise qu'aucun énoncé ne borne ce que beaucoup de ces bits révèlent ensemble (remarque 6.44). FlashProve déclare aussi ce qui reste visible en dehors des preuves, dont les temps, l'architecture et toutes les tailles, et des réglages ajustés aux poids (`docs/what-is-not-hidden.md`, tableau du début).

## Le modèle entier n'est pas le modèle flottant

Le théorème parle de la sortie gloutonne de $M^*$, calculée par un programme en entiers, et pas du modèle en virgule flottante dont ces entiers sont tirés. Aucune preuve ne contrôle la conversion des poids en entiers (`docs/model.md` §11). La page [[modele-entier]] a donné l'écart mesuré : le premier choix du modèle entier diffère de celui des poids en 16 bits, évalués en float32, à 6,81 % des positions mesurées (`docs/limits.md`, « The integer model is not the floating-point model »). Une réponse produite par un moteur flottant peut donc différer du premier choix du modèle entier à certains tokens, et exact match la refuse : c'est pour de telles réponses que FlashProve propose la politique à écart plafonné (`docs/protocol.md` §2 ; [[politiques]]).

## Ce que le client vérifie lui-même

Le théorème a des prémisses que `verify` ne teste pas, et l'énoncé qu'il couvre est construit à partir de fichiers que fournit le client. Une prémisse fausse ou un fichier mal choisi laisse passer une preuve valide d'un énoncé que le client ne voulait pas. FlashProve en dresse la liste (`lean/THEOREM.md`, « Look first at four things » ; `docs/protocol.md` §2-3).

Le théorème suppose exact match, mais `verify` ne contrôle pas que les lignes `C`, `theta` et `cap` du fichier de paramètres valent 256, 256 et 0 : c'est une prémisse, pas un test (`docs/protocol.md` §2, « Check the policy yourself »). Le client lit donc ces trois lignes lui-même.

Le théorème suppose aussi que les trois fichiers publics, de paramètres, de disposition et d'échelles, sont fixés avant le tirage de l'oracle. Le client s'assure donc qu'ils ont été fixés avant que le fournisseur puisse les ajuster à la fonction de hachage. Le fichier d'échelles peut désactiver n'importe quel bloc du modèle, jusqu'à tous, donc le client le lit aussi (`lean/THEOREM.md`, « Look first at four things », 2 et 3).

Pour la longueur de la sortie, on part de ce que le théorème dit à chaque position : le token est le choix glouton après le prompt et les tokens précédents de la sortie.

:::exercice ★★
Un serveur renvoie les 3 premiers tokens d'une réponse de 10, avec une preuve valide. Que montre la preuve ? Que doit faire le client ?
:::reponse
La condition à la position $i$ ne fait intervenir que le prompt et les tokens $y_0, \dots, y_{i-1}$. Si les 10 tokens sont des choix gloutons, les 3 premiers le sont aussi, donc la réponse tronquée satisfait le même énoncé, et sa preuve est valide. La preuve montre que ces 3 tokens sont les choix gloutons du modèle, pas que le modèle s'arrête après eux.

Le client contrôle lui-même la fin de la réponse : le dernier token doit être un token de fin du modèle, dont il prend les identifiants là où le modèle est publié.
:::
:::

FlashProve l'écrit ainsi : « Any prefix counts as correct, the empty one too » (`lean/THEOREM.md`, « Look first at four things », 3). Le vérifieur ne connaît ni les tokens de fin ni le tokenizer, donc une réponse coupée se vérifie comme une réponse plus courte (`docs/protocol.md` §3).

Une requête nomme les positions dont la preuve contrôle le token, et l'énoncé peut être vrai pour une plage et faux pour une plage plus large. Le client construit lui-même la requête et choisit la plage, à partir de ce qu'il a envoyé et reçu (`docs/protocol.md` §3).

Il reste l'identifiant d'engagement. Le client le prend, avant d'envoyer son prompt, auprès de la partie qui se porte garante du modèle, et jamais par le serveur qu'il contrôle ni dans les fichiers qui arrivent avec une preuve (`docs/protocol.md` §3). Même obtenu ainsi, il ne dit pas de quel modèle il s'agit : « A provider can commit to any model » (même section). C'est la mise en garde du chapitre 1 : une preuve porte sur les poids engagés, quels qu'ils soient.

## Retour au chapitre 1

On reprend les trois exigences du chapitre [[prouver-sans-refaire|1]] avec ce que FlashProve établit.

Le vérifieur doit lire beaucoup moins de données que le calcul n'en manipule. Une preuve fait 18,74 à 18,81 Mo, et `cp_verify` la contrôle en 21,14 s sur un seul fil d'exécution, alors que le calcul est un passage d'un modèle de 400,7 milliards de poids engagés, dont 16,15 milliards servent à chaque token (`guide/performance.md` ; article p. 46-47, §7.8). Ces mesures portent sur des preuves qui contrôlent chacune un token.

Il doit travailler sans les poids, à partir d'une empreinte qui les désigne. L'empreinte est l'identifiant d'engagement, et l'extracteur donne un sens précis à « désigne » : des poids fixés par l'engagement avant toute preuve.

Il doit rejeter un calcul faux, sauf avec une probabilité qu'on sait chiffrer. C'est démontré, avec la probabilité $\varepsilon(q)$, pour le vérifieur Lean, à exact match, pour une preuve. Pour `cp_verify`, cela repose sur des tests. Sous une autre politique, Lean démontre seulement que la sortie acceptée respecte la politique, ce qui peut ne rien interdire ([[politiques]]).

La mise en garde reste entière : la preuve établit un calcul sur des poids engagés, et ne dit ni quel modèle ils sont, ni si la réponse est vraie.

Le notebook `14-ce-que-dit-une-preuve.py` calcule $\varepsilon(q)$ pour plusieurs valeurs de $q$, contrôle des politiques, et refait l'attaque par le bit « servie ou refusée » sur notre réseau.

## Notre prouveur et FlashProve

| | notre prouveur | FlashProve |
|---|---|---|
| ce qui est démontré | rien ; des bornes calculées dans le notebook | correction de `verify` en Lean, à exact match, à $\varepsilon(q) \approx q/2^{124} + 2^{-101}$ ; complétude et zero-knowledge pour le protocole avec un prouveur Lean |
| politique | la classe exacte, premier maximum de $y$ : exact match sur un token | exact match ou écart plafonné, fixée par le fichier de paramètres |
| verdict | accepte ou rejette | `YES` ou `WITHIN LIMITS`, tous deux avec le code 0 |
| ce qui fuit | la classe, publique par l'énoncé | un bit par requête, servie ou refusée, et la liste déclarée de `docs/what-is-not-hidden.md` |

:::quiz
1. Que veut dire `WITHIN LIMITS` ?
2. Quelle politique le théorème de correction couvre-t-il ?
3. Pourquoi le client doit-il lire lui-même les lignes de politique ?
4. Que révèle chaque requête, même avec des masques ?
5. Une preuve de FlashProve montre-t-elle que le fournisseur a utilisé Llama 4 Maverick ?
6. Pourquoi ne faut-il pas citer « 128 bits » seul ?

:::reponse Réponses
1. Que les coûts des tokens contrôlés respectent les limites nommées par le client. Cela ne dit pas que la réponse est celle du modèle ([[politiques]]).
2. Exact match, $(C, \theta, \mathrm{cap}) = (256, 256, 0)$, pour le vérifieur Lean `verify`.
3. Parce que `verify` ne les teste pas : exact match est une prémisse du théorème, pas un contrôle du vérifieur.
4. Un bit : la requête est servie ou refusée. Ce bit dépend des poids, et en essayant chaque token on apprend le token suivant du modèle.
5. Non. Elle porte sur les poids engagés, quels qu'ils soient, et un fournisseur peut s'engager sur n'importe quel modèle.
6. Les 128 bits sont un objectif par tour, preuve de travail comptée, pas un niveau de sécurité. Le chiffre démontré est celui de Lean, environ 124 bits par requête au hachage, pour `verify` à exact match ([[securite]]).
:::
:::
