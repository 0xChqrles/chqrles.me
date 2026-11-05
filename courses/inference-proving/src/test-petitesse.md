---
id: test-petitesse
---
Les égalités qu'un prouveur montre tiennent modulo $p$. Pour qu'elles disent quelque chose des entiers, il faut savoir que les valeurs en jeu sont petites devant $p$ ([[entiers-signes]]). Dans un petit calcul, des tables bornent chaque valeur. FlashProve engage à chaque segment des matrices entières de cellules, et montrer chaque cellule dans une table ajouterait au [[lookups|lookup]] une clé par cellule. On cherche une borne sur toutes les cellules à la fois, payée par quelques combinaisons tirées au hasard.

On construit le test dans $\mathbb{F}_{97}$, sur une ligne de deux cellules. On combine d'abord les colonnes avec des coefficients $-1$, 0 ou 1 tirés au hasard, et on montre qu'une combinaison est petite en l'écrivant en chiffres. On cherche ensuite ce que prouve un test réussi : une borne deux fois plus large que la fenêtre, avec une erreur d'au plus $1/2$, et c'est ce calcul qui fixe la probabilité de 0. On répète le test pour réduire l'erreur, puis on voit pourquoi le tirage doit venir après l'engagement, et ce que FlashProve dit du statut de cet argument.

## Combiner les colonnes

Les cellules d'un segment forment une matrice d'entiers $Y$, sur laquelle le prouveur s'est engagé. Le vérifieur tire une matrice $\Theta$ qui a une entrée par colonne de $Y$ et par combinaison. Chaque entrée vaut $-1$, 0 ou 1, avec les probabilités $1/4$, $1/2$ et $1/4$ (`blocks/iop/rng.h:333`). Pour chaque ligne $r$ de $Y$ et chaque combinaison $u$, la combinaison des colonnes

$$\mathrm{comb}(r, u) = \sum_c \Theta[c][u]\; Y[r][c]$$

doit être dans une **fenêtre** $[-D, D)$. Le prouveur le montre en écrivant $\mathrm{comb} + D$ en chiffres, que contrôle un lookup : les chiffres n'existent que si la combinaison est dans la fenêtre. Chez FlashProve, $D = 2^{17}$, et $\mathrm{comb} + 2^{17}$ s'écrit avec un chiffre de 10 bits et un chiffre de 8 bits, contrôlés dans les tables de $2^{10}$ et $2^8$ lignes (format 11.1, « The array `ZZ` » et « The lookup on the digits »). Des égalités linéaires relient ces chiffres aux cellules engagées (format 11.1, « The equations »).

On prend un jouet : $p = 97$, une ligne de deux cellules $y = (y_0, y_1)$, une seule combinaison de coefficients $(\theta_0, \theta_1)$, et la fenêtre $[-4, 4)$. Le chiffre $\mathrm{comb} + 4$ doit alors être une ligne de la table $\{0, \dots, 7\}$.

:::exercice ★
Le prouveur honnête a des cellules petites, $y = (1, 2)$. Montrez qu'il passe pour toutes les valeurs de $(\theta_0, \theta_1)$.

:::reponse
$\theta_0 + 2\theta_1$ est compris entre $-3$ et 3, donc dans $[-4, 4)$, pour tout choix de $\theta_0, \theta_1 \in \{-1, 0, 1\}$.
:::
:::

:::exercice ★
Un tricheur engage $y = (1, 30)$. Listez les neuf couples $(\theta_0, \theta_1)$ et ceux qui passent. Avec quelle probabilité passe-t-il ?

:::reponse
Avec $\theta_1 = 0$, la combinaison vaut $\theta_0 \in \{-1, 0, 1\}$ : les trois couples $(\theta_0, 0)$ passent. Avec $\theta_1 = 1$, elle vaut 29, 30 ou 31 ; avec $\theta_1 = -1$, elle vaut $-31$, $-30$ ou $-29$, rangés 66, 67, 68 dans le corps. Aucune de ces six valeurs plus 4 n'est dans $\{0, \dots, 7\}$. Le tricheur passe donc exactement quand $\theta_1 = 0$, avec la probabilité $1/2$.
:::
:::

## Ce que prouve un test réussi

Le tricheur passe une fois sur deux. On cherche ce qu'un passage prouve en général sur une colonne, quelle que soit sa valeur. On fixe $\theta_0$ et on regarde quelles valeurs de $\theta_1$ passent.

:::exercice ★★
Montrez que si $\theta_1 = 0$ et $\theta_1 = 1$ passent tous deux pour le même $\theta_0$, alors $y_1$ est, dans le corps, un entier de $(-8, 8)$. Même question pour $\theta_1 = -1$ et $\theta_1 = 0$.

:::reponse
Les deux combinaisons $c_0 = \theta_0 y_0$ et $c_1 = \theta_0 y_0 + y_1$ sont, dans le corps, des entiers de $[-4, 4)$. Leur différence $y_1 = c_1 - c_0$ est donc un entier de $(-8, 8)$. Pour $\theta_1 = -1$ et $\theta_1 = 0$, de même, $y_1 = c_0 - c_{-1}$.
:::
:::

On dit qu'une colonne est **expliquée** si sa valeur dans le corps est un entier de $(-2D, 2D)$, ici $(-8, 8)$ (`rng.h:344-353`). D'après l'exercice 3, pour une colonne qui n'est pas expliquée, deux valeurs voisines de $\theta_1$ ne passent jamais ensemble. Les valeurs qui passent sont donc toutes dans $\{0\}$, ou toutes dans $\{-1, 1\}$. Le premier ensemble a la probabilité $1/2$, le second $1/4 + 1/4 = 1/2$. Quel que soit $\theta_0$, la colonne passe donc avec une probabilité d'au plus $1/2$.

:::exercice ★★
Si 0 avait la probabilité $1/3$, comme $-1$ et 1, quelle borne le même argument donnerait-il pour une combinaison ?

:::reponse
Les valeurs qui passent sont dans $\{0\}$, de probabilité $1/3$, ou dans $\{-1, 1\}$, de probabilité $2/3$. L'argument ne donne plus que $2/3$. Avec $1/2$ pour 0, les deux ensembles pèsent autant, et la borne $1/2$ est la meilleure que l'argument puisse donner.
:::
:::

C'est la raison de la loi de $\Theta$, que la source donne en ces termes : « that is why 0 has probability 1/2 » (`rng.h:344-353`).

Le test ne prouve donc pas la borne que respecte le prouveur honnête. Il prouve que chaque colonne est un entier de $(-2D, 2D)$, une borne deux fois plus large que la fenêtre. Avec plus de colonnes, l'argument est le même : on prend la première colonne qui n'est pas expliquée, fixée avant le tirage, on fixe toutes les autres entrées de $\Theta$, et la somme des autres termes joue le rôle de $\theta_0 y_0$ (`rng.h:344-353`). FlashProve conclut ainsi, avec $D = 2^{17}$ : pour chaque matrice, il existe une matrice d'entiers qui a les cellules engagées, chacun au-dessus de $-2^{18}$ et au-dessous de $2^{18}$, et « the bound is twice the offset $2^{17}$ » (format 11.1, « The purpose that the source states » ; `rng.h:8-11`). Une cellule honnête est un octet signé, bien plus petite.

## Répéter le test

Une combinaison laisse passer une colonne non expliquée une fois sur deux au plus. FlashProve tire $\tau$ combinaisons, et chacune doit passer. Elles utilisent des entrées disjointes de $\Theta$, donc elles sont indépendantes, et la probabilité de toutes les passer vaut au plus $2^{-\tau}$ (`rng.h:344-353`). FlashProve prend $\tau = 128$ (paper p.14, table 2 ; format 11.2, « A worked example »).

:::exercice ★
Que vaut l'erreur pour $\tau = 128$ ? Un prouveur honnête, dont les cellules sont des octets signés, combine $k$ colonnes : jusqu'à quel $k$ est-il sûr de rester dans la fenêtre $[-2^{17}, 2^{17})$ ? Au-delà, peut-il échouer ?

:::reponse
L'erreur vaut $2^{-128}$.

Une combinaison de $k$ octets signés avec des coefficients $-1$, 0, 1 vaut au plus $128k$ en valeur absolue, et elle atteint $+128k$ quand chaque cellule vaut $-128$ et chaque coefficient $-1$. Le haut de la fenêtre est $2^{17} - 1$, donc l'honnête est sûr de passer tant que $128k \le 2^{17} - 1$, soit $k \le 1\,023$.

Au-delà, une combinaison peut sortir de la fenêtre : elle n'a alors pas de chiffres, et « there is no honest proof with these sampled entries ». Une matrice de FlashProve peut avoir jusqu'à 8 191 colonnes (format 11.1, « Constants »). FlashProve compte la probabilité de cet échec dans l'erreur du masquage, et une condition sur ses constantes lie ce nombre de colonnes à la fenêtre pour que cette probabilité reste petite (format 11.1, « The honest prover » et « The relations among the constants »).
:::
:::

## Le tirage après l'engagement

Le vérifieur tire $\Theta$ après que le prouveur s'est engagé sur ses cellules.

:::exercice ★★
Dans le jouet, le prouveur connaît $(\theta_0, \theta_1) = (1, 1)$ avant de s'engager. Trouvez une ligne avec $y_1 = 30$ qui passe à coup sûr. Avec $\tau$ combinaisons connues d'avance et plus de $\tau$ colonnes, pourquoi peut-il toujours tricher ?

:::reponse
$y = (-30, 30)$ donne la combinaison $-30 + 30 = 0$, qui passe, alors que la colonne 30 n'est pas expliquée.

Avec $\tau$ combinaisons connues, les vecteurs $z$ tels que $\sum_c \Theta[c][u]\, z_c = 0$ pour tout $u$ forment les solutions de $\tau$ équations linéaires à plus de $\tau$ inconnues : il en existe un non nul. Tout multiple $\lambda z$ est aussi une solution, et en choisissant $\lambda$ on rend une entrée non nulle de $z$ aussi grande qu'on veut dans le corps. En ajoutant ce vecteur à une ligne honnête, le prouveur garde toutes ses combinaisons, donc il passe, avec des cellules qui ne sont plus petites.
:::
:::

La source le dit pour les lectures : « a prover that knows Theta can alter a read by a vector on which all N combinations vanish » (`rng.h:338-342`). Chez FlashProve, les cellules sont engagées par paquets de trois dans un élément du corps, $y_0 + 2^{20} y_1 + 2^{40} y_2$, et les affirmations du segment ne lisent les cellules qu'à travers des sommes partielles engagées dans un vecteur `U3` (format 11.1, « The cells, the arrays of the matrices, `U3` and `ZZ` »). Le tirage vient après les deux, et la même entrée de $\Theta$ sert à une colonne dans les paquets et dans les lectures (format 11.1, « Easy to get wrong », point 4).

## Le statut de l'argument

L'argument de cette page est celui des commentaires de `blocks/iop/rng.h`. FlashProve dit de lui qu'il a été « argued on paper for this project » et qu'il n'est « not refereed » (`rng.h:354-359`). Il cite pour la loi de $\Theta$ les travaux de Lyubashevsky, Nguyen et Seiler (ePrint 2020/1448, §2.7 et lemme A.1) et de Gentry, Halevi et Lyubashevsky (ePrint 2021/1397, lemme 3.4), et pour l'erreur $2^{-\tau}$ le lemme 2.5 du premier, dont son rapport technique dit l'avoir adapté (`rng.h:366-374`). Il précise que son argument n'a pas été comparé avec le lemme 3.4 du second travail (`rng.h:375-376`). Les programmes `cp_prove` et `cp_verify` n'utilisent pas `rng.h` : ils ont une seconde implémentation du test (`rng.h:20-21` ; format 11.1, « The purpose that the source states »).

:::piege
**Le test ne contrôle aucune cellule une à une.** Il contrôle des combinaisons de colonnes. Une colonne trop grande passe une combinaison une fois sur deux, et c'est la répétition sur $\tau = 128$ combinaisons qui rend l'erreur négligeable.
:::

:::piege
**La borne prouvée n'est pas celle de l'honnête.** Les cellules honnêtes sont des octets ; le test prouve seulement qu'elles sont sous $2^{18}$, deux fois la fenêtre. Les conditions de non-débordement du vérifieur partent de cette borne-là.
:::

:::piege
**Tirer $\Theta$ avant l'engagement casse le test.** Un prouveur qui connaît $\Theta$ ajoute à ses cellules un vecteur que toutes les combinaisons annulent (exercice 6).
:::
