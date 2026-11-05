---
id: argmax
---
Un réseau qui classe finit par un **argmax** : parmi les sorties $y_0, \dots, y_{n-1}$, il garde la position de la plus grande, et la première quand plusieurs sont égales. Le prouveur annonce cette position $c$. On cherche à la vérifier avec des [[intervalles|contrôles d'intervalle]] seulement, puisque le corps n'a pas d'ordre.

La page écrit d'abord « $c$ est la première position du maximum » avec des inégalités, puis elle les réunit en une seule formule et montre qu'elle dit exactement cela. Elle traite ensuite deux variantes qu'utilise FlashProve : la position est secrète, ou le maximum sert sans que sa position soit annoncée.

## Écrire « premier maximum » avec des inégalités

La définition contient deux conditions. D'abord, $y_c$ est un maximum :

$$y_c \ge y_v \quad \text{pour tout } v$$

Ensuite, aucune position avant $c$ n'atteint ce maximum, sans quoi elle serait la première :

$$y_c > y_v \quad \text{pour tout } v < c$$

Une inégalité stricte ne se contrôle pas comme « une valeur est positive ou nulle ». Les $y_v$ sont des entiers, et aucun entier n'est strictement entre $y_v$ et $y_v + 1$, donc $y_c > y_v$ équivaut à $y_c - y_v - 1 \ge 0$.

Les deux conditions ne diffèrent que par ce $-1$, présent quand $v < c$. On note $[v < c]$ le nombre qui vaut 1 si $v < c$ et 0 sinon, et on appelle **marges** les entiers

$$\Delta_v = y_c - y_v - [v < c]$$

Les deux conditions deviennent une seule : $\Delta_v \ge 0$ pour tout $v$. La marge de $c$ lui-même vaut $\Delta_c = 0$.

Pour le [[reseau|petit réseau]] du cours, $y = (1, 3, 3, -2)$ et $c = 1$. Les marges valent $\Delta = (1, 0, 0, 5)$. La position 2 a la même valeur que la position 1, et sa marge est nulle parce qu'elle vient après. Si le prouveur annonçait $c = 2$, la position 1 viendrait avant avec la même valeur, et sa marge vaudrait $3 - 3 - 1 = -1$.

:::exercice ★
Calculez les marges pour $y = (0, 4, 3, -2)$ et $c = 1$.
:::reponse
$$
\begin{aligned}
\Delta_0 &= 4 - 0 - 1 = 3 \\
\Delta_1 &= 0 \\
\Delta_2 &= 4 - 3 = 1 \\
\Delta_3 &= 4 - (-2) = 6
\end{aligned}
$$

donc $\Delta = (3, 0, 1, 6)$, toutes positives ou nulles.
:::
:::

:::exercice ★
Avec $y = (2, 2, 2, 2)$, quelle classe passe ? Que valent ses marges ? Que valent celles de $c = 3$ ?
:::reponse
La classe 0 passe : aucune position ne vient avant elle, donc ses marges valent toutes $2 - 2 = 0$.

Pour $c = 3$, les positions 0, 1 et 2 viennent avant, et leurs marges valent $2 - 2 - 1 = -1$. La marge de 3 vaut 0.
:::
:::

## La formule dit exactement « premier maximum »

On a construit les marges à partir de la définition. Il reste à vérifier l'autre sens : si toutes les marges sont positives ou nulles, $c$ est bien la première position du maximum.

:::exercice ★★
Montrez que, pour un vecteur d'entiers $y$, toutes les marges $\Delta_v$ sont positives ou nulles exactement quand $c$ est la première position du maximum de $y$.
:::reponse
Si $c$ est la première position du maximum, alors $y_c \ge y_v$ pour tout $v$, donc $\Delta_v = y_c - y_v \ge 0$ pour $v \ge c$. Pour $v < c$, $y_v$ n'atteint pas le maximum, donc $y_v < y_c$, et comme ce sont des entiers, $y_v \le y_c - 1$, soit $\Delta_v \ge 0$.

Réciproquement, supposons toutes les marges positives ou nulles. Pour $v \ge c$, $\Delta_v \ge 0$ donne $y_c \ge y_v$. Pour $v < c$, il donne $y_c \ge y_v + 1 > y_v$. Donc $y_c$ est un maximum, et aucune position avant $c$ ne l'atteint : $c$ est la première position du maximum.

Le passage de $>$ à $\ge 1$ n'est vrai que parce que $y$ est un vecteur d'entiers.
:::
:::

Dans un corps, chaque marge devient une clé à chercher dans une table $\{0, \dots, B - 1\}$, et l'argument de taille de [[intervalles]] fixe $B$. Si on sait $|y_v| \le Y$, une marge est un entier de $[-2Y - 1, 2Y]$. Les marges honnêtes demandent $B > 2Y$. Une marge négative est rangée dans $[p - 2Y - 1, p - 1]$, et aucune de ces valeurs ne doit être une ligne de la table, ce qui demande $B \le p - 2Y - 1$. Le chapitre [[arrondir]] fait ce calcul pour le réseau du cours.

## Quand la position est secrète : le routeur

Le routeur d'un modèle à experts choisit, pour chaque token, l'expert de plus grand score $\ell_e$, et FlashProve ne révèle pas lequel : les cellules engagées restent cachées au vérifieur (`docs/format/11-2-feed-forward-segment.md`, « What is public and what is hidden »). La position choisie ne peut donc pas apparaître dans une formule publique comme $y_c - y_v$. Le prouveur s'engage à la place sur un vecteur $sel$ qui vaut 1 à la position choisie et 0 ailleurs : chaque $sel_e$ est dans $\{0, 1\}$ et $\sum_e sel_e = 1$ (`docs/format/11-2-feed-forward-segment.md`, ligne 17).

Avec ce vecteur, le score choisi s'écrit sans nommer sa position :

$$m = \sum_e sel_e\, \ell_e$$

Il reste le terme $[e < c]$, où $c$ est la position secrète. Il s'écrit lui aussi avec $sel$.

:::exercice ★
Soit $sel$ le vecteur qui vaut 1 en $c$ et 0 ailleurs. Montrez que $\sum_{e' > e} sel_{e'} = [e < c]$.
:::reponse
La somme $\sum_{e' > e} sel_{e'}$ compte les 1 de $sel$ placés après $e$. Il n'y en a qu'un, en $c$. Il est après $e$ quand $e < c$, et la somme vaut 1. Sinon elle vaut 0.
:::
:::

Le contrôle du routeur devient donc, pour chaque expert $e$ :

$$m - \ell_e - \sum_{e' > e} sel_{e'} \ge 0$$

FlashProve l'écrit ainsi et en conclut que l'expert choisi est le premier de plus grand score (`11-2-feed-forward-segment.md`, ligne 17).

:::exercice ★★
Avec $\ell = (5, 9, 9, 2)$, calculez les quatre valeurs contrôlées pour $sel = (0, 1, 0, 0)$, puis pour $sel = (0, 0, 1, 0)$. Calculez-les ensuite pour $sel = (1, 1, 0, 0)$. Pourquoi faut-il aussi $\sum_e sel_e = 1$ ?
:::reponse
Pour $sel = (0, 1, 0, 0)$, $m = 9$, et les sommes après chaque $e$ valent $(1, 0, 0, 0)$ :

$$(9 - 5 - 1,\ 9 - 9 - 0,\ 9 - 9 - 0,\ 9 - 2 - 0) = (3, 0, 0, 7)$$

Toutes sont positives ou nulles.

Pour $sel = (0, 0, 1, 0)$, $m = 9$ aussi, mais la somme après $e = 1$ vaut 1, donc $9 - 9 - 1 = -1$ : refusé. L'expert 1 a le même score et vient avant.

Pour $sel = (1, 1, 0, 0)$, $m = 5 + 9 = 14$, et les sommes valent $(1, 0, 0, 0)$ :

$$(14 - 5 - 1,\ 14 - 9,\ 14 - 9,\ 14 - 2) = (8, 5, 5, 12)$$

Tout passe, alors que $m = 14$ n'est le score d'aucun expert et que l'expert 0 est sélectionné. Sans $\sum_e sel_e = 1$, $m$ n'est plus qu'une borne supérieure des scores. De même, chaque $sel_e$ doit être 0 ou 1 : FlashProve le contrôle par la clé $128 \cdot sel_e$ dans sa table de $2^8$ lignes (`11-2-feed-forward-segment.md`, « The keys », clé `SEL`).
:::
:::

## Quand le maximum sert sans être annoncé

L'attention calcule un softmax en entiers ([[attention]]). Pour chaque score $\mathrm{sc}_j$, elle lit un poids dans une table publique, à une ligne fixée par l'écart $M - \mathrm{sc}_j$, où $M$ est le plus grand score, puis elle divise par la somme $Z$ des poids. Seule la valeur $M$ sert, pas sa position. Le prouveur fournit $M$, et les écarts $M - \mathrm{sc}_j \ge 0$ montrent que $M$ dépasse ou égale chaque score.

On prend une table jouet $\mathrm{EX} = (8, 4, 2, 1)$ aux lignes 0 à 3, et 0 au-delà, et les scores $(5, 9, 7)$, dont le maximum est 9.

:::exercice ★★★
Calculez les poids $\mathrm{EX}[M - \mathrm{sc}_j]$ et leur somme $Z$ pour $M = 9$, $M = 10$ et $M = 11$. Dans les trois cas, les écarts $M - \mathrm{sc}_j$ sont positifs ou nuls. Que manque-t-il au contrôle ?
:::reponse
$$
\begin{aligned}
M = 9 &: \quad (\mathrm{EX}[4], \mathrm{EX}[0], \mathrm{EX}[2]) = (0, 8, 2), \quad Z = 10 \\
M = 10 &: \quad (\mathrm{EX}[5], \mathrm{EX}[1], \mathrm{EX}[3]) = (0, 4, 1), \quad Z = 5 \\
M = 11 &: \quad (\mathrm{EX}[6], \mathrm{EX}[2], \mathrm{EX}[4]) = (0, 2, 0), \quad Z = 2
\end{aligned}
$$

Divisés par $Z$, les poids valent $(0;\ 0{,}8;\ 0{,}2)$ pour $M = 9$ et pour $M = 10$ : passer de 9 à 10 divise ici chaque poids par 2 exactement. Pour $M = 11$, ils valent $(0, 1, 0)$ : l'écart du troisième score vaut 4, au-delà des lignes de la table, donc son poids vaut 0, et la sortie de l'attention change. Avec $M = 13$, tous les poids valent 0 et $Z = 0$ : la division n'a plus de sens.

Il manque que $M$ soit **atteint**, c'est-à-dire égal à l'un des scores. Avec des réels, retrancher un $M$ plus grand ne changerait rien au softmax, puisque le facteur commun se simplifie dans la division. Avec la table, finie et arrondie, la valeur de $M$ change les poids.
:::
:::

FlashProve ajoute donc la seconde condition. Le prouveur s'engage sur les bits d'une position $ib$ et prouve que $M$ est le score à cette position (`docs/format/11-3-attention-segment.md`, « What the segment computes », item 3, et groupes 7 et 8). Un majorant atteint est le maximum. La position $ib$ peut être n'importe quelle position du maximum, puisque seule sa valeur sert.

:::piege
**Le terme $[v < c]$.** Sans lui, deux positions à égalité passent toutes les deux, et le prouveur choisit la classe.

**« Atteint » et « un seul 1 ».** Des écarts positifs ou nuls montrent seulement que la valeur choisie est un majorant. Il faut aussi qu'elle soit l'une des valeurs : par la position annoncée, par un vecteur $sel$ de somme 1, ou par une position engagée.
:::

## Notre prouveur et FlashProve

Dans notre réseau, la classe $c$ est publique, puisque c'est la réponse du réseau, donc les marges suffisent. La tête de FlashProve écrit ses marges en chiffres contrôlés, ce qui montre qu'elles sont positives ou nulles. Pour le token suivant, ce sont les marges de l'argmax, avec le terme $[v < c]$. Pour un token vérifié sous une politique d'acceptation, la marge contient en plus un terme de coût ([[politiques]]). La tête ne s'engage pas sur les logits : ses tableaux engagés n'en contiennent pas (`docs/format/11-4-output-head.md`, « The arrays that the segment commits to », items 6 et 7, « The next token »). Son routeur utilise le vecteur $sel$, et son attention le maximum atteint. Pour prouver un maximum par des différences positives ou nulles, FlashProve cite zkCNN (ePrint 2021/673, §4.3), avec cette réserve dans le commentaire de son routeur : « The condition on the differences was not checked against zkCNN's paper » (`prover/prover/forward.cuh:798-799` ; `PUBLISHED-WORKS.md`).
