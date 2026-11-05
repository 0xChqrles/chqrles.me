---
id: nombres
---
Le prouveur va additionner, multiplier, diviser et comparer des nombres. Ce chapitre montre d'abord pourquoi ni les nombres à virgule ni les entiers ne conviennent, puis il construit les nombres qu'on utilisera : les restes modulo un nombre premier. On calcule à la main modulo 97, et FlashProve calcule modulo $2^{64} - 2^{32} + 1$. On finit par ce que ces nombres oublient : le signe et la taille.

## Ce que le prouveur demande aux nombres

On part du reçu de [[prouver-sans-refaire|Prouver un calcul sans le refaire]], dont les prix, les quantités et le total sont des entiers. Les calculs du prouveur sur ces nombres posent trois exigences.

1. **L'égalité doit se tester exactement.** Chaque contrôle du cours se ramène à « ces deux nombres sont égaux » : le vérifieur calcule une valeur de son côté et la compare à celle que le prouveur annonce. Si deux calculs honnêtes du même nombre peuvent différer, le contrôle rejette des preuves justes.
2. **Un nombre doit avoir une taille fixe.** Un nombre qui tient dans un mot machine se range, s'envoie et se multiplie au même coût quelle que soit sa valeur.
3. **On doit pouvoir diviser par tout nombre non nul.** Le chapitre [[hasard|Vérifier au hasard]] retrouve un polynôme à partir de quelques-unes de ses valeurs, et la formule qui le fait divise par des différences de nombres.

## Les nombres à virgule

Un `float64` garde 53 bits significatifs, et le résultat de chaque opération est arrondi à la valeur représentable la plus proche. On cherche si la valeur d'une somme dépend alors de l'ordre dans lequel on additionne.

:::exercice ★
Dans un notebook, ou en raisonnant sur le binaire, calculez $(0{,}1 + 0{,}2) + 0{,}3$ et $0{,}1 + (0{,}2 + 0{,}3)$ en `float64`. Que vaut $(2^{53} + 1) - 2^{53}$ ?

:::reponse
La première somme donne `0.6000000000000001` et la seconde `0.6`.

$2^{53} + 1$ demande 54 bits significatifs, un de trop, donc il s'arrondit à $2^{53}$, et la différence vaut `0.0` au lieu de 1.
:::
:::

Deux ordres de la même somme donnent donc deux valeurs. Un prouveur et un vérifieur honnêtes qui n'additionnent pas dans le même ordre, par exemple parce que l'un répartit la somme entre plusieurs cœurs, obtiennent deux nombres différents, et le test d'égalité rejette une preuve juste. Les nombres à virgule ne remplissent pas la première exigence.

## Les entiers

Les opérations sur les entiers sont exactes, donc les entiers remplissent la première exigence. On regarde la deuxième : la taille d'une somme de produits.

:::exercice ★
Deux nombres de 32 bits valent au plus $2^{32} - 1$. Combien de bits faut-il pour leur produit ? Et pour la somme de deux tels produits ?

:::reponse
Le produit vaut au plus $(2^{32} - 1)^2 = 2^{64} - 2^{33} + 1$, qui est inférieur à $2^{64}$ : il tient dans 64 bits.

La somme de deux produits vaut au plus $2^{65} - 2^{34} + 2$, qui dépasse $2^{64}$ : il faut 65 bits. Chaque doublement du nombre de termes peut ajouter un bit.
:::
:::

Une somme de produits grandit donc avec le nombre de ses termes, et elle finit par ne plus tenir dans aucun mot de taille fixe. Dans le modèle que FlashProve prouve, la norme additionne les carrés d'une ligne de valeurs, et le modèle n'est défini que si cette somme reste inférieure à $2^{78}$ (`docs/model.md` §5 et §9, condition 1), une valeur qui ne tient pas dans 64 bits. Les entiers ne remplissent pas la deuxième exigence.

## Garder les 64 bits du bas

Un `u64` a une taille fixe : quand un résultat dépasse 64 bits, le processeur garde ses 64 bits du bas et oublie les autres. Garder les 64 bits du bas d'un nombre revient à garder le reste de sa division par $2^{64}$, donc un `u64` calcule **modulo $2^{64}$**. On écrit $a \equiv b \pmod{m}$ quand $a$ et $b$ ont le même reste dans la division par $m$.

L'addition et la multiplication restent exactes modulo $2^{64}$, parce que les 64 bits du bas d'une somme ou d'un produit ne dépendent que des 64 bits du bas des deux opérandes. On regarde la division : diviser par 2, c'est multiplier par un nombre $x$ tel que $2x \equiv 1$. On pose la question modulo 8, sur 3 bits, où tout se calcule à la main.

:::exercice ★★
Calculez $2x \bmod 8$ pour $x = 0, \dots, 7$. Existe-t-il un $x$ tel que $2x \equiv 1 \pmod 8$ ? Pourquoi ce qui arrive modulo 8 arrive aussi modulo $2^{64}$ ?

:::reponse
Les valeurs sont $0, 2, 4, 6, 0, 2, 4, 6$. Aucune ne vaut 1, donc aucun $x$ ne permet de diviser par 2. On voit aussi que $2 \times 4 \equiv 0$, alors qu'aucun des deux facteurs n'est nul.

Modulo $2^{64}$, $2x$ est pair pour tout $x$, et retirer un multiple de $2^{64}$ laisse un nombre pair. $2x \equiv 1$ est donc impossible, et $2 \times 2^{63} \equiv 0$.
:::
:::

Dans un `u64`, 2 n'a donc pas d'inverse, ni aucun nombre pair, et la troisième exigence n'est pas remplie.

## Modulo un nombre premier

L'obstacle de l'exercice est le facteur 2, commun au nombre qu'on veut inverser et au module $2^{64}$ : un multiple de 2 reste pair modulo $2^{64}$, donc il ne vaut jamais 1. Un module **premier** $p$ n'a de facteur commun avec aucun nombre de 1 à $p - 1$, et la page [[modulo|La réduction modulaire]] montre qu'alors tout nombre non nul a un inverse. Les restes $0, \dots, p - 1$, avec l'addition et la multiplication modulo $p$, forment un **corps fini**, noté $\F_p$.

Les trois exigences sont alors remplies. Les opérations modulo $p$ sont exactes et ne dépendent pas de l'ordre, donc l'égalité se teste. Un reste est inférieur à $p$, donc il a une taille fixe. Tout nombre non nul a un inverse, donc on peut diviser.

## Deux corps

Le cours utilise deux valeurs de $p$.

- $\F_{97}$, le **corps jouet**, sert au calcul à la main. Comme $100 = 97 + 3$, un nombre $100h + l$ se réduit en $3h + l$, ce qui se fait de tête. Les structures dont les chapitres suivants ont besoin existent déjà dans ce petit corps : des ensembles de 2, 4, 8, 16 et 32 points pour les codes du chapitre [[engager|S'engager sur les poids]], et un corps de $97^3$ éléments pour les défis du chapitre [[hasard|Vérifier au hasard]].
- **Goldilocks**, de module $p = 2^{64} - 2^{32} + 1$, est le corps de FlashProve. Un élément tient dans un mot de 64 bits, et la forme de $p$ permet de réduire un produit de 128 bits sans division ([[goldilocks]]).

Chaque exemple à la main se fait dans $\F_{97}$, et chaque comparaison avec FlashProve se fait dans Goldilocks.

## Le reçu dans $\F_{97}$

Le reçu a quatre lignes, de montants $5 \times 27 = 135$, $7 \times 9 = 63$, $11 \times 3 = 33$ et $13 \times 1 = 13$, et son total vaut 244. On refait ce total dans $\F_{97}$. Comme les opérations passent aux restes ([[modulo]]), on peut réduire après chaque ligne.

:::exercice ★
Calculez les totaux du reçu modulo 97, ligne par ligne, en réduisant après chaque ligne.

:::reponse
$135 = 97 + 38$, donc le premier total vaut 38. Puis $38 + 63 = 101 \equiv 4$, puis $4 + 33 = 37$, puis $37 + 13 = 50$.

On retrouve le reste de 244, puisque $244 = 2 \times 97 + 50$.
:::
:::

Dans $\F_{97}$, le total du reçu vaut donc 50, et le corps ne distingue pas 244 de 50, puisque les deux ont le même reste.

:::exercice ★
Donnez tous les entiers entre $-200$ et $400$ que $\F_{97}$ ne distingue pas de 244.

:::reponse
Ce sont les entiers $50 + 97k$ : $-144$, $-47$, $50$, $147$, $244$ et $341$.
:::
:::

Un prouveur qui annonce 147 au lieu de 244 passe donc tout contrôle fait dans $\F_{97}$, puisque ces deux totaux sont le même élément du corps. Une égalité dans le corps ne redevient une égalité entre entiers que si l'on sait les nombres assez petits. La page [[entiers-signes|Les entiers dans le corps]] établit cette condition, et les chapitres [[arrondir|Arrondir et comparer]] et [[tables|Les tables]] construisent les preuves qu'un nombre est petit.

:::piege
Le corps n'arrondit pas. Un arrondi confond des nombres proches, alors que le corps confond 244 et 147, qui sont loin l'un de l'autre, et distingue 244 de 245. Il identifie exactement les entiers qui diffèrent d'un multiple de 97.
:::

## Notre prouveur et FlashProve

Les deux font les mêmes opérations, dans deux corps de tailles très différentes :

| | notre prouveur | FlashProve |
|---|---|---|
| corps | $\F_{97}$ | Goldilocks, $p = 2^{64} - 2^{32} + 1$, le seul corps des programmes publiés (`blocks/README.md`, règle 2 ; `docs/format/FORMAT.md` R1.2) |
| taille d'un élément | 7 bits | 8 octets, petit-boutiste ; un mot qui n'est pas inférieur à $p$ est rejeté (FORMAT R1.1 et R1.3) |
| réduction d'un produit | à la main, avec $100 \equiv 3$ | `reduce128`, sans division (`blocks/field/gl64.h`, lignes 75-83) |
| ensembles de $2^a$ points pour les codes | jusqu'à $2^5 = 32$ | jusqu'à $2^{32}$ (`gl64.h`, ligne 30) |

## La suite

On sait maintenant calculer exactement sur des nombres de taille fixe, et on sait ce que ces nombres oublient. Le chapitre [[hasard|Vérifier au hasard]] calcule dans $\F_{97}$ pour contrôler un calcul en un point tiré au hasard, sans le refaire.

:::quiz
1. Pourquoi le prouveur ne calcule-t-il pas avec des `float64` ?
2. Pourquoi pas avec des `u64` qui débordent ?
3. Que vaut 100 dans $\F_{97}$ ?
4. Qu'apporte à FlashProve la forme $2^{64} - 2^{32} + 1$ de son module ?
5. Dans $\F_{97}$, $3 \times 30 = 90$. Quel entier le représentant centré ([[entiers-signes]]) lit-il, et pourquoi est-ce faux ?

:::reponse Réponses
1. L'addition n'y est pas associative : deux ordres de la même somme donnent deux valeurs, donc l'égalité ne se teste pas.
2. On calcule alors modulo $2^{64}$, où 2 n'a pas d'inverse.
3. 3, puisque $100 = 97 + 3$.
4. Un élément tient dans un mot de 64 bits, et $2^{64} \equiv 2^{32} - 1$ permet de réduire un produit sans division ([[goldilocks]]).
5. $90 - 97 = -7$. Le produit des entiers 3 et 30 vaut 90, qui n'est pas dans $[-48, 48]$, donc sa lecture centrée ne redonne pas l'entier.
:::
:::
