---
id: prouver-sans-refaire
---
Ce cours construit un **prouveur**, un programme qui produit la preuve qu'un calcul a été fait correctement, et il s'arrête quand ce prouveur établit qu'un petit réseau de neurones à nombres entiers a bien donné sa sortie. On le construit sur papier : chaque pièce se dérive avec un stylo et un cahier, et un notebook Python, facultatif, permet de vérifier un calcul. Ce chapitre pose ce but, donne le chemin complet pour l'atteindre, puis écrit le premier calcul qu'on prouvera, le total d'un reçu de quatre lignes.

## Le but du cours

Quand on interroge un modèle sur un serveur, on reçoit du texte. Ce texte n'indique pas quel modèle a tourné, ni s'il a tourné jusqu'au bout, ni si une ligne de code a réécrit sa réponse avant l'envoi. Pour le contrôler directement, il faudrait refaire le calcul, ce qui demande les **poids** du modèle, les nombres fixés par son entraînement, et tout le temps de calcul une seconde fois.

On cherche donc une autre façon de contrôler. La machine qui calcule produit en plus un objet appelé **preuve**, et un second programme, le **vérifieur**, accepte ou rejette cette preuve. Pour que ce contrôle vaille mieux que refaire le calcul, il faut trois choses. Le vérifieur doit lire beaucoup moins de données que le calcul n'en manipule. Il doit pouvoir travailler sans les poids, à partir d'une empreinte qui les désigne. Si le calcul annoncé est faux, il doit rejeter la preuve, sauf avec une probabilité qu'on sait chiffrer.

Une preuve établit que le calcul annoncé a été fait, et elle ne dit pas que la réponse est vraie : un modèle qui répond Londres quand on lui demande la capitale de la France peut recevoir une preuve aussi valide qu'un modèle qui répond Paris.

FlashProve, le système à source ouverte qu'Anthropic a publié, résout ce problème à grande échelle : il prouve des passages d'un modèle à nombres entiers qui a la forme de Llama 4 Maverick, 48 couches et 128 experts sur une fenêtre de 1 024 tokens (`guide/terms.md`, « Full size »). Notre prouveur suit les mêmes idées sur un réseau qu'on calcule à la main, donc chaque chapitre finit par une comparaison entre les deux.

Une preuve porte sur les poids que désigne l'empreinte, quels qu'ils soient, et la documentation de FlashProve le précise : un fournisseur peut choisir n'importe quel modèle et en publier l'empreinte, et une preuve acceptée ne montre pas qu'il a choisi le modèle annoncé (`docs/protocol.md` §3 ; `guide/how-it-works.md`, « What a proof says »).

## Le parcours

Le cours se lit dans l'ordre, sur plusieurs jours. Chaque chapitre dit d'abord ce qu'il fait et pourquoi, et il finit par ce qui marche, ce qui manque et ce qui vient ensuite. On le lit en travaillant : chaque page donne des exercices à faire avant de lire la suite, avec la réponse dans un bloc qu'on déplie, et chaque chapitre finit par un court quiz.

Le prouveur se construit dans cet ordre, parce que chaque étape utilise la précédente :

1. Ce chapitre fixe le but et écrit le reçu.
2. [[nombres|Les nombres]]. Le prouveur additionne, multiplie et divise, et il lui faut des résultats exacts sur des nombres de taille fixe, donc on calcule dans un corps fini : $\mathbb{F}_{97}$ à la main, Goldilocks dans FlashProve.
3. [[hasard|Vérifier au hasard]]. Un point tiré au hasard suffit à distinguer deux calculs différents, sauf avec une probabilité qu'on sait chiffrer, et c'est l'idée de tout le reste.
4. [[sommes|Les sommes]]. Le total du reçu est une somme de produits, et le sumcheck la vérifie en lisant une seule combinaison des valeurs de chaque colonne.
5. [[matrices|Les produits de matrices]]. On quitte le reçu pour le réseau, dont chaque couche est un produit de matrices, et on le vérifie sans jamais écrire le produit.
6. [[arrondir|Arrondir et comparer]]. Le réseau arrondit et choisit un maximum, et une équation ne sait dire ni « plus petit que » ni « le plus grand », donc on ramène tout à « cette valeur est dans cette table ».
7. [[tables|Les tables]]. On prouve qu'une liste de valeurs est dans une table sans que le vérifieur lise ces valeurs.
8. [[engager|S'engager sur les poids]]. Le vérifieur n'a pas les poids, donc le prouveur s'engage sur eux par une racine, et chaque lecture du vérifieur se relie à cette racine.
9. [[proximite|Le test de proximité]]. Le prouveur pourrait s'engager sur des données qui ne désignent aucun vrai tableau de poids, et ce test le détecte en lisant peu.
10. [[prouveur-complet|Le prouveur complet]]. On remplace le vérifieur par une chaîne de hachage, on assemble toutes les pièces sur le réseau et on compte en bits la probabilité d'accepter une fausse preuve.
11. [[cacher|Cacher les poids]]. La preuve construite jusque-là laisse lire des combinaisons des poids, donc on ajoute ce qu'il faut pour qu'elle n'apprenne rien au vérifieur.
12. [[flashprove-modele|FlashProve : le modèle]]. On lit comment FlashProve écrit Llama 4 Maverick avec des entiers et comment il prouve l'attention.
13. [[flashprove-lots|FlashProve : les lots]]. On lit comment il prouve beaucoup de requêtes avec une seule ouverture des poids, et ce que cela coûte.
14. [[ce-que-dit-une-preuve|Ce que dit une preuve]]. On lit ce que FlashProve démontre, ce qu'il ne démontre pas, et ce qu'un client doit vérifier lui-même.

Chaque notion a aussi sa propre page, sans le reçu ni le fil du cours, avec la liste de ce qu'il faut savoir avant. La [carte](#accueil) relie ces pages, donc on peut aller directement à ce qui intéresse, par exemple [[goldilocks]].

## Pourquoi commencer par un reçu

Notre prouveur doit finir sur un réseau de neurones, mais même un petit réseau demande déjà des dizaines de nombres par étape, alors que chaque idée du prouveur se comprend mieux quand on peut suivre chaque nombre. On construit donc d'abord le prouveur sur un calcul qui tient sur une page, le total d'un reçu, qui ne demande qu'une multiplication et une addition par ligne. Ce total est une somme de produits, et chaque valeur que calcule une couche du réseau est aussi une somme de produits, d'une entrée par un poids.

Ce calcul n'a pas besoin de preuve, puisque additionner quatre lignes coûte moins cher que vérifier une preuve. Une preuve ne devient rentable que sur un long calcul, et on mesurera ce seuil sur notre prouveur.

## Le reçu

Le reçu a quatre lignes. La ligne $i$ porte un prix $p_i$ et une quantité $q_i$, et son montant est leur produit $p_i q_i$ :

| ligne | prix | quantité | montant | calcul |
|---:|---:|---:|---:|---|
| 0 | 5 | 27 | 135 | $5 \times 27$ |
| 1 | 7 | 9 | 63 | $7 \times 9$ |
| 2 | 11 | 3 | 33 | $11 \times 3$ |
| 3 | 13 | 1 | 13 | $13 \times 1$ |

Le total est la somme des montants :

$$\sum_{i=0}^{3} p_i q_i = 135 + 63 + 33 + 13 = 244$$

Il reste à dire ce que le prouveur affirme. La phrase qu'il défend s'appelle l'**énoncé**, et le plus simple serait « le total vaut 244 ».

:::exercice ★
Trouvez un reçu de deux lignes, avec des prix et des quantités entre 1 et 20, dont le total vaut aussi 244. Qu'est-ce que cela dit de l'énoncé « le total vaut 244 » ?

:::reponse
Par exemple $12 \times 20 + 4 \times 1 = 240 + 4 = 244$, ou $10 \times 20 + 11 \times 4 = 200 + 44 = 244$. Il y en a beaucoup : le notebook du chapitre en compte 482, ou 241 si l'on ne distingue pas l'ordre des deux lignes.

L'énoncé « le total vaut 244 » est vrai pour chacun de ces reçus, donc il ne désigne pas le nôtre. Pour parler de notre reçu, l'énoncé doit aussi nommer ses données.
:::
:::

Cet énoncé vaut pour n'importe quel reçu de total 244, par exemple une seule ligne de prix 244 et de quantité 1, donc il ne dit rien de notre reçu.

Donner tout le reçu au vérifieur fixerait ses valeurs, mais le vérifieur lirait alors une liste aussi longue que le calcul, ce qui contredit la première de nos trois exigences.

Il faut donc désigner le reçu sans l'envoyer. On calcule pour ça une **racine**, une empreinte de 32 octets obtenue en hachant les prix et les quantités, et le vérifieur reçoit seulement cette racine, $R$. Une seule valeur changée donne une autre racine, donc $R$ désigne un seul reçu. L'énoncé devient :

> Le reçu de racine $R$ a pour total 244.

Le chapitre [[engager|S'engager]] construit cette racine avec un [[merkle|arbre de Merkle]], qui permet aussi d'ouvrir une valeur à la fois.

:::piege
Une racine ne contient pas le reçu : elle a 32 octets quelle que soit la longueur du reçu. Elle le désigne, parce que d'autres valeurs donneraient une autre racine. Le vérifieur ne lit donc jamais le reçu entier, seulement les valeurs que le prouveur lui ouvre.
:::

:::exercice ★★
Le vérifieur sait que chaque prix et chaque quantité de notre reçu est un entier entre 1 et 30, et il connaît la fonction de hachage qui donne $R$. Combien de reçus de quatre lignes sont possibles ? Comment peut-il retrouver notre reçu à partir de $R$ seule ?

:::reponse
Une ligne a 30 prix et 30 quantités possibles, soit $30^2 = 900$ lignes possibles, et quatre lignes donnent

$$900^4 = 30^8 = 656\,100\,000\,000$$

reçus possibles. Le vérifieur hache chacun d'eux et compare le résultat à $R$. Une seule valeur changée donne une autre racine, donc le seul reçu qui donne $R$ est le nôtre, et la recherche le trouve en au plus $30^8$ hachages.

Une racine désigne donc le reçu sans le cacher quand ses valeurs possibles sont peu nombreuses. Le notebook fait cette recherche sur les quantités, les prix étant connus, en $30^4 = 810\,000$ essais au plus, et il en déduit la durée des $30^8$ essais sur votre machine. Le chapitre [[cacher|Cacher les poids]] ajoute aux valeurs, avant de les hacher, des octets tirés au hasard, un **sel**, que la recherche devrait deviner aussi.
:::
:::

Les quantités 27, 9, 3 et 1 sont des puissances de 3, ce qui permet de simplifier le calcul.

:::exercice ★★
Retrouvez 244 en ne gardant qu'une seule valeur d'une ligne à l'autre, avec les prix et le nombre 3 pour seules données.

:::reponse
Quand on lit 312 chiffre après chiffre, on garde 3, puis $3 \times 10 + 1 = 31$, puis $31 \times 10 + 2 = 312$. À chaque chiffre, on multiplie par 10 ce qu'on a déjà et on ajoute ce chiffre.

Notre total a la même forme, avec 3 à la place de 10 :

$$5 \times 27 + 7 \times 9 + 11 \times 3 + 13 = 3 \times (3 \times (3 \times 5 + 7) + 11) + 13$$

En calculant les parenthèses de l'intérieur vers l'extérieur, la valeur gardée vaut 5, puis $3 \times 5 + 7 = 22$, puis $3 \times 22 + 11 = 77$, puis $3 \times 77 + 13 = 244$.

Cette boucle s'appelle l'[[horner|algorithme de Horner]]. Elle supprime la colonne des quantités, et on s'en resservira pour regrouper plusieurs affirmations en une seule, au chapitre [[hasard|Vérifier au hasard]].
:::
:::

## Ce que le vérifieur a en main

Le prouveur a tout le tableau, alors que le vérifieur n'a que la racine, le total annoncé et la preuve.

:::figure Le prouveur connaît toutes les cases. Le vérifieur connaît $R$ et 244, reçoit la preuve, et ne lit pas le tableau.
<svg viewBox="0 0 470 208" role="img" aria-label="À gauche, le prouveur a le reçu complet : prix 5, 7, 11, 13, quantités 27, 9, 3, 1, montants 135, 63, 33, 13, et sous les montants leur total 244. Les prix et les quantités sont fixés par la racine R. À droite, le vérifieur a seulement R, le total annoncé 244 et la preuve que le prouveur lui envoie."><text x="0" y="14" class="b">prouveur</text><text x="40" y="36" class="m s mid">prix</text><text x="110" y="36" class="m s mid">quantité</text><text x="186" y="36" class="m s mid">montant</text><rect x="12" y="44" width="56" height="26" class="dim"/><text x="40" y="62" class="mid">5</text><rect x="82" y="44" width="56" height="26" class="dim"/><text x="110" y="62" class="mid">27</text><rect x="158" y="44" width="56" height="26" class="box"/><text x="186" y="62" class="b mid">135</text><rect x="12" y="74" width="56" height="26" class="dim"/><text x="40" y="92" class="mid">7</text><rect x="82" y="74" width="56" height="26" class="dim"/><text x="110" y="92" class="mid">9</text><rect x="158" y="74" width="56" height="26" class="box"/><text x="186" y="92" class="b mid">63</text><rect x="12" y="104" width="56" height="26" class="dim"/><text x="40" y="122" class="mid">11</text><rect x="82" y="104" width="56" height="26" class="dim"/><text x="110" y="122" class="mid">3</text><rect x="158" y="104" width="56" height="26" class="box"/><text x="186" y="122" class="b mid">33</text><rect x="12" y="134" width="56" height="26" class="dim"/><text x="40" y="152" class="mid">13</text><rect x="82" y="134" width="56" height="26" class="dim"/><text x="110" y="152" class="mid">1</text><rect x="158" y="134" width="56" height="26" class="box"/><text x="186" y="152" class="b mid">13</text><line x1="158" y1="165" x2="214" y2="165" class="lm"/><rect x="158" y="170" width="56" height="26" class="ring"/><text x="186" y="188" class="b mid">244</text><text x="220" y="188" class="m s">total</text><path d="M 12 168 v 6 H 138 v -6" class="lm"/><text x="75" y="192" class="m s mid">fixés par la racine R</text><text x="300" y="14" class="b">vérifieur</text><rect x="300" y="44" width="170" height="30" class="box"/><text x="385" y="64" class="mid">racine R</text><rect x="300" y="84" width="170" height="30" class="ring"/><text x="385" y="104" class="mid">total annoncé : 244</text><rect x="300" y="134" width="170" height="30" class="hot"/><text x="385" y="154" class="o mid">preuve</text><line x1="218" y1="149" x2="297" y2="149" class="lc" marker-end="url(#fac)"/><text x="257" y="141" class="c s mid">envoie</text></svg>
:::

:::exercice ★
Si le vérifieur refaisait le calcul, combien de nombres lirait-il, et combien de multiplications et d'additions ferait-il ? Donnez ces comptes pour notre reçu, puis pour un reçu de $n$ lignes, et comparez-les à ce qu'il a en main.

:::reponse
Pour notre reçu, il lirait les 4 prix et les 4 quantités, soit 8 nombres, puis il ferait 4 multiplications, une par ligne, et 3 additions pour sommer les 4 montants.

Pour $n$ lignes, il lirait $2n$ nombres et ferait $n$ multiplications et $n - 1$ additions. Ces comptes grandissent avec $n$, alors que la racine $R$ garde ses 32 octets et que le total annoncé reste un seul nombre : de ce qu'il a en main, seule la preuve peut dépendre de $n$.

Sur quatre lignes, il n'y gagne rien, puisqu'il doit encore lire et vérifier la preuve, qui coûte plus cher que les 8 nombres et les 7 opérations. Le cours cherche donc une preuve dont la vérification grandit beaucoup moins vite que $n$, pour qu'elle coûte moins cher que le calcul refait quand $n$ est grand.
:::
:::

Le prouveur peut mentir de trois façons, et le reste du cours rend chacune détectable :

1. Un total faux. Le reçu est juste, mais le prouveur annonce 245.
2. Un autre reçu. Le prouveur calcule sur un reçu de total 244, par exemple la ligne unique de prix 244, dont la racine n'est pas $R$.
3. Une racine qui ne désigne aucun reçu. À partir du chapitre [[engager|S'engager]], le prouveur ne hache pas le reçu tel quel, mais une version allongée dont chaque case dépend de toutes ses valeurs, pour que le vérifieur puisse n'en lire que quelques cases. Il peut alors hacher des cases qui ne sont la version allongée d'aucun reçu, puis répondre à une question comme pour un reçu et à la suivante comme pour un autre.

:::exercice ★★
Pour chaque mensonge, dites ce que le vérifieur devrait pouvoir faire pour le détecter, sans lire le reçu.

:::reponse
1. Un total faux. Un test qui ne touche pas aux données ne distingue pas 244 de 245, donc le vérifieur doit relier le total annoncé aux valeurs du reçu par quelques lectures.
2. Un autre reçu. Le test du point 1 passe si le prouveur répond avec les valeurs d'un autre reçu de total 244, donc le vérifieur doit pouvoir contrôler que chaque valeur lue appartient aux données de racine $R$.
3. Une racine qui ne désigne aucun reçu. Si les cases sous $R$ ne sont la version allongée d'aucun reçu, aucun reçu n'est « le vrai », et le prouveur choisit à chaque question celui qui fait passer le test. Le vérifieur doit donc s'assurer, en lisant quelques cases, que les données sous $R$ sont la version allongée d'un seul reçu.

Ce sont trois contrôles distincts : réussir l'un ne garantit pas les autres.
:::
:::

Chacun de ces contrôles a son chapitre. Le chapitre [[sommes|Les sommes]] relie le total annoncé au reçu en lisant une seule combinaison des valeurs de chaque colonne, au lieu des quatre lignes. Le chapitre [[engager|S'engager]] relie chaque valeur lue à la racine. Le chapitre [[proximite|Le test de proximité]] contrôle, en lisant peu de cases, que les données sous la racine sont la version allongée d'un seul reçu.

## Le notebook

Le notebook du chapitre, `course/notebooks/01-prouver-sans-refaire.py`, commence par ce calcul. Il est facultatif : il sert à vérifier une réponse, pas à la trouver. `total` renvoie la somme des montants et `horner` renvoie les valeurs gardées de l'exercice 3.

:::code course/notebooks/01-prouver-sans-refaire.py · total, horner
```python
def total(prix, quantites):
    return sum(p * q for p, q in zip(prix, quantites))

def horner(prix, t):
    acc, gardes = 0, []
    for p in prix:
        acc = acc * t + p
        gardes.append(acc)
    return gardes
```
:::

Sur notre reçu, `total` renvoie 244 et `horner(prix, 3)` renvoie `[5, 22, 77, 244]`. Ce code calcule le nombre que le prouveur devra défendre, et il ne prouve encore rien.

## Notre prouveur et FlashProve

FlashProve prouve le même genre d'énoncé, avec des données fixées par une empreinte, un calcul et un résultat annoncé :

| | notre reçu | FlashProve |
|---|---|---|
| Calcul | le total de 4 lignes | un passage du modèle à nombres entiers de la forme de Llama 4 Maverick, sur une fenêtre de 1 024 tokens |
| Données fixées par une empreinte | les prix et les quantités, sous la racine $R$ | 400,7 milliards de poids, sous un identifiant d'engagement de 64 chiffres hexadécimaux |
| Résultat annoncé | 244 | des tokens de sortie ; sous la politique exact match, chacun est le premier choix du modèle à sa position |
| Taille de la preuve | pas encore de preuve | 18,74 à 18,81 Mo |
| Temps du vérifieur | pas encore de vérifieur | 21,14 s sur un seul fil d'exécution (`cp_verify`) |

Les valeurs de FlashProve viennent de `guide/terms.md` (« Full size »), de son article (p. 46, §7.8) pour le nombre de poids, de `guide/how-it-works.md` (« The files » et « The two acceptance policies ») et de `docs/figures.tsv` (lignes `proof-size` et `verify-time`). La taille et le temps ont été mesurés sur des preuves qui contrôlent chacune un seul token, celui qui suit le texte envoyé (`guide/performance.md`).

## La suite

On a un but, un chemin, un énoncé et le nombre que le prouveur doit défendre. Il manque la preuve elle-même, puisque le vérifieur ne peut encore détecter aucun des trois mensonges.

Le chapitre suivant commence par les nombres. Le prouveur va évaluer des polynômes en des points tirés au hasard et diviser par des nombres quelconques, ce qui demande des résultats exacts sur des nombres de taille fixe, alors qu'un entier grandit sans limite et qu'un nombre à virgule arrondit. On calcule donc dans un corps fini, et le reçu passe des entiers aux éléments de ce corps.

:::quiz
1. Une preuve acceptée montre-t-elle que la réponse du modèle est vraie ?
2. Pourquoi l'énoncé doit-il contenir la racine $R$ ?
3. Quelles sont les trois exigences d'une preuve utile ?
4. Un reçu a les prix 4, 0, 1 et 2 et les quantités 8, 4, 2 et 1. Avec quel nombre $t$ la boucle de Horner calcule-t-elle son total, et quelles valeurs garde-t-elle ?
5. Vrai ou faux : FlashProve prouve que le fournisseur a utilisé le modèle annoncé.
6. Le prouveur répond avec les valeurs d'un reçu juste de total 244, qui n'est pas celui de racine $R$. Quel mensonge est-ce, et quel contrôle le détecte ?

:::reponse Réponses
1. Non. Elle montre que le calcul annoncé a été fait sur les données désignées, et un modèle qui répond Londres peut recevoir une preuve aussi valide qu'un modèle qui répond Paris.
2. Sans elle, « le total vaut 244 » vaut pour tout reçu de total 244 (exercice 1), donc l'énoncé ne désigne pas notre reçu.
3. Le vérifieur lit beaucoup moins de données que le calcul n'en manipule ; il travaille sans les poids, à partir d'une empreinte qui les désigne ; il rejette un calcul faux, sauf avec une probabilité qu'on sait chiffrer.
4. Les quantités sont $2^3$, $2^2$, $2$ et $1$, donc $t = 2$. La boucle garde 4, puis $2 \times 4 + 0 = 8$, puis $2 \times 8 + 1 = 17$, puis $2 \times 17 + 2 = 36$, et le total vaut aussi $4 \times 8 + 0 \times 4 + 1 \times 2 + 2 \times 1 = 36$.
5. Faux. Il prouve un calcul sur les poids que désigne l'empreinte, quels qu'ils soient, et un fournisseur peut choisir n'importe quel modèle (`docs/protocol.md` §3).
6. Un autre reçu. Le vérifieur le détecte en contrôlant que chaque valeur lue appartient aux données de racine $R$, ce que construit le chapitre [[engager|S'engager]].
:::
:::
