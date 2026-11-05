---
id: preuve-reseau
---
On veut une preuve, vérifiable seule, de l'énoncé : « avec les poids engagés sous la racine $R_w$, l'entrée $x$ donne la classe $c$ ». Le [[reseau|petit réseau]] calcule $h = W_1 x$, $q = \rq(h, 2)$, $a = \varphi(q)$, $y = W_2 a$, puis la classe $c$, premier indice du maximum de $y$. Chaque morceau de ce calcul a déjà sa preuve : les produits par un [[sumcheck-matrices|sumcheck]], l'arrondi, l'activation et l'[[argmax]] par des tables, les tables par des [[lookups]] dont les produits sont prouvés par [[gkr|GKR]], les affirmations sur une table engagée par le [[test-proximite|test de proximité]], et le vérifieur qui tire les défis par la [[fiat-shamir|chaîne de hachage]].

Cette page assemble ces preuves dans l'ordre où elles s'exécutent. Elle fixe d'abord ce que le vérifieur connaît et ce qu'il doit apprendre. Elle écrit ensuite ce qui se fait une seule fois, à l'engagement des poids, puis la preuve d'une entrée, étape par étape, en disant chaque fois quelle affirmation l'étape laisse et quelle table engagée la contrôlera. Elle finit par suivre des tricheurs jusqu'à l'étape qui les prend.

## Ce que le vérifieur connaît

Les paramètres sont publics. Les données sont des éléments de $\mathbb{F}_{97}$ et les défis des éléments de $\mathbb{E}_{97}$, qui a $97^3 = 912\,673$ éléments. La forme du réseau est publique : deux matrices $4 \times 4$, l'arrondi $\rq(\cdot, 2)$, l'activation $\varphi(t) = \max(t, 0)$ et l'argmax qui garde le plus petit indice en cas d'égalité.

Les trois tables sont publiques :

$$
\begin{aligned}
R_4 &= \{0, 1, 2, 3\} \\
T_\varphi &= \{(t, \varphi(t)) : -3 \le t \le 3\} \\
R_{32} &= \{0, 1, \dots, 31\}
\end{aligned}
$$

La forme des deux tables engagées l'est aussi. La table des poids a 4 lignes de 8 places, la table des cellules 32 lignes de 8 places, et chaque ligne est encodée en un mot de Reed-Solomon de longueur 32 sur $7 \cdot H_{32}$, de rendement $1/4$ ([[engagement-colonnes]]). Chaque test de proximité ouvre $t = 8$ positions, et la chaîne hache avec SHA-256.

L'énoncé d'une preuve est le triplet $(x, c, R_w)$. Le vérifieur connaît $x$ et $c$ ; la racine $R_w$ désigne les poids sans les montrer.

## Ce qu'il faut établir

[[arrondir|Le chapitre 6]] a ramené le passage du réseau à trois appartenances. On pose $s_i = h_i + 2 - 4q_i$ et $\Delta_v = y_c - y_v - [v < c]$. Il suffit d'établir que les restes $s_i$ sont dans $R_4$, que les paires $(q_i, a_i)$ sont dans $T_\varphi$ et que les marges $\Delta_v$ sont dans $R_{32}$, avec $h = W_1 x$ et $y = W_2 a$ calculés avec les poids engagés. L'argument de taille des [[intervalles]] en déduit alors que $q$ est l'arrondi exact de $h$, que $a = \varphi(q)$ et que $c$ est le premier indice du maximum, à une condition : $|h| \le 12$ et $|y| \le 12$, ce qui demande des poids dans $\{-1, 0, 1\}$.

Le prouveur n'écrit jamais $h$, $s$, $y$ ni $\Delta$. Le vérifieur n'en reçoit que des valeurs d'extensions multilinéaires en des points, et chacune se ramène, on va le voir, à une affirmation sur les poids ou sur $q$ et $a$.

## 1. Engager les poids

Celui qui s'engage range les 32 poids dans la table des poids. Le poids d'indice $i = k + 4 \cdot \text{ligne} + 16 \cdot \text{couche}$ va à la ligne $b = k$ et à la place $\text{ligne} + 4 \cdot \text{couche}$, si bien que la ligne $b$ de la table est la colonne $b$ de $W_1$ suivie de la colonne $b$ de $W_2$ (NOTATION §7). Il encode chaque ligne en 32 symboles, hache les 32 colonnes dans un [[merkle|arbre de Merkle]] et publie la racine $R_w$.

## 2. Prouver une fois que les poids sont ternaires

La condition $|h| \le 12$ ne tient que si chaque poids est dans $\{-1, 0, 1\}$. Un poids égal à 50 donnerait des produits que le corps confond avec des négatifs, et l'argument de taille ne tiendrait plus. Un poids $w_i$ est ternaire exactement quand

$$w_i (w_i - 1)(w_i + 1) = 0$$

puisque ce produit ne s'annule qu'en $0$, $1$ et $-1$.

:::exercice ★
Calculez $w(w - 1)(w + 1)$ dans $\mathbb{F}_{97}$ pour $w = -1, 0, 1$, puis pour $w = 2$ et $w = 50$.

:::reponse
Pour $-1$, $0$ et $1$, un des trois facteurs est nul, donc le produit vaut 0. Pour $w = 2$ : $2 \times 1 \times 3 = 6$. Pour $w = 50$ : $50 \times 49 \times 51 = 124\,950 = 1\,288 \times 97 + 14$, donc 14. Aucun des deux ne vaut 0.
:::
:::

Il faut le montrer pour les 32 poids à la fois, ce que fait un zéro-test ([[sumcheck]]) : on tire $\zeta \in \mathbb{E}^5$ après $R_w$, et le prouveur montre

$$\sum_{i \in \{0,1\}^5} \eq(\zeta, i)\, w_i (w_i - 1)(w_i + 1) = 0$$

par un sumcheck de 5 tours d'égalité. Dans un tour d'égalité, le facteur de $\eq$ qui porte la variable du tour n'entre pas dans $g_j$ : le contrôle $(1 - \zeta_j)\, g_j(0) + \zeta_j\, g_j(1) = C_{j-1}$ le remet ([[sumcheck]]). Chaque polynôme de tour a donc le degré 3, puisque $\tilde w$ apparaît trois fois dans le produit. Le dernier tour laisse une valeur $C_5$ en un point $r$ tiré au fil des tours ; le prouveur annonce $v = \tilde w(r)$, et le vérifieur contrôle $C_5 = v(v - 1)(v + 1)$. Il reste l'affirmation $\tilde w(r) = v$, qui est linéaire en $w$ : le test de proximité la contrôle sur la table des poids, avec un pli sur les 2 variables de ligne et 8 positions.

:::exercice ★★
Pourquoi cette preuve se fait-elle une seule fois, à l'engagement, et pas dans chaque preuve d'une entrée ?

:::reponse
Elle ne parle que de la table engagée sous $R_w$, et cette table ne change pas d'une entrée à l'autre. Chaque preuve d'une entrée met $R_w$ dans son énoncé, donc elle parle de la même table, déjà prouvée ternaire. La refaire à chaque entrée coûterait un sumcheck et un test de plus par preuve sans rien établir de nouveau. FlashProve fait de même : la preuve que les chiffres des poids sont dans leurs intervalles est dans le fichier de clé, faite une fois (`docs/protocol.md` §6.1, étape 2).
:::
:::

Le notebook du chapitre fait cette preuve en 9 tours ; elle tient en 553 octets.

## 3. Le début de la chaîne

La preuve d'une entrée a sa propre chaîne. Son état de départ contient l'étiquette, les paramètres et tout l'énoncé :

$$S_0 = H(\text{étiquette}, \text{paramètres}, x, c, R_w)$$

Chaque défi de la preuve dépend donc de l'entrée, de la classe annoncée et des poids engagés.

## 4. Engager les cellules

Le vérifieur a besoin de valeurs que le prouveur est seul à connaître : la couche cachée $q$ et son activation $a$, et les multiplicités des trois lookups. Chaque table a 4 clés, donc une multiplicité vaut au plus 4, qui s'écrit $100$ en binaire : il faut 3 bits, donc 3 plans de bits par lookup, avec un bit par ligne de la table ([[lookups]]). La table $T_\varphi$ a 7 lignes ; pour que ses arbres de produits aient 8 feuilles, on répète sa dernière ligne $(3, 3)$.

:::exercice ★
Comptez les cellules. Quelle est la plus petite table de lignes de 8 places, avec un nombre de lignes puissance de 2, qui les contient ?

:::reponse
$q$ et $a$ donnent $4 + 4 = 8$ cellules. Les plans donnent $3 \times 4$ pour $R_4$, $3 \times 8$ pour $T_\varphi$ et $3 \times 32$ pour $R_{32}$, soit $12 + 24 + 96 = 132$. En tout, 140 cellules. Une table de 16 lignes n'a que 128 places ; il faut 32 lignes, soit 256 places, dont 116 restent à 0.
:::
:::

:::exercice ★★
Pourquoi compléter $T_\varphi$ en répétant une de ses lignes, et pas avec une ligne quelconque, par exemple $(4, 4)$ ?

:::reponse
Pour l'identité des produits, une ligne ajoutée est une ligne comme les autres : toute clé qui lui est égale passe. Avec $(4, 4)$, une paire $(q_i, a_i) = (4, 4)$ passerait, alors que $q = 4$ n'est pas dans $[-3, 3]$, ce qui casse l'argument de taille. Une ligne répétée n'ajoute aucune valeur nouvelle, donc elle n'accepte que ce que la table acceptait déjà. FlashProve remplit du côté des clés, pas de la table, avec la même règle : une valeur de remplissage est une ligne de la table, ce qui « lets in no key that is in no row ». Le même commentaire rapporte une vraie fausse acceptation, quand le nombre de clés de remplissage était donné à part de leur liste et qu'il en manquait une (`blocks/iop/lkp.h:137-157`).
:::
:::

Le prouveur range ces 140 valeurs dans la table des cellules, encode ses 32 lignes, hache ses colonnes et envoie la racine $R_c$, que la chaîne absorbe. Les multiplicités de $T_\varphi$ comptent les paires $(q_i, a_i)$ égales à $(t, \varphi(t))$ ; elles ne dépendent pas du défi $\beta$, qui n'est pas encore tiré.

## 5. Tirer β et α

Après $R_c$, la chaîne donne quatre défis. Le défi $\beta$ combine chaque paire en une seule clé $q_i + \beta a_i$, et chaque ligne de $T_\varphi$ en $t + \beta \varphi(t)$ ([[lookups]]). Les trois défis $\alpha$ servent aux identités de produits, un par table.

:::exercice ★★
Pourquoi $\beta$ et les $\alpha$ sont-ils tirés après $R_c$ ? Et pourquoi les points où finissent les lookups viennent-ils encore après ?

:::reponse
Si le prouveur connaissait $\beta$ avant de fixer ses cellules, il choisirait une paire hors de $T_\varphi$ dont la clé est égale à une ligne pour ce $\beta$ : c'est le cas de la paire $(-11, 1)$ pour six valeurs de $\beta$, et il lui suffit d'en connaître une. S'il connaissait $\alpha$, il ajusterait une clé fausse pour que les deux produits coïncident en ce point ([[lookups]]). Après $R_c$, les défis sont tirés sur des cellules déjà fixées.

Les points où finissent les lookups sont les défis des sumchecks de GKR, dont chaque tour suppose les valeurs des arbres déjà fixées : ils sont tirés pendant ces sumchecks, donc après les produits annoncés et après $R_c$.
:::
:::

## 6. Les trois lookups

Chaque table a ses clés : les restes $s_i$ pour $R_4$, les combinaisons $q_i + \beta a_i$ pour $T_\varphi$, les marges $\Delta_v$ pour $R_{32}$. Pour chacune, le prouveur annonce le produit des clés $Z = \prod_i (\alpha - K_i)$ et les trois produits de plans $G_0$, $G_1$, $G_2$, et le vérifieur contrôle

$$Z = G_0\, G_1^2\, G_2^4$$

Si une clé n'est pas une ligne et que les multiplicités ont pour somme 4, ce contrôle échoue, sauf pour au plus 3 valeurs de $\alpha$ ([[lookups]]). Cette somme est fixée par le compte qu'on prouve plus bas, et ce compte est vérifié modulo 97. Avec 3 plans, chaque multiplicité vaut au plus 7. Pour $R_4$ et $T_\varphi$, la somme vaut donc au plus $4 \times 7 = 28$ ou $8 \times 7 = 56$, sous 97, et le compte la fixe à 4. Pour $R_{32}$, elle peut atteindre $32 \times 7 = 224$, et le compte laisse aussi passer 101 et 198 : le côté de la table peut alors avoir le degré 198, et la borne passe à 198 valeurs de $\alpha$ ([[tables]]).

Ces quatre produits portent sur des valeurs que le vérifieur ne voit pas, et chacun est prouvé par [[gkr|GKR]] : l'arbre des clés a 4 feuilles, donc 2 étages, et les arbres des plans en ont 2, 3 ou 5 selon la table. Chaque arbre finit par une affirmation sur l'extension multilinéaire de ses feuilles en un point tiré au hasard.

L'arbre des clés donne $\tilde L(\rho) = \alpha - \tilde K(\rho)$, donc une valeur annoncée de $\tilde K(\rho)$. On note $\rho$, $\rho'$ et $\rho''$ ces points pour $R_4$, $T_\varphi$ et $R_{32}$.

L'arbre du plan $j$ a pour feuilles $1 + b_{j,t}(\alpha - 1 - T_t)$. Comme les poids $\eq(\nu, t)$ ont une somme égale à 1, son affirmation finale en un point $\nu$ s'écrit

$$\tilde L_j(\nu) = 1 + \sum_t \eq(\nu, t)\, (\alpha - 1 - T_t)\, b_{j,t}$$

C'est une affirmation linéaire sur les cellules, dont le vérifieur connaît les coefficients.

Il faut encore montrer que les plans ne contiennent que des bits, et que les multiplicités comptent bien 4 clés. Pour les bits, un zéro-test montre que $b(b - 1)$ s'annule sur chaque plan, les trois plans étant regroupés par un défi $\chi$ ; il finit par trois valeurs $\tilde b_j$ en un point, donc trois affirmations sur les cellules. Le compte s'écrit

$$\sum_j 2^j \sum_t b_{j,t} = 4$$

une affirmation linéaire de plus. Chaque lookup laisse donc une affirmation sur ses clés et 7 affirmations sur les cellules.

## 7. Ramener les clés au réseau

Les trois affirmations sur les clés parlent de $s$, de $q + \beta a$ et de $\Delta$, qu'aucune table ne contient. On les ramène aux poids et aux cellules.

Pour $R_4$, chaque reste vaut $s_i = h_i + 2 - 4 q_i$. On multiplie par $\eq(\rho, i)$ et on somme sur $i$ ; comme la somme des $\eq(\rho, i)$ vaut 1, la constante 2 passe telle quelle :

$$\tilde s(\rho) = \tilde h(\rho) + 2 - 4\, \tilde q(\rho)$$

Le prouveur annonce $\tilde h(\rho)$ et $\tilde q(\rho)$, et le vérifieur contrôle que la valeur de $\tilde K(\rho)$ laissée par GKR vaut $\tilde h(\rho) + 2 - 4\tilde q(\rho)$. Il reste deux affirmations. $\tilde q(\rho)$ porte sur les cellules. $\tilde h(\rho)$ porte sur les poids, puisque

$$\tilde h(\rho) = \sum_i \eq(\rho, i)\, h_i = \sum_{i, k} \eq(\rho, i)\, x_k\, W_1[i][k]$$

est une forme linéaire de $W_1$ dont le vérifieur calcule les coefficients $\eq(\rho, i)\, x_k$, puisque $x$ est public. Cette affirmation n'a besoin d'aucun sumcheck ([[matrices|chapitre 5]]).

Pour $T_\varphi$, le même calcul donne $\tilde K(\rho') = \tilde q(\rho') + \beta\, \tilde a(\rho')$. Le prouveur annonce $\tilde q(\rho')$ et $\tilde a(\rho')$, le vérifieur contrôle la relation, et il reste deux affirmations sur les cellules.

Pour $R_{32}$, on pose $\iota_v = [v < c]$, un vecteur public puisque $c$ est dans l'énoncé.

:::exercice ★★★
Montrez que

$$\sum_v \eq(\rho'', v)\, (y_c - y_v - \iota_v) = y_c - \tilde y(\rho'') - \tilde\iota(\rho'')$$

:::reponse
On sépare la somme en trois. Le terme $y_c$ ne dépend pas de $v$, donc il se met en facteur de $\sum_v \eq(\rho'', v)$, et cette somme vaut 1 : c'est le produit $\prod_k \big(\rho''_k + (1 - \rho''_k)\big)$, dont chaque facteur vaut 1 ([[multilineaire]]). Les deux autres termes sont les définitions de $\tilde y(\rho'')$ et de $\tilde\iota(\rho'')$.
:::
:::

Le vérifieur connaît donc $y_c - \tilde y(\rho'') = \tilde K(\rho'') + \tilde\iota(\rho'')$. Il faut relier ce nombre aux poids. On a $y_c = \sum_k W_2[c][k]\, a_k$ et, en échangeant les sommes sur $v$ et sur $k$ comme dans le [[sumcheck-matrices|sumcheck d'un produit]], $\tilde y(\rho'') = \sum_k \tilde W_2(\rho'', k)\, a_k$. Comme $c$ est un indice entier, $W_2[c][k] = \tilde W_2(c, k)$, d'où

$$y_c - \tilde y(\rho'') = \sum_{k \in \{0,1\}^2} \big(\tilde W_2(c, k) - \tilde W_2(\rho'', k)\big)\, a_k$$

C'est une somme sur $k$ d'un produit de deux fonctions multilinéaires de $k$ : un sumcheck de 2 tours de degré 2. Il finit en un point $r$ tiré au fil des tours. Le prouveur annonce $\tilde W_2(c, r)$, $\tilde W_2(\rho'', r)$ et $\tilde a(r)$, et le vérifieur contrôle que la dernière valeur du sumcheck vaut $\big(\tilde W_2(c, r) - \tilde W_2(\rho'', r)\big)\, \tilde a(r)$. Il reste deux affirmations sur les poids et une sur les cellules.

:::exercice ★
Listez les affirmations qui arrivent sur la table des poids et sur la table des cellules. Combien y en a-t-il sur chacune ?

:::reponse
Sur les poids, trois : $\sum_{i,k} \eq(\rho, i)\, x_k\, W_1[i][k] = \tilde h(\rho)$, puis $\tilde W_2(c, r)$ et $\tilde W_2(\rho'', r)$.

Sur les cellules : $\tilde q(\rho)$, $\tilde q(\rho')$, $\tilde a(\rho')$ et $\tilde a(r)$, plus les 7 affirmations de chaque lookup, soit $4 + 3 \times 7 = 25$.
:::
:::

## 8. Ouvrir la table des poids

Les trois affirmations sur les poids sont linéaires : chacune s'écrit $\langle c_i, w \rangle = v_i$, avec des coefficients que le vérifieur calcule. Un défi $\chi$ les [[horner|regroupe]] en une seule, $\langle \sum_i \chi^i c_i, w \rangle = \sum_i \chi^i v_i$. Le [[test-proximite|test de proximité]] la contrôle : un pli par un sumcheck sur les 2 variables de ligne, puis le cas de base, où le prouveur envoie la ligne pliée $M_0$ et où le vérifieur ouvre 8 positions de la table des poids et compare chaque colonne pliée au symbole de $\mathrm{Enc}(M_0)$.

## 9. Ouvrir la table des cellules

Les 25 affirmations sur les cellules sont regroupées de la même façon. Le test plie les 32 lignes de la table des cellules par un sumcheck sur 5 variables de ligne, puis le cas de base ouvre 8 positions de cette table, sous la racine $R_c$.

## 10. Accepter

Le vérifieur accepte si chaque contrôle a passé et si chaque colonne ouverte mène à sa racine par son chemin. Chaque contrôle laisse passer une affirmation fausse avec une petite probabilité, que [[securite]] compte tour par tour.

:::exercice ★★
Pour chaque tricheur, dites à quelle étape il est pris : (a) il tronque au lieu d'arrondir ; (b) il annonce $c = 2$ avec des valeurs justes ; (c) son $a_1$ vaut 1 au lieu de 0, et il annonce la classe 2 que donne ce $a$ ; (d) il s'engage sur une table où un poids vaut 2 ; (e) il s'engage sur les vrais poids mais calcule avec d'autres. L'entrée est $x = (2, 1, 3, 1)$.

:::reponse
(a) Étape 6, table $R_4$. Il a $q_1 = 0$ au lieu de $-1$, donc $s_1 = -3 + 2 - 0 = -1$, rangé 96, qui n'est pas une ligne de $R_4$ : $Z \neq G_0 G_1^2 G_2^4$.

(b) Étape 6, table $R_{32}$. Avec $y = (1, 3, 3, -2)$, la marge $\Delta_1 = y_2 - y_1 - 1 = -1$ n'est pas dans $R_{32}$.

(c) Étape 6, table $T_\varphi$. La paire $(q_1, a_1) = (-1, 1)$ n'est pas une ligne. Son $a = (1, 1, 1, 2)$ donne $y = (1, 3, 4, -1)$, dont les marges pour $c = 2$ valent $(2, 0, 0, 5)$ : $R_{32}$ les accepte, et seule $T_\varphi$ le prend. S'il gardait $c = 1$, la marge $\Delta_2 = 3 - 4 = -1$ le ferait prendre aussi par $R_{32}$.

(d) Étape 2, au zéro-test : $2 \times 1 \times 3 = 6 \neq 0$, donc la somme pondérée par $\eq(\zeta, \cdot)$ est une fonction non nulle de $\zeta$, qui ne s'annule qu'avec une probabilité d'au plus $5/|\mathbb{E}|$.

(e) Étape 8. Ses lookups sont cohérents avec ses poids, mais les affirmations sur les poids sont fausses pour la table engagée. S'il plie les lignes engagées, le premier tour du pli échoue, puisque l'affirmation regroupée est fausse. S'il plie ses propres lignes, la ligne $M_0$ qu'il envoie diffère du pli des lignes engagées, donc $\mathrm{Enc}(M_0)$ diffère des colonnes pliées en au moins 25 positions sur 32, et les 8 positions le prennent sauf avec l'erreur du test.

Le notebook fait les cinq essais. Il rejette (a), (b) et (c) au contrôle $Z = G_0 G_1^2 G_2^4$ de $R_4$, $R_{32}$ et $T_\varphi$, (d) au premier tour du zéro-test, et (e) au cas de base de la table des poids, sur la colonne 5.
:::
:::

Sur l'exemple du cours, $x = (2, 1, 3, 1)$ et $c = 1$, le notebook accepte la preuve honnête, en 105 tours et 2 068 octets ; le chapitre [[prouveur-complet]] détaille ce qu'elle contient.

## Notre prouveur et FlashProve

La première chaîne d'une requête de FlashProve ramène toutes les affirmations sur les poids à une seule équation linéaire, $g \cdot M \cdot e + \mu = v$, où $M$ est la matrice des poids et $\mu$ une combinaison de masques. Le prouveur s'engage sur le vecteur $g \cdot M$, et la chaîne finit par un sceau. La table n'est ouverte qu'une fois par lot de requêtes, dans une chaîne partagée ([[lots]] ; `docs/protocol.md` §6.3). Notre preuve ouvre la table des poids dans chaque preuve, et elle envoie la ligne pliée en clair : le chapitre [[cacher]] montre ce que cela révèle.

:::piege
**Oublier la preuve ternaire.** Sans elle, rien ne borne $|h|$ par 12, et l'argument du chapitre 6, qui passe des égalités dans le corps aux égalités entières, ne tient plus.

**Deux conventions.** Le prouveur et le vérifieur doivent ranger les bits des indices de la même façon (la première variable sur le bit faible) et apparier les feuilles de GKR de la même façon (les entrées $i$ et $i + 2^\ell$). Une convention différente d'un seul côté fait rejeter la preuve honnête.
:::
