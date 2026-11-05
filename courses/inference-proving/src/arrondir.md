---
id: arrondir
---
Le [[reseau|petit réseau]] du cours calcule $h = W_1 x$, puis $q = \rq(h, 2)$, puis $a = \varphi(q)$, puis $y = W_2 a$, et il annonce la classe $c$, la première position du maximum de $y$. Le chapitre [[matrices|Les produits de matrices]] a prouvé les deux produits, qui sont des sommes de produits. Les trois autres étapes n'en sont pas : l'arrondi, l'activation et le choix de la classe.

Ce chapitre montre d'abord qu'une égalité dans un corps fini ne peut exprimer ni « plus petit que » ni « le plus grand ». Il ramène ensuite chacune des trois étapes à une seule forme d'affirmation, « cette valeur est dans cette table », et il montre enfin pourquoi ces affirmations suffisent à fixer les résultats entiers du réseau. Le chapitre suivant, [[tables|Les tables]], prouve ces affirmations.

On suit l'exemple du cours, l'entrée $x = (2, 1, 3, 1)$, qui donne :

$$
\begin{aligned}
h &= W_1 x = (5, -3, 2, 6) \\
q &= \rq(h, 2) = (1, -1, 1, 2) \\
a &= \varphi(q) = (1, 0, 1, 2) \\
y &= W_2 a = (1, 3, 3, -2) \\
c &= 1
\end{aligned}
$$

## Le corps n'a pas d'ordre

Le vérifieur ne contrôle que des égalités entre éléments de $\mathbb{F}_{97}$ : un [[sumcheck]] ramène une somme à une égalité en un point, et le vérifieur compare les deux côtés. Or l'arrondi demande de contrôler une inégalité. On cherche donc d'abord si « $<$ » a un sens dans $\mathbb{F}_{97}$.

Le choix le plus simple compare les représentants dans $0, \dots, 96$ : on pose $a < b$ quand le représentant de $a$ est plus petit que celui de $b$. Sur les entiers, une inégalité reste vraie quand on ajoute la même valeur des deux côtés, et c'est ce qui permet de calculer avec elle.

:::exercice ★
Avec cet ordre, on a $3 < 96$. Ajoutez 1 des deux côtés, dans $\mathbb{F}_{97}$. L'inégalité tient-elle encore ?
:::reponse
On obtient $3 + 1 = 4$ et $96 + 1 = 97 \equiv 0$, donc il faudrait $4 < 0$, ce qui est faux pour cet ordre. Ajouter 1 ne conserve donc pas cet ordre : 96 est aussi $-1$, et lui ajouter 1 donne 0.
:::
:::

Le même défaut touche tout ordre sur $\mathbb{F}_{97}$. Supposons un ordre que l'addition conserve, avec $0 < 1$. En ajoutant $a$, on obtient $a < a + 1$, puis $a + 1 < a + 2$, et ainsi de suite jusqu'à $a + 96 < a + 97$. Or $a + 97 = a$ dans $\mathbb{F}_{97}$, donc la chaîne donne $a < a$, ce qui est impossible. Avec $1 < 0$, la même chaîne descend et aboutit à la même contradiction.

Une inégalité porte donc sur des entiers et non sur des éléments du corps, et il faut une autre forme d'affirmation.

## L'arrondi : une égalité et une borne

Le vérifieur ne peut pas calculer $\rq(h, 2) = \lfloor (h + 2)/4 \rfloor$ dans le corps. Diviser par 4 dans $\mathbb{F}_{97}$, c'est multiplier par $1/4 = 73$, et pour $h = 5$ cela donne $7 \times 73 = 511 \equiv 26$, alors que $\lfloor 7/4 \rfloor = 1$. La partie entière n'est pas une opération du corps.

Le prouveur fournit donc $q$, et le vérifieur contrôle une propriété que seul le bon $q$ possède. Par définition de la partie entière, $q = \lfloor (h + 2)/4 \rfloor$ est l'entier tel que $q \le (h + 2)/4 < q + 1$. On multiplie par 4, puis on retire $4q$ :

$$0 \le h + 2 - 4q < 4$$

On appelle **reste** l'entier $s = h + 2 - 4q$ (la page [[intervalles]] fait ce calcul pour tout arrondi par décalage). Le reste se calcule à partir de $h$ et de $q$ par une égalité, que le corps sait contrôler. Il reste la borne $0 \le s < 4$.

:::exercice ★
Calculez le reste $s = h + 2 - 4q$ pour les quatre valeurs de l'exemple. Vérifiez que chacun est dans $\{0, 1, 2, 3\}$.
:::reponse
$$
\begin{aligned}
s_0 &= 5 + 2 - 4 \times 1 = 3 \\
s_1 &= -3 + 2 - 4 \times (-1) = 3 \\
s_2 &= 2 + 2 - 4 \times 1 = 0 \\
s_3 &= 6 + 2 - 4 \times 2 = 0
\end{aligned}
$$

donc $s = (3, 3, 0, 0)$, et chaque reste est dans $\{0, 1, 2, 3\}$.
:::
:::

Une première façon d'écrire la borne est un polynôme qui s'annule exactement sur les valeurs permises.

:::exercice ★
Écrivez un polynôme $Z(s)$ qui s'annule en $s \in \mathbb{F}_{97}$ exactement quand $s \in \{0, 1, 2, 3\}$. Quel degré aurait le polynôme construit de la même façon pour l'ensemble $\{0, \dots, 2^{16} - 1\}$, dans Goldilocks ?
:::reponse
$Z(s) = s(s - 1)(s - 2)(s - 3)$, de degré 4. Il s'annule en 0, 1, 2 et 3, et seulement là, parce que dans un corps un produit n'est nul que si l'un de ses facteurs l'est.

Pour $\{0, \dots, 2^{16} - 1\}$, le produit des $s - i$ a $2^{16}$ facteurs, donc le degré $2^{16} = 65\,536$.
:::
:::

Pour montrer que toutes les clés annulent $Z$, le prouveur passe par un zéro-test, donc par un sumcheck, et le polynôme qu'il envoie à chaque tour a en général le degré de $Z$ dans la variable du tour. Avec la borne $2^{16}$, chaque tour enverrait donc au moins $2^{16} + 1$ coefficients, contre 3 pour les tours du sumcheck du reçu.

Une **table** dit la même chose autrement : la **clé** $s$ est l'une des lignes de la table $R_4 = \{0, 1, 2, 3\}$. Le chapitre suivant prouve qu'une liste de clés est dans une table avec des sumchecks de petit degré ([[lookups]]). Le nombre de lignes de la table compte dans le travail du prouveur, mais il n'augmente pas le degré des tours.

## L'activation : une table de paires

L'activation $\varphi(t) = \max(t, 0)$ n'est pas non plus une opération du corps, puisque $\max$ compare. Or $q$ ne prend que peu de valeurs : comme $|h| \le 12$, on a $q \in [-3, 3]$, puisque $\lfloor -10/4 \rfloor = -3$ et $\lfloor 14/4 \rfloor = 3$. On peut donc écrire $\varphi$ comme la liste de ses paires $(t, \varphi(t))$ pour $t$ de $-3$ à 3. Cette liste est la table $T_\varphi$, et l'affirmation devient « la paire $(q_i, a_i)$ est une ligne de $T_\varphi$ ».

:::exercice ★
Écrivez les sept lignes de $T_\varphi$ avec les valeurs rangées dans $\mathbb{F}_{97}$, puis les quatre paires $(q_i, a_i)$ de l'exemple. Sont-elles toutes dans la table ?
:::reponse
Un négatif $-v$ est rangé comme $97 - v$, donc les lignes sont :

$$(94, 0),\ (95, 0),\ (96, 0),\ (0, 0),\ (1, 1),\ (2, 2),\ (3, 3)$$

Les paires de l'exemple sont $(1, 1)$, $(96, 0)$, $(1, 1)$ et $(2, 2)$, qui sont toutes des lignes de $T_\varphi$.
:::
:::

Une ligne de $T_\varphi$ a pour seconde colonne $\varphi$ de la première, donc l'appartenance donne $a_i = \varphi(q_i)$. La première colonne ne contient que $-3, \dots, 3$, donc la même appartenance borne aussi $q_i$ à $[-3, 3]$, ce qui servira plus bas. Le chapitre [[tables|Les tables]] montre comment réunir les deux colonnes en une seule clé.

## L'argmax : des marges positives

Le prouveur annonce $c$, et il faut contrôler que $c$ est la première position du maximum de $y$. Cela fait deux conditions : $y_c \ge y_v$ pour tout $v$, et $y_c > y_v$ pour $v < c$, sans quoi une position placée avant $c$ serait le premier maximum. Les $y_v$ sont des entiers, donc $y_c > y_v$ équivaut à $y_c - y_v - 1 \ge 0$, et les deux conditions ne diffèrent que par ce $-1$ quand $v < c$. On les réunit en demandant que toutes les **marges**

$$\Delta_v = y_c - y_v - [v < c]$$

soient positives ou nulles, où $[v < c]$ vaut 1 si $v < c$ et 0 sinon. La page [[argmax]] montre que cette condition dit exactement « $c$ est la première position du maximum ».

:::exercice ★
Calculez les quatre marges de l'exemple, avec $y = (1, 3, 3, -2)$ et $c = 1$.
:::reponse
$$
\begin{aligned}
\Delta_0 &= 3 - 1 - 1 = 1 \\
\Delta_1 &= 3 - 3 - 0 = 0 \\
\Delta_2 &= 3 - 3 - 0 = 0 \\
\Delta_3 &= 3 - (-2) - 0 = 5
\end{aligned}
$$

donc $\Delta = (1, 0, 0, 5)$. La position 2 a la même valeur que $c$, et sa marge est nulle parce qu'elle vient après $c$.
:::
:::

« Positif ou nul » est encore une inégalité, qu'on écrit comme une table : chaque marge est dans $R_{32} = \{0, \dots, 31\}$. Les marges honnêtes y entrent, parce que $a \in [0, 3]$ et des poids dans $\{-1, 0, 1\}$ donnent $|y_v| \le 12$, donc $0 \le \Delta_v \le 24$. Le choix de 32 est justifié plus bas.

## Les trois tables du réseau

Les trois étapes sont maintenant des affirmations de la même forme :

| clés | table | valeurs de l'exemple |
|---|---|---|
| $s_i = h_i + 2 - 4q_i$ | $R_4 = \{0, 1, 2, 3\}$ | $(3, 3, 0, 0)$ |
| $(q_i, a_i)$ | $T_\varphi$ (7 lignes) | $(1, 1), (-1, 0), (1, 1), (2, 2)$ |
| $\Delta_v$ | $R_{32}$ | $(1, 0, 0, 5)$ |

On essaie d'abord ces tables sur deux prouveurs qui trichent.

:::exercice ★
Le premier tricheur calcule l'arrondi avec la division de C, qui tronque vers zéro, et annonce $q = (1, 0, 1, 2)$. Le second annonce la classe $c = 2$. Calculez les clés de chacun, rangées dans $\mathbb{F}_{97}$. Quelle clé n'est pas dans sa table ?
:::reponse
Le premier tricheur ne change que $q_1$ : $s_1 = -3 + 2 - 4 \times 0 = -1$, rangé comme 96. Ses restes sont $(3, 96, 0, 0)$, et 96 n'est pas dans $R_4$. Sa paire $(q_1, a_1) = (0, 0)$ est une ligne de $T_\varphi$, et ses marges ne changent pas, puisque $a$ et $y$ ne changent pas : seul le reste le trahit.

Le second calcule ses marges avec $y_2 = 3$ :

$$
\begin{aligned}
\Delta_0 &= 3 - 1 - 1 = 1 \\
\Delta_1 &= 3 - 3 - 1 = -1 \\
\Delta_2 &= 0 \\
\Delta_3 &= 3 - (-2) = 5
\end{aligned}
$$

$\Delta_1 = -1$ est rangé comme 96, qui n'est pas dans $R_{32}$.
:::
:::

## Pourquoi les tables suffisent

Les deux tricheurs ont été pris, mais un tricheur peut choisir n'importe quel élément du corps pour $q$. Les tables portent sur des éléments du corps : « $s$ est dans $R_4$ » dit que l'élément $s$ vaut 0, 1, 2 ou 3, pas que l'entier $h + 2 - 4q$ est dans $[0, 3]$. Pour passer du corps aux entiers, on utilise le fait de la page [[entiers-signes]] : si deux entiers sont congrus modulo $p$ et diffèrent de moins de $p$, ils sont égaux. Il faut donc d'abord borner les entiers en jeu.

On rassemble ce qu'on sait de chaque valeur :

- $T_\varphi$ donne $q \in [-3, 3]$ et $a = \varphi(q)$ ;
- les poids sont dans $\{-1, 0, 1\}$, ce que le prouveur montre une fois pour toutes quand il s'engage sur eux ([[preuve-reseau]], étape 2), et $x \in [0, 3]$, donc $h \in [-12, 12]$.

On en déduit les bornes de l'entier $h + 2 - 4q$ :

$$
\begin{aligned}
h + 2 - 4q &\ge -12 + 2 - 4 \times 3 = -22 \\
h + 2 - 4q &\le 12 + 2 + 4 \times 3 = 26
\end{aligned}
$$

La clé $s$ est l'une des valeurs $0, \dots, 3$, et elle est congrue à cet entier. Leur différence vaut au plus 26 en valeur absolue, ce qui est moins que 97, donc ils sont égaux :

$$0 \le h + 2 - 4q \le 3 \quad \text{entre entiers}$$

C'est la définition du reste, donc $q = \lfloor (h + 2)/4 \rfloor = \rq(h, 2)$ exactement. Aucun choix de $q$ dans le corps ne fait passer un autre quotient.

:::exercice ★★★
Faites le même raisonnement pour la classe. À partir de $T_\varphi$, des poids ternaires et des marges dans $R_{32}$, montrez que $c$ est la première position du maximum de $y$.
:::reponse
$T_\varphi$ donne $a \in [0, 3]$, et $W_2$ est ternaire, donc $|y_v| \le 12$. Comme entier, une marge vérifie donc :

$$-12 - 12 - 1 = -25 \le y_c - y_v - [v < c] \le 12 + 12 = 24$$

Un entier négatif de $[-25, -1]$ est rangé dans $[72, 96]$, puisque $-25 + 97 = 72$. Aucune de ces valeurs n'est dans $R_{32} = \{0, \dots, 31\}$. Une marge dont l'élément est dans $R_{32}$ est donc un entier positif ou nul, et toutes les marges positives ou nulles caractérisent le premier maximum ([[argmax]]).
:::
:::

:::exercice ★★
Quelle est la plus grande table $\{0, \dots, T - 1\}$ qu'on puisse prendre pour les marges sans laisser passer une mauvaise classe ? Quelle est la plus petite qui accepte toujours la bonne ?
:::reponse
Les marges négatives sont rangées dans $[72, 96]$. La table ne doit en contenir aucune, donc $T - 1 < 72$, soit $T \le 72$.

Avec des poids ternaires quelconques, les marges honnêtes atteignent 24, donc il faut $T \ge 25$. Toute table de 25 à 72 lignes convient. Deux puissances de 2 sont dans cet intervalle, 32 et 64, et $R_{32}$ est la plus petite.
:::
:::

:::piege
**« Dans la table » ne suffit pas seul.** L'appartenance porte sur un élément du corps. Elle ne fixe le résultat entier qu'avec les bornes de $h$, de $q$ et de $y$, qui font qu'aucune valeur négative ne revient dans la table. Sans ces bornes, un tricheur choisit une valeur qui fait le tour du corps et dont l'élément est une ligne de la table ([[intervalles]] en donne un exemple avec des clés décalées).

**Le terme $[v < c]$ ne s'oublie pas.** Sans lui, les marges de l'exemple seraient positives ou nulles pour $c = 1$ comme pour $c = 2$, et le prouveur pourrait choisir entre deux classes à égalité.
:::

## Notre prouveur et FlashProve

FlashProve ramène les mêmes étapes à des tables, sur des nombres beaucoup plus grands. Ses tables d'intervalle ont $2^8$, $2^{10}$ ou $2^{16}$ lignes (`docs/format/11-1-machinery.md`, « Public tables ») :

| | notre réseau | FlashProve |
|---|---|---|
| reste d'un arrondi | clé $s$ dans $R_4$ | clé $2^{16-k}(A + 2^{k-1} - 2^k Q)$ dans sa table de $2^{16}$ lignes, avec des chiffres hauts quand $k > 16$ (`docs/format/11-2-feed-forward-segment.md`, « A rounding site » et « The keys ») |
| activation | $T_\varphi$, 7 lignes | SiLU par une table de $65\,536$ lignes ; la ligne $t$ range l'argument et la valeur en un seul nombre, $t + 2^{28}(s(t) + 4096)$ (`docs/format/11-1-machinery.md`, « Public tables ») |
| argmax | marges dans $R_{32}$ | tête : des marges écrites en trois chiffres $K_2 + 2^{sh} K_1 + 2^{sh+15} K_0$ (`docs/format/11-4-output-head.md`, item 7), celles de l'argmax pour le token suivant, et pour un token vérifié sous une politique, une marge qui contient en plus un terme de coût (item 6 et « The next token ») ; routeur : un vecteur qui ne contient qu'un seul 1 (`11-2-feed-forward-segment.md`, ligne 17) |

## Quiz

:::quiz
1. Pourquoi le vérifieur ne peut-il pas contrôler « $s < 4$ » en comparant les éléments $s$ et $4$ de $\mathbb{F}_p$ ?
2. Le polynôme $s(s-1) \cdots (s - 2^{16} + 1)$ s'annule exactement sur $\{0, \dots, 2^{16} - 1\}$. Pourquoi prend-on une table plutôt que ce polynôme ?
3. Quelle table borne $q$ ?
4. Que vaut la marge $\Delta_c$ ?
5. À quoi sert le terme $[v < c]$ ?
6. Le prouveur qui tronque vers zéro est-il pris ? Par quelle clé ?
:::reponse Réponses
1. $\mathbb{F}_p$ n'a pas d'ordre que l'addition conserve : en ajoutant 1 assez de fois, on revient au point de départ.
2. Son degré vaut $2^{16}$, donc chaque tour du sumcheck qui le contrôle enverrait au moins $2^{16} + 1$ coefficients. Le nombre de lignes d'une table n'augmente pas le degré des tours.
3. $T_\varphi$, dont la première colonne ne contient que $-3, \dots, 3$.
4. 0, puisque $y_c - y_c - [c < c] = 0$.
5. Il fait qu'en cas d'égalité seule la plus petite position passe.
6. Oui, par son reste : $-1$, rangé comme 96, n'est pas dans $R_4$.
:::
:::
