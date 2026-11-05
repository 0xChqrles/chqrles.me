---
id: tables
---
Le chapitre précédent a ramené l'arrondi, l'activation et l'argmax à des affirmations « cette clé est dans cette table ». Ce chapitre les prouve. On transforme d'abord « chaque clé est une ligne de la table » en une égalité entre deux produits, qu'on teste en un point tiré au hasard. Ces produits portent sur des valeurs que le vérifieur ne voit pas, donc on construit ensuite un protocole qui vérifie un produit de beaucoup de valeurs avec des sumchecks. On l'applique aux trois tables du réseau, en réglant deux questions propres au réseau : comment chercher une paire $(q_i, a_i)$ dans une table, et comment réunir plusieurs tables dans une seule preuve.

Les deux outils ont chacun leur page, [[lookups]] pour l'égalité de produits et [[gkr]] pour la preuve d'un produit, à lire avant les sections qui suivent.

## Les clés que le vérifieur ne voit pas

Pour l'entrée $x = (2, 1, 3, 1)$, le réseau donne 12 clés, quatre par table :

| clés | table | valeurs de l'exemple |
|---|---|---|
| $s_i = h_i + 2 - 4q_i$ | $R_4 = \{0, 1, 2, 3\}$ | $(3, 3, 0, 0)$ |
| $(q_i, a_i)$ | $T_\varphi$ (7 lignes) | $(1, 1), (-1, 0), (1, 1), (2, 2)$ |
| $\Delta_v = y_c - y_v - [v < c]$ | $R_{32} = \{0, \dots, 31\}$ | $(1, 0, 0, 5)$ |

Le vérifieur ne voit aucune de ces clés. Les quotients $q$ et les activations $a$ sont des cellules engagées. Les restes dépendent aussi de $h = W_1 x$, et les marges de $y = W_2 a$, deux produits de matrices que le prouveur n'écrit jamais : le chapitre [[matrices]] les prouve par un sumcheck, qui ne donne que la valeur de leur extension multilinéaire en un point. Le vérifieur ne peut donc lire chaque vecteur de clés qu'à travers une affirmation sur son extension en un point, ce qui est la situation de la page [[lookups]].

## Les restes dans $R_4$

On applique [[lookups]] à la première table. Les clés sont les restes $s = (3, 3, 0, 0)$, la table a les lignes $0, 1, 2, 3$, et le prouveur doit montrer, pour un $\alpha$ tiré après son engagement :

$$\prod_i (\alpha - s_i) = \prod_{t=0}^{3} (\alpha - t)^{m_t} = \prod_j G_j^{2^j}$$

:::exercice ★
Pour les restes $(3, 3, 0, 0)$ et la table $R_4$, donnez les multiplicités et leurs plans de bits. Vérifiez l'identité en $\alpha = 10$ sous la forme $G_0 G_1^2$.

:::reponse
Les lignes 0 et 3 apparaissent deux fois, les lignes 1 et 2 jamais : $m = (2, 0, 0, 2)$. En binaire, $2 = 10$, donc $b_0 = (0, 0, 0, 0)$ et $b_1 = (1, 0, 0, 1)$.

Aucune ligne n'a son bit 0 à 1, donc $G_0$ est un produit vide : $G_0 = 1$. $G_1$ prend les lignes 0 et 3 : $G_1 = (10 - 0)(10 - 3) = 70$. Alors :

$$G_0\, G_1^2 = 4900 = 50 \cdot 97 + 50 \equiv 50$$

Le côté des clés vaut $(10 - 3)(10 - 3)(10 - 0)(10 - 0) = 7 \cdot 7 \cdot 10 \cdot 10 = 4900 \equiv 50$ aussi.
:::
:::

Le vérifieur ne peut calculer aucun des deux côtés, puisqu'il ne voit ni les restes ni les bits. Le prouveur annonce donc les racines des arbres de produits, ici $Z = 50$ pour les clés et $G_1 = 70$ pour la table, les autres $G_j$ valant 1 parce que leurs plans sont nuls. Le vérifieur contrôle l'identité sur ces nombres, et chaque racine est ensuite prouvée par [[gkr]].

Du côté des clés, les feuilles sont les $\alpha - s_i = (7, 7, 10, 10)$, et l'arbre multiplie les feuilles $i$ et $i + 2$ :

$$(7, 7, 10, 10) \;\to\; (7 \cdot 10,\ 7 \cdot 10) = (70, 70) \;\to\; 4900 \equiv 50$$

Du côté de la table, le plan 1 a les feuilles $1 + b_{1,t}(\alpha - 1 - t)$, qui valent $\alpha - t$ quand le bit vaut 1 et 1 sinon :

$$(10, 1, 1, 7) \;\to\; (10 \cdot 1,\ 1 \cdot 7) = (10, 7) \;\to\; 70$$

GKR finit l'arbre des clés par une affirmation sur l'extension des feuilles en un point $\rho$ de deux coordonnées (avec, comme partout dans le cours, $x_1$ pour le bit de poids faible). Comme les feuilles valent $\alpha - s_i$, c'est une affirmation $\tilde s(\rho) = \alpha - C$ sur l'extension des restes.

:::exercice ★
Le vérifieur ne voit pas $s$. Réécrivez l'affirmation sur $\tilde s(\rho)$ en affirmations sur $\tilde h(\rho)$ et $\tilde q(\rho)$, et dites quelle partie du prouveur répond à chacune.

:::reponse
Chaque reste vaut $s_i = h_i + 2 - 4 q_i$. L'extension est linéaire, et $\sum_i \eq(\rho, i) = 1$ donne la valeur 2 à l'extension du vecteur constant 2, donc :

$$\tilde s(\rho) = \tilde h(\rho) + 2 - 4\, \tilde q(\rho)$$

Le prouveur envoie $\tilde h(\rho)$ et $\tilde q(\rho)$, et le vérifieur contrôle cette relation. $\tilde h(\rho)$ est une affirmation sur le produit $W_1 x$, que prouve le sumcheck du chapitre [[matrices]] au point $\rho$. $\tilde q(\rho)$ porte sur des cellules engagées, et c'est l'engagement du chapitre [[engager]] qui y répond.
:::
:::

## Deux colonnes dans une clé

Une clé est un seul élément du corps, alors qu'une ligne de $T_\varphi$ est une paire $(t, \varphi(t))$. Il faut écrire chaque paire comme un seul nombre, de façon que deux paires différentes donnent deux nombres différents.

La première idée est celle des chiffres. Pour une paire honnête, $q + 3$ est dans $[0, 6]$ et $a$ dans $[0, 3]$, donc $(q + 3) + 8a$ écrit la paire en base 8 avec deux chiffres, et deux paires différentes donnent deux nombres différents. Mais ce codage ne marche que si $q + 3$ et $a$ sont des chiffres, et c'est ce que la table doit prouver : un tricheur peut engager n'importe quel élément du corps comme $q$ ou comme $a$.

La seconde idée remplace la base 8 par un défi. Après l'engagement de $q$ et $a$, le vérifieur tire $\beta$, et la paire devient la clé $q_i + \beta a_i$, la ligne $t$ devient $t + \beta \varphi(t)$. Une paire honnête est égale à une ligne, donc sa clé est égale à cette ligne pour tout $\beta$.

:::exercice ★★
Un tricheur engage $(q, a) = (-11, 1)$, qui n'est pas dans $T_\varphi$. Pour quels $\beta \in \F_{97}$ sa clé $q + \beta a$ vaut-elle une ligne $t + \beta \varphi(t)$ ? Que donne l'empaquetage $(q + 3) + 8a$ pour cette paire ?

:::reponse
La clé vaut la ligne $t$ quand :

$$(-11 - t) + \beta\,\big(1 - \varphi(t)\big) = 0$$

Pour $t \le 0$, $\varphi(t) = 0$ et il faut $\beta = t + 11$, soit $\beta \in \{8, 9, 10, 11\}$ pour $t = -3, -2, -1, 0$. Pour $t = 1$, l'équation devient $-12 = 0$ : jamais. Pour $t = 2$, $-13 - \beta = 0$ donne $\beta = -13 \equiv 84$. Pour $t = 3$, $-14 - 2\beta = 0$ donne $\beta = -7 \equiv 90$.

Six valeurs de $\beta$ sur 97 laissent passer la paire. Chaque équation a la même solution unique dans $\E_{97}$, donc, avec $\beta$ tiré dans $\E_{97}$, la paire passe avec une probabilité $6/912\,673$.

L'empaquetage donne $(-11 + 3) + 8 \cdot 1 = 0$, qui est la ligne de $t = -3$ : $(-3 + 3) + 8 \cdot 0 = 0$. La fausse paire passe toujours.
:::
:::

Le calcul de l'exercice vaut pour toute fausse paire. Sa clé égale la ligne $t$ quand $(q - t) + \beta\,(a - \varphi(t)) = 0$. Si $a \ne \varphi(t)$, une seule valeur de $\beta$ convient. Si $a = \varphi(t)$, alors $q \ne t$, puisque la paire n'est pas la ligne, et aucune valeur ne convient. Une fausse paire passe donc pour au plus 7 valeurs de $\beta$, une par ligne, soit une probabilité au plus $7/912\,673$.

Le défi $\beta$ doit être tiré après l'engagement de $q$ et $a$. Un tricheur qui le connaîtrait engagerait $a = 1$ et $q = -\beta$ : sa clé vaut $0$, la ligne de $t = 0$, alors que la paire $(-\beta, 1)$ n'est pas dans $T_\varphi$ dès que $\beta \ne -1$.

## Les multiplicités du réseau

Chaque table a son lookup, donc ses multiplicités, engagées en plans de bits.

:::exercice ★
Donnez les multiplicités de $T_\varphi$, dont les lignes vont de $t = -3$ à $t = 3$, et celles de $R_{32}$, pour l'exemple.

:::reponse
Les paires sont $(1, 1)$ deux fois, $(-1, 0)$ et $(2, 2)$. Pour $t = -3, \dots, 3$ : $m = (0, 0, 1, 0, 2, 1, 0)$.

Les marges sont $(1, 0, 0, 5)$ : $m_0 = 2$, $m_1 = 1$, $m_5 = 1$, et toutes les autres multiplicités de $R_{32}$ sont nulles.
:::
:::

:::exercice ★★
Calculez les clés et les multiplicités pour l'entrée $x = (0, 0, 0, 0)$. Combien de plans de bits faut-il par table pour que toute entrée ait des multiplicités écrivables ?

:::reponse
$h = 0$, donc $q = \lfloor 2/4 \rfloor = 0$ et $s = 2$ pour les quatre lignes. Puis $a = 0$, $y = 0$ et $c = 0$, la première position d'un maximum que les quatre classes atteignent, donc $\Delta = (0, 0, 0, 0)$. Dans chaque table, une seule ligne a la multiplicité 4 : la ligne 2 de $R_4$, la ligne $(0, 0)$ de $T_\varphi$ et la ligne 0 de $R_{32}$.

Chaque table reçoit 4 clés, donc une multiplicité vaut au plus 4, qui s'écrit $100$ en binaire. Il faut 3 plans par table. Le notebook parcourt les 256 entrées et trouve 4 comme plus grande multiplicité.
:::
:::

:::note
Pour $R_{32}$, trois plans permettent des multiplicités de somme $32 \times 7 = 224$, au-delà de 97, donc le compte $\sum_j 2^j \sum_t b_{j,t} = 4$ ne fixe la somme des multiplicités qu'à 97 près (le piège de [[lookups]]). Les sommes que le compte laisse passer sont celles qui valent 4 modulo 97 et au plus 224 : 4, 101 et 198. Un tricheur peut donc engager des multiplicités de somme 198. Le côté de la table a alors le degré 198 au lieu de 4, et la borne d'erreur passe de $3/912\,673$ à $198/912\,673$, environ une chance sur 4 600. Pour $R_4$ et $T_\varphi$, $4 \times 7 = 28$ et $7 \times 7 = 49$ restent sous 97.
:::

## Trois tables dans un seul lookup

Notre prouveur fait trois lookups, un par table, chacun avec son propre $\alpha$. On pourrait les réunir en un seul, avec un seul arbre de clés, un seul côté de table et un seul $\alpha$, en cherchant les 12 clés dans l'union des trois tables. FlashProve réunit ainsi jusqu'à 16 tables (`docs/format/11-1-machinery.md`, « A lookup »).

:::exercice ★★
Sans précaution, le lookup commun cherche les 12 clés dans l'union de $R_4$, des lignes $t + \beta \varphi(t)$ de $T_\varphi$, et de $R_{32}$.

1. Le prouveur qui tronque, au chapitre [[arrondir]], a le reste $s_1 = -1$. Cette clé est-elle dans l'union ?
2. Un prouveur annonce $q_0 = 0$ au lieu de 1, et $a_0 = \varphi(0) = 0$. Quel reste obtient-il, et passe-t-il ? Calculez la sortie $y$ et la classe qui en résultent.

:::reponse
1. Oui. La ligne $t = -1$ de $T_\varphi$ a $\varphi(-1) = 0$, donc sa clé vaut $-1 + \beta \cdot 0 = -1$, quel que soit $\beta$. Le reste $-1$, rangé comme 96, est une ligne de l'union.
2. Son reste vaut $s_0 = 5 + 2 - 4 \cdot 0 = 7$, qui est une ligne de $R_{32}$, donc il passe. Avec $a = (0, 0, 1, 2)$, la sortie vaut $y = W_2 a = (2, 2, 3, -2)$, et la classe devient $c = 2$ au lieu de 1. Ses marges $(0, 0, 0, 5)$ sont toutes dans $R_{32}$, et sa paire $(0, 0)$ est une ligne de $T_\varphi$ : le tricheur prouve une autre classe.
:::
:::

On sépare donc les tables. Le vérifieur tire un défi $\theta$, puis la table numéro $c$ (0 pour $R_4$, 1 pour $T_\varphi$, 2 pour $R_{32}$) a ses clés et ses lignes décalées de $c\,\theta$ :

| table | clé | lignes |
|---|---|---|
| $R_4$ | $s_i$ | $0, 1, 2, 3$ |
| $T_\varphi$ | $q_i + \beta a_i + \theta$ | $t + \beta \varphi(t) + \theta$ |
| $R_{32}$ | $\Delta_v + 2\theta$ | $r + 2\theta$, $r = 0, \dots, 31$ |

Une clé honnête et sa ligne sont décalées du même $c\,\theta$, donc elles restent égales.

:::exercice ★★
Avec le décalage, pour combien de valeurs de $\theta$ au plus le reste 7 du second tricheur est-il encore une ligne de l'union ?

:::reponse
Il n'est pas une ligne de $R_4$, qui n'est pas décalée. Il égale la ligne $r + 2\theta$ de $R_{32}$ quand $\theta = (7 - r)/2$ : une valeur de $\theta$ par ligne, donc 32 valeurs. Il égale la ligne $t + \beta\varphi(t) + \theta$ de $T_\varphi$ quand $\theta = 7 - t - \beta\varphi(t)$ : 7 valeurs. Au plus 39 valeurs de $\theta$ le laissent passer, soit une probabilité au plus $39/912\,673$ avec $\theta$ tiré dans $\E_{97}$. Le notebook en trouve 36 dans $\F_{97}$ pour $\beta = 5$, parce que certaines coïncident.
:::
:::

Le raisonnement vaut pour toute clé qui n'est pas dans sa propre table : une valeur de $\theta$ au plus par ligne des autres tables. FlashProve donne la même borne, le nombre de lignes de l'union divisé par $|\E|$ (`blocks/iop/lkp.h`, lignes 211 à 217). $\theta$ est tiré après que les clés sont fixées, et avant $\alpha$.

:::piege
**Le remplissage vaut une ligne, et s'écrit une seule fois.** Quand le nombre de clés n'est pas une puissance de 2, on complète l'arbre avec des clés de remplissage, qui doivent valoir une ligne de la table. FlashProve a accepté, dans ses propres tests, une clé qui n'était dans aucune ligne, quand le remplissage était décrit deux fois dans ses entrées publiques et que les deux descriptions ne concordaient pas (`lkp.h`, lignes 137 à 157). Le remplissage s'écrit donc une seule fois, avant le premier défi.
:::

## Ce que les lookups laissent

Les trois lookups du réseau se déroulent dans cet ordre :

1. Le prouveur s'engage sur les cellules $q$ et $a$, et sur les 9 plans de bits, 3 par table.
2. Le vérifieur tire $\beta$, puis un $\alpha$ par table.
3. Pour chaque table, le prouveur annonce les racines $Z$ et $G_0, G_1, G_2$, le vérifieur contrôle $Z = G_0\, G_1^2\, G_2^4$, et [[gkr]] prouve chaque racine.
4. Un zéro-test montre que les plans ne contiennent que des bits, et une affirmation linéaire sur les plans donne le compte $\sum_j 2^j \sum_t b_{j,t} = 4$.

À la fin, il reste des affirmations en des points tirés au hasard. Celle sur $\tilde s$ devient, comme dans l'exercice 2, deux affirmations, sur $\tilde h$ et sur $\tilde q$. Pour les marges, $\Delta_v = y_c - y_v - [v < c]$ donne de la même façon $\tilde\Delta(\rho) = y_c - \tilde y(\rho) - \tilde\iota(\rho)$, où le vecteur $\iota_v = [v < c]$ est public et où $y_c$ est la valeur de $\tilde y$ au coin $c$ du cube : ce sont deux affirmations sur $\tilde y$. Celle sur la clé de $T_\varphi$ vaut $\tilde q(\rho) + \beta\, \tilde a(\rho)$. Celles du côté de la table portent sur les plans. Les affirmations sur $\tilde h$ et $\tilde y$ vont aux sumchecks des produits du chapitre [[matrices]]. Celles sur $\tilde q$, $\tilde a$ et les plans portent sur des valeurs engagées, et le chapitre suivant, [[engager]], construit l'engagement qui y répond.

## Notre prouveur et FlashProve

| | notre réseau | FlashProve |
|---|---|---|
| clés | 12, en 3 lookups de 4 clés | un segment feed-forward : 8 tables dans un seul lookup, de $2^{26}$ à $2^{28}$ clés par table, $2^{30}$ places de clés en tout (format 11.2, « A worked example ») |
| plusieurs tables | un lookup et un $\alpha$ par table | les tables d'un segment dans un seul lookup, 16 au plus, décalées de $c\,\theta$ (format 11.1, « A lookup » ; `lkp.h`, lignes 211 à 217) |
| multiplicités | 3 plans par table | 32 plans (format 11.1, « A lookup ») |
| deux colonnes | $q + \beta a$, avec $\beta$ tiré au hasard | empaquetage sans défi : la ligne $t + 2^{28}(f(t) + \text{décalage})$ (format 11.1, « Public tables ») |
| produits | arbres de 4 clés, de profondeur 2 | arbres prouvés étage par étage, chaque étage un sumcheck de degré 2 suivi de `LINE` (format 11.1, « A product level ») |

FlashProve fait le même lookup en multipliant, avec des multiplicités en bits, mais il range les deux colonnes d'une table par la première idée de ce chapitre, en base $2^{28}$, sans défi $\beta$.

:::incertain
L'empaquetage n'est sûr que si les deux colonnes de la clé sont déjà bornées, comme $q + 3$ et $a$ devaient être des chiffres en base 8. Le dossier D2 (§3.3 et §5) relie cette borne au test de petitesse de FlashProve ([[test-petitesse]]), qui montre que les cellules sont petites. Aucune phrase de la source lue ne fait ce lien pour les tables empaquetées.
:::

## Quiz

:::quiz
1. Que prouve l'identité $\prod_i (\alpha - K_i) = \prod_t (\alpha - T_t)^{m_t}$ en un $\alpha$ tiré au hasard ?
2. Pourquoi les multiplicités sont-elles engagées en bits ?
3. Sur quoi porte l'affirmation que GKR laisse à la fin de l'arbre des clés ?
4. Pourquoi tirer $\beta$ après l'engagement de $q$ et $a$ ?
5. Que se passe-t-il si on réunit plusieurs tables dans un lookup sans les décaler ?
6. Le lookup de FlashProve est-il LogUp ?

:::reponse Réponses
1. Que les clés forment le multiensemble des lignes comptées avec leurs multiplicités, donc que chaque clé est une ligne, sauf avec une probabilité au plus $(N - 1)/|\E|$ quand la somme des multiplicités vaut $N$.
2. Parce que $(\alpha - T_t)^{m_t}$ a un exposant secret, que le vérifieur ne peut pas utiliser. En bits, le côté de la table devient $\prod_j G_j^{2^j}$, où chaque $G_j$ est un produit de feuilles $1 + b_{j,t}(\alpha - 1 - T_t)$, affines en les bits.
3. Sur l'extension multilinéaire des feuilles, donc des clés, en un point tiré au hasard.
4. Sinon le tricheur choisit une fausse paire dont la clé vaut une ligne pour ce $\beta$ (exercice 3).
5. Une clé d'une table peut passer pour une ligne d'une autre : le reste $-1$ passe pour une ligne de $T_\varphi$, et le reste 7 pour une ligne de $R_{32}$.
6. Non. LogUp somme des fractions $m_t/(\alpha - T_t)$ ; FlashProve multiplie, avec des multiplicités en bits (`lkp.h`, lignes 118 à 121).
:::
:::
