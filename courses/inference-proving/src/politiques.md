---
id: politiques
---
À chaque position d'un texte, la tête d'un modèle de langage calcule un **logit** $\lambda[v]$ pour chaque token $v$ du vocabulaire, et le décodage glouton garde le token de plus grand logit, le premier en cas d'égalité ([[argmax]]). FlashProve prouve un modèle à nombres entiers ([[modele-entier]]), alors qu'un fournisseur produit en général son texte avec un moteur d'inférence en virgule flottante, qui ne choisit pas toujours le premier token du modèle entier. Un moteur standard a produit 96 réponses honnêtes en 16 bits et 96 autres en FP8, et aucune ne donne le premier choix du modèle entier à chaque token (`docs/protocol.md` §2 ; article p. 6). Une règle qui n'accepte que le premier choix refuse donc ces réponses.

On cherche une règle qui accepte une réponse quand chaque token est proche du premier choix, et on veut savoir ce qu'elle garantit encore. La page mesure d'abord l'écart d'un token au premier choix, à partir des marges de [[argmax]]. Elle construit ensuite la règle de FlashProve, une **politique d'acceptation** à trois nombres, et montre qu'un réglage, exact match, n'accepte que la sortie gloutonne. Elle cherche enfin ce que les autres réglages laissent passer, puis comment la tête du modèle prouve qu'une réponse respecte la politique sans montrer ses logits.

## Mesurer l'écart au premier choix

La page [[argmax]] a montré que le token $v$ est le premier maximum des logits exactement quand toutes ses marges sont positives ou nulles :

$$\lambda[v] - \lambda[v'] - [v' < v] \ge 0 \quad \text{pour tout } v'$$

Pour un token qui n'est pas le premier choix, au moins une marge est négative. L'opposé de la plus négative est la quantité qu'il faut ajouter à $\lambda[v]$ pour que $v$ devienne le premier choix. On définit donc l'**écart de logit** de $v$ comme l'opposé de la plus petite marge :

$$\mathrm{gap}(v) = \max_{v'} \big(\lambda[v'] - \lambda[v] + [v' < v]\big)$$

C'est la définition de FlashProve (article p. 12, définition 3.4 ; `docs/protocol.md` §2).

:::exercice ★
Montrez que $\mathrm{gap}(v) \ge 0$, et que $\mathrm{gap}(v) = 0$ exactement quand $v$ est le premier maximum des logits.
:::reponse
Le terme $v' = v$ du maximum vaut $\lambda[v] - \lambda[v] + 0 = 0$, donc le maximum vaut au moins 0.

Il vaut 0 exactement quand tous ses termes sont négatifs ou nuls, c'est-à-dire quand toutes les marges $\lambda[v] - \lambda[v'] - [v' < v]$ sont positives ou nulles. D'après [[argmax]], c'est le cas exactement quand $v$ est le premier maximum.
:::
:::

:::exercice ★
Les logits d'une position valent $\lambda = (5, 9, 9, 2)$ pour les tokens 0 à 3. Calculez l'écart de chaque token.
:::reponse
Pour chaque $v$, on cherche le plus grand des quatre termes $\lambda[v'] - \lambda[v] + [v' < v]$ :

$$
\begin{aligned}
\mathrm{gap}(0) &= \max(0,\ 4,\ 4,\ -3) = 4 \\
\mathrm{gap}(1) &= \max(-3,\ 0,\ 0,\ -7) = 0 \\
\mathrm{gap}(2) &= \max(-3,\ 1,\ 0,\ -7) = 1 \\
\mathrm{gap}(3) &= \max(4,\ 8,\ 8,\ 0) = 8
\end{aligned}
$$

Le token 1 est le premier maximum. Le token 2 a le même logit, mais il vient après le token 1 : le terme $[1 < 2]$ lui donne un écart de 1. Pour un token qui n'est pas le premier choix, l'écart vaut toujours la distance de son logit au plus grand, plus 1 si le premier maximum vient avant lui : $9 - 2 + 1 = 8$ pour le token 3.
:::
:::

## Du coût à la politique

Une réponse a plusieurs tokens. On note $y_0, \dots, y_{n-1}$ les tokens **comptés**, ceux de la sortie qui tiennent, avec le prompt, dans la fenêtre de 1 024 tokens du modèle, et $\mathrm{gap}_i$ l'écart de $y_i$ à sa position. FlashProve ne travaille pas sur les écarts eux-mêmes mais sur des **coûts**, décalés de $2^8$ :

$$\mathrm{cost}_i = \mathrm{gap}_i + 2^8$$

Le premier choix coûte donc 256, pas 0 (article p. 12, définition 3.4). Le format écrit ce décalage $2^{\texttt{sh}}$, d'après la ligne `sh` du fichier de paramètres, qui vaut 8 dans les deux configurations de taille réelle (`docs/glossary.md`, « Cost » ; `prover/examples/target_full_f2/policy.txt`). La dernière section montre où ce $2^8$ intervient dans la preuve.

On cherche une condition sur les $n$ coûts qui tolère des tokens proches du premier choix. La plus simple borne leur moyenne par un **seuil** $\theta$ :

$$\sum_{i < n} \mathrm{cost}_i \le \theta \cdot n$$

Sous cette condition, un seul token dont l'écart dépasse $(\theta - 2^8)\, n$ fait échouer toute la réponse, même si tous les autres sont des premiers choix. Pour limiter le poids d'un token, on compte chaque coût au plus jusqu'à un **plafond** $C$, et la condition porte sur $\sum_i \min(\mathrm{cost}_i, C)$. Un token de coût supérieur à $C$ compte alors $C$ quel que soit son écart, donc il peut être n'importe quel token du vocabulaire. On borne donc aussi leur nombre par un entier $\mathrm{cap}$.

Une **politique** est le triplet $(C, \theta, \mathrm{cap})$, et une réponse la respecte quand ses $n$ tokens comptés vérifient les deux conditions :

$$
\begin{aligned}
&\sum_{i < n} \min(\mathrm{cost}_i, C) \le \theta \cdot n \\
&\#\{\, i < n : \mathrm{cost}_i > C \,\} \le \mathrm{cap}
\end{aligned}
$$

C'est la définition 3.4 de l'article (p. 12), qui demande aussi que le modèle soit défini à chaque position, et que le seul token qui peut suivre une fenêtre pleine soit le premier choix. Les trois nombres sont les lignes `C`, `theta` et `cap` du fichier de paramètres de FlashProve.

:::exercice ★★
Trois tokens comptés ont pour coûts 256, 256 et 556. Respectent-ils la politique $(256, 256, 0)$ ? La politique $(600, 360, 1)$ ? La politique $(300, 300, 1)$ ? Que dit la dernière réponse du troisième token ?
:::reponse
Sous $(256, 256, 0)$, le coût 556 dépasse le plafond 256, et $\mathrm{cap} = 0$ n'autorise aucun dépassement : refusé.

Sous $(600, 360, 1)$, aucun coût ne dépasse 600, et la somme vaut

$$256 + 256 + 556 = 1\,068 \le 360 \times 3 = 1\,080$$

donc les trois tokens passent.

Sous $(300, 300, 1)$, le troisième coût est compté 300, et la somme vaut

$$256 + 256 + 300 = 812 \le 900$$

Un seul coût dépasse le plafond, ce que $\mathrm{cap} = 1$ autorise : accepté. Le troisième token est compté 300 quel que soit son coût réel, donc la politique l'accepterait aussi s'il était n'importe quel token du vocabulaire.
:::
:::

## Exact match

Le réglage le plus strict est $(C, \theta, \mathrm{cap}) = (2^8, 2^8, 0)$. FlashProve l'appelle **exact match**, et toute autre politique est une politique à **écart plafonné** (clipped gap) (article p. 12).

:::exercice ★★★
Montrez qu'une réponse respecte exact match exactement quand chacun de ses tokens comptés est le premier maximum des logits à sa position.
:::reponse
Supposons que la réponse respecte $(2^8, 2^8, 0)$. Comme $\mathrm{cap} = 0$, aucun coût ne dépasse $C = 2^8$. Or $\mathrm{cost}_i = \mathrm{gap}_i + 2^8$, donc $\mathrm{gap}_i \le 0$, et comme un écart est positif ou nul (exercice 1), $\mathrm{gap}_i = 0$. D'après l'exercice 1, $y_i$ est le premier maximum.

Réciproquement, si chaque token compté est le premier maximum, chaque écart est nul et chaque coût vaut $2^8$. Aucun ne dépasse $C$, et la somme vaut $2^8 n \le 2^8 n$.

La condition de somme ne joue aucun rôle sous exact match : chaque terme $\min(\mathrm{cost}_i, 2^8)$ vaut au plus $2^8$, donc elle est toujours vraie. Tout repose sur $\mathrm{cap} = 0$.
:::
:::

Une réponse acceptée sous exact match est donc la sortie du décodage glouton, token par token. FlashProve énonce ce résultat pour une sortie non vide et l'a vérifié en Lean (article p. 12, proposition 3.5).

## Ce que l'écart plafonné laisse passer

FlashProve admet les politiques telles que $256 \le \theta \le C < 2^{32}$ et $\mathrm{cap} \le 1\,024$ (article p. 13, définition 3.8). Sa configuration d'exemple à écart plafonné, que l'article note $Z_1$, a pour politique

$$(C, \theta, \mathrm{cap}) = (25\,856,\ 512,\ 1)$$

(article p. 13, définition 3.7 ; `prover/examples/target_full_f2_gap/policy.txt`). On cherche ce qu'une réponse acceptée sous cette politique peut contenir.

:::exercice ★★
Sous la politique $(25\,856, 512, 1)$, chaque token compté d'une réponse peut-il avoir un écart de 256 ? Combien de tokens comptés faut-il au moins pour qu'une réponse contienne un token quelconque, tous les autres étant des premiers choix ? Généralisez : sous une politique $(C, \theta, \mathrm{cap})$ avec $C > 256$, combien de tokens au plus, parmi $n$ tokens comptés, peuvent dépasser le plafond ?
:::reponse
Un écart de 256 donne un coût de 512, qui ne dépasse pas $C = 25\,856$. Si tous les tokens ont ce coût, la somme vaut $512 n \le 512 n$ : la réponse passe.

Un token quelconque peut avoir un coût supérieur à $C$. Il est alors compté $C$, et il est le seul dépassement, ce que $\mathrm{cap} = 1$ autorise. Les $n - 1$ autres tokens coûtent 256, donc la condition de somme s'écrit

$$
\begin{aligned}
256\,(n - 1) + 25\,856 &\le 512\, n \\
25\,600 &\le 256\, n \\
100 &\le n
\end{aligned}
$$

Une réponse de 100 tokens comptés ou plus peut donc contenir un token quelconque.

Le même calcul vaut pour toute politique. Soit $j$ le nombre de dépassements. Chacun compte $C$, et chacun des $n - j$ autres tokens compte au moins 256, donc la condition de somme demande

$$
\begin{aligned}
256\,(n - j) + C j &\le \theta n \\
j\,(C - 256) &\le n\,(\theta - 256) \\
j &\le \frac{n\,(\theta - 256)}{C - 256}
\end{aligned}
$$

La seconde condition demande $j \le \mathrm{cap}$. Le nombre de dépassements vaut donc au plus

$$\min\Big(\mathrm{cap},\ \Big\lfloor \frac{n\,(\theta - 256)}{C - 256} \Big\rfloor\Big)$$

et ce nombre est atteint quand les autres tokens sont des premiers choix. Avec $(25\,856, 512, 1)$ et $n = 100$, on retrouve $\min(1, 1) = 1$.
:::
:::

Les programmes de FlashProve affichent ce nombre dans leur ligne `covered:`, et le format précise que chacun de ces tokens peut être n'importe quel token (`docs/format/11-4-output-head.md`, « The kind of an acceptance policy »).

Jusqu'ici, les coûts étaient donnés. Ils dépendent des logits, donc des poids, et c'est le fournisseur qui choisit les poids sur lesquels il s'engage.

:::exercice ★★
Un fournisseur s'engage sur des poids tous nuls, avec un vocabulaire de 4 tokens. Que valent les logits, puis le coût de chaque token ? Quelles réponses respectent exact match ? Lesquelles respectent une politique admissible avec $\theta \ge 257$ et $C \ge 257$ ?
:::reponse
Avec une matrice de sortie nulle, chaque logit vaut 0. L'écart de $v$ vaut alors $\max_{v'} [v' < v]$, soit 0 pour le token 0 et 1 pour les autres. Les coûts valent $(256, 257, 257, 257)$, à chaque position.

Exact match n'accepte que la réponse dont chaque token est le token 0.

Sous une politique avec $\theta, C \ge 257$, aucun coût ne dépasse $C$, et la somme vaut au plus $257 n \le \theta n$. Toutes les réponses passent, quels que soient leurs tokens.
:::
:::

FlashProve énonce ce résultat pour toute réponse non vide qui tient dans la fenêtre et toute politique avec $\theta, C \ge 257$, et l'a vérifié en Lean (article p. 13, proposition 3.9). Sous une politique à écart plafonné, ce que Lean démontre se limite à ceci : une sortie acceptée respecte la politique pour les poids que désigne l'engagement. Cela n'interdit rien à un fournisseur qui s'engage sur des poids sous lesquels toute sortie respecte la politique (`docs/limits.md`, « A pass under a clipped-gap policy says less than a `YES` under exact match »).

Des essais de FlashProve sur un vrai modèle montrent la même faiblesse. Les limites ont été ajustées sur les réponses honnêtes d'un moteur standard qui fait tourner les poids publics de Llama 4 Maverick. Avec un token remplacé par le deuxième choix du modèle, 28 réponses sur 32 respectaient encore ces limites, et 49 réponses sur 96 tirées à la température 1 aussi. Ces réponses ont été notées, pas prouvées (même section).

Le vérifieur de FlashProve, `cp_verify`, n'accepte pas de la même façon sous les deux sortes de politiques. Sous exact match, il accepte par `YES`. Sous une politique à écart plafonné, il accepte par `WITHIN LIMITS`, qui dit seulement que les coûts des tokens comptés respectent les limites nommées par le client, et pas que la réponse est celle du modèle (`docs/limits.md`, même section ; `guide/terms.md`, « YES »).

## Comment la tête prouve un coût

Il reste à prouver qu'une réponse respecte la politique. Les logits restent cachés au vérifieur, et la tête de FlashProve ne prouve pas la valeur exacte de chaque écart (`docs/format/11-4-output-head.md`, « What the head computes, in integers », items 5 et 9). Les deux conditions d'une politique bornent les coûts par le haut. On cherche donc s'il suffit que le prouveur annonce, à chaque position, un **coût facturé** $k_i$ au moins égal au vrai coût, et prouve la politique sur les $k_i$.

:::exercice ★★
Soit des entiers $k_i \ge \mathrm{cost}_i$. Montrez que si les $k_i$ respectent la politique $(C, \theta, \mathrm{cap})$, les vrais coûts la respectent aussi.
:::reponse
La fonction $t \mapsto \min(t, C)$ ne décroît pas, donc $\min(\mathrm{cost}_i, C) \le \min(k_i, C)$ pour chaque $i$, et

$$\sum_i \min(\mathrm{cost}_i, C) \le \sum_i \min(k_i, C) \le \theta n$$

Un vrai coût supérieur à $C$ donne $k_i \ge \mathrm{cost}_i > C$, donc chaque dépassement des vrais coûts est aussi un dépassement des $k_i$, et il y en a au plus $\mathrm{cap}$.

Facturer plus que le vrai coût ne fait donc jamais passer une réponse qui devait échouer.
:::
:::

L'inégalité $k_i \ge \mathrm{cost}_i$ se prouve sans montrer les logits, avec des marges comme celles de [[argmax]].

:::exercice ★
Écrivez $k \ge \mathrm{gap}(y) + 2^8$, pour un token $y$ à une position, comme une famille d'inégalités, une par token $v$ du vocabulaire.
:::reponse
L'écart est un maximum, donc il est au plus $k - 2^8$ exactement quand chacun de ses termes l'est :

$$\lambda[v] - \lambda[y] + [v < y] \le k - 2^8 \quad \text{pour tout } v$$

soit, en passant tout du même côté :

$$\lambda[y] + k - \lambda[v] - [v < y] \ge 2^8 \quad \text{pour tout } v$$

Ce sont les marges de [[argmax]], décalées de $k$, et chacune est un contrôle d'intervalle.
:::
:::

C'est la forme des marges de la tête de FlashProve. À chaque position comptée $t$ et pour chaque token $v$, la marge vaut $\lambda_t[y] + k_t - \lambda_t[v] - [v < y]$, où le coût facturé s'écrit $k_t = gc_t + 2^{37} gb_t$ avec $gc_t \le C$, et $gb_t$ non nul aux positions qui dépassent le plafond. La tête écrit chaque marge en trois chiffres positifs ou nuls, le chiffre du milieu ayant le poids $2^{\texttt{sh}} = 2^8$, et ses relations interdisent que ce chiffre vaille 0. La marge vaut donc au moins $2^8$ pour chaque $v$, et d'après l'exercice précédent cela donne $k_t \ge \mathrm{gap}_t + 2^8$. Deux sommes sur les positions comptées donnent ensuite les deux conditions de la politique. Cet enchaînement est l'argument des commentaires du code source, que le format rapporte (`docs/format/11-4-output-head.md`, « What the head computes, in integers », items 6, 7 et 9 ; « What the claims are for », 4, 5 et 7).

Ces relations n'imposent que des inégalités : tout coût facturé entre le vrai coût et $C$ les satisfait (`docs/format/11-4-output-head.md`, « What the head computes, in integers », item 9). On a montré plus haut que facturer plus que le vrai coût ne fait passer aucune réponse qui devait échouer, donc cette liberté ne change pas ce que la politique garantit.

:::incertain
Sous exact match, la somme des $gb_t$ sur les positions comptées ne dépasse pas $\mathrm{cap} = 0$, donc chaque $gb_t$ est nul. Alors $k_t = gc_t \le C = 2^8$, et $k_t \ge \mathrm{gap}_t + 2^8$ donne $\mathrm{gap}_t = 0$ à chaque position comptée. Cette chaîne est la lecture du dossier D2 (§7). Le format la rapporte comme l'argument des commentaires du code source, et précise que sa page n'énonce aucune propriété du protocole (`docs/format/11-4-output-head.md`, « What the claims are for »). Ce qui est démontré en Lean porte sur le vérifieur entier ([[ce-que-dit-une-preuve]]).
:::

:::piege
**Oublier le terme $[v' < v]$.** Sans lui, deux tokens de même logit ont tous deux un écart nul, et exact match accepte l'un ou l'autre : le prouveur choisit le token.

**Lire `WITHIN LIMITS` comme « la réponse est celle du modèle ».** Ce verdict dit que les coûts respectent les limites. Sous une politique lâche, ou sous des poids qui rendent tous les logits proches, il ne dit rien des tokens.
:::

Le notebook `14-ce-que-dit-une-preuve.py` calcule les écarts et les coûts, contrôle une politique, et refait le cas des poids nuls.
