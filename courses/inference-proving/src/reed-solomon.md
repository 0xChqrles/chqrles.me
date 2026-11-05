---
id: reed-solomon
---
On veut transformer un message de $\ell$ nombres en un mot de $n > \ell$ nombres, de sorte que deux messages différents donnent deux mots différents en presque toutes les positions. Un vérifieur qui ne lit que quelques positions d'un mot verra alors presque toujours une différence entre deux messages, même s'ils ne diffèrent que d'un nombre.

On montre d'abord pourquoi recopier le message ne suffit pas. On encode ensuite par évaluation d'un polynôme, et on compte en combien de positions deux mots peuvent coïncider : c'est la distance du code. On définit le rendement, on montre que l'encodage est linéaire, puis on retrouve un message à partir de quelques symboles et on détecte un mot faux. La page finit par la queue aléatoire que FlashProve ajoute au message.

## Recopier ne suffit pas

La méthode la plus simple allonge le message en le recopiant : le message $(5, 1)$ devient le mot $(5, 1, 5, 1, 5, 1, 5, 1)$. Deux messages qui diffèrent en une seule entrée donnent alors deux mots qui diffèrent en 4 positions sur 8, toujours les mêmes. Un vérifieur qui lit une position au hasard ne voit la différence qu'une fois sur deux, et avec un message de $\ell$ entrées, une fois sur $\ell$.

Le défaut vient du fait que chaque position du mot dépend d'une seule entrée du message. On cherche donc un encodage où **chaque position dépend de toutes les entrées**.

## Encoder par évaluation

On prend les entrées du message comme coefficients d'un [[polynomes|polynôme]] :

$$P_m(X) = m_0 + m_1 X + \dots + m_{\ell-1} X^{\ell-1}$$

Le mot est la liste des valeurs de $P_m$ aux $n$ points du [[domaine]] $D = 7 \cdot H_n$, rangés dans l'ordre des positions :

$$\Enc(m) = \big(P_m(z_x)\big)_{x < n}$$

Chaque valeur $P_m(z_x)$ s'appelle un **symbole** du mot, et l'ensemble des mots $\Enc(m)$ forme le **code de Reed-Solomon** de longueur $n$ et de dimension $\ell$. Chaque symbole dépend de toutes les entrées du message, puisque chaque $m_j$ y entre avec le coefficient $z_x^j$, qui n'est jamais nul.

:::exercice ★
Encodez le message $(5, 1)$ sur $D_8 = (7, 90, 40, 57, 38, 59, 37, 60)$.
:::reponse
$P_m(X) = 5 + X$, donc chaque symbole vaut $5 + z_x$ :

$$\Enc(5, 1) = (12, 95, 45, 62, 43, 64, 42, 65)$$

En position 1, $5 + 90 = 95$ ; en position 3, $5 + 57 = 62$.
:::
:::

## La distance

On cherche en combien de positions deux mots $\Enc(m)$ et $\Enc(m')$, avec $m \neq m'$, peuvent coïncider. Ils coïncident en $z_x$ quand $P_m(z_x) = P_{m'}(z_x)$, c'est-à-dire quand $z_x$ est une racine de la différence :

$$P_m(X) - P_{m'}(X) = P_{m - m'}(X)$$

Ce polynôme n'est pas nul, puisque $m \neq m'$, et son degré est au plus $\ell - 1$. Il a donc au plus $\ell - 1$ racines ([[polynomes]]), et les deux mots coïncident en au plus $\ell - 1$ positions. Ils diffèrent donc en au moins

$$d = n - \ell + 1$$

positions. Ce nombre s'appelle la **distance minimale** du code. La distance compte des positions : en position 3, les symboles 62 et 63 diffèrent autant que 62 et 0.

Avec $\ell = 2$ et $n = 8$, $d = 7$ : deux messages différents donnent des mots qui coïncident en une position au plus. Les mots $\Enc(5, 1) = (12, 95, 45, 62, 43, 64, 42, 65)$ et $\Enc(3, 4) = (31, 72, 66, 37, 58, 45, 54, 49)$ diffèrent même en toutes les 8 positions.

:::exercice ★★
Avec $\ell = 4$ et $n = 8$, que vaut la distance minimale ? Construisez deux messages dont les mots ne diffèrent qu'en ce nombre de positions. Indication : choisissez la différence $P_{m'} - P_m$ pour qu'elle s'annule en trois points du domaine.
:::reponse
$d = 8 - 4 + 1 = 5$. Pour que les mots coïncident aux positions 0, 2 et 4, de points 7, 40 et 38, on prend pour différence le polynôme de degré 3 qui s'annule en ces trois points :

$$(X - 7)(X - 40)(X - 38) \equiv 30 + 29X + 12X^2 + X^3$$

Avec $m = (1, 2, 3, 4)$, le message $m' = m + (30, 29, 12, 1) = (31, 31, 15, 5)$ convient : les deux mots coïncident aux positions 0, 2 et 4 et diffèrent aux positions 1, 3, 5, 6 et 7, soit 5 positions. La borne $d = n - \ell + 1$ est donc atteinte.
:::
:::

:::exercice ★★
Pourquoi ne peut-on pas prendre $\ell = n$, c'est-à-dire un mot aussi court que le message, et garder une distance supérieure à 1 ?
:::reponse
Avec $\ell = n$, la distance minimale vaut $d = n - n + 1 = 1$. Il y a alors $p^n$ messages et $p^n$ listes de $n$ symboles, et deux messages différents donnent deux mots différents, donc toute liste de $\F_p^n$ est un mot du code. Changer un symbole d'un mot donne un autre mot du code, et aucune lecture ne peut révéler ce changement.
:::
:::

## Le rendement

Le **rendement** est la part du mot occupée par l'information du message :

$$\rho = \frac{\ell}{n}$$

La distance relative, la part des positions où deux mots différents diffèrent au moins, vaut $d/n = 1 - \rho + 1/n$. Un rendement plus petit allonge donc le mot et augmente la distance relative. Avec $\ell = 2$ et $n = 8$, $\rho = 1/4$ et $d/n = 7/8$.

:::piege
**Rendement et distance relative ne sont pas le même nombre.** Ils varient en sens inverse : un rendement de $1/4$ donne une distance relative proche de $3/4$, pas de $1/4$.
:::

## La linéarité

L'encodage d'une combinaison de messages est la même combinaison des mots :

$$\Enc(\lambda m + \mu m') = \lambda \Enc(m) + \mu \Enc(m')$$

:::exercice ★
Montrez cette égalité, position par position.
:::reponse
Les coefficients de $P_{\lambda m + \mu m'}$ sont $\lambda m_j + \mu m'_j$, donc $P_{\lambda m + \mu m'} = \lambda P_m + \mu P_{m'}$. En évaluant au point $z_x$ :

$$P_{\lambda m + \mu m'}(z_x) = \lambda P_m(z_x) + \mu P_{m'}(z_x)$$

C'est l'égalité au symbole de la position $x$.
:::
:::

Cette propriété permet de combiner les lignes d'une table engagée sans les encoder de nouveau ; la page [[engagement-colonnes]] s'en sert pour plier une table.

## Retrouver le message, voir une erreur

Un polynôme de degré au plus $\ell - 1$ est fixé par ses valeurs en $\ell$ points distincts ([[polynomes]], interpolation). Les symboles corrects de $\ell$ positions donnent donc le message.

:::exercice ★★
Un mot du code avec $\ell = 2$ a le symbole 12 en position 0 ($z = 7$) et le symbole 45 en position 2 ($z = 40$). Retrouvez le message.
:::reponse
$P_m(X) = m_0 + m_1 X$ passe par $(7, 12)$ et $(40, 45)$. La pente vaut :

$$m_1 = \frac{45 - 12}{40 - 7} = \frac{33}{33} = 1$$

puis $m_0 = 12 - 7 \times 1 = 5$. Le message est $(5, 1)$.
:::
:::

Pour savoir si une liste de $n$ symboles est un mot du code, on interpole à partir de $\ell$ positions, puis on compare le polynôme obtenu aux autres positions. Une seule position en désaccord suffit à montrer que la liste n'est pas un mot du code.

:::exercice ★★
On reçoit la liste $(12, 95, 45, 62, 43, 64, 42, 66)$, avec $\ell = 2$ et $n = 8$. Montrez qu'elle n'est pas un mot du code.
:::reponse
Les positions 0 et 1 donnent $m_1 = (95 - 12)/(90 - 7) = 83/83 = 1$, puis $m_0 = 12 - 7 = 5$. Le mot de $(5, 1)$ a en position 7 le symbole $5 + 60 = 65$, et la liste reçue porte 66. La liste n'est donc pas un mot du code.
:::
:::

Ce contrôle lit toutes les positions. Voir qu'un mot est loin du code en n'en lisant que quelques-unes est le sujet de la page [[distance]].

## La queue aléatoire

FlashProve ajoute à chaque message $r$ coefficients tirés au hasard, la **queue aléatoire** $\eta$, placés aux puissances les plus basses (`blocks/code/code.h:53-61` ; FORMAT R12.11 ; article p. 15, définition 4.2) :

$$P(X) = \sum_{j<r} \eta_j X^j + \sum_{j<\ell} m_j X^{r+j}$$

Le code a alors la dimension $\ell + r$, et le même raisonnement donne la distance minimale $d = n - (\ell + r) + 1$ et le rendement $\rho = (\ell + r)/n$. La queue sert à cacher le message ; le chapitre [[cacher]] l'introduit. Jusque-là, le cours encode sans queue.

## Notre prouveur et FlashProve

| | notre table des poids | table des poids de FlashProve |
|---|---|---|
| message $\ell$ | 8 | 402 653 184 |
| queue $r$ | 0 | 44 040 191 |
| longueur $n$ | 32 | $2^{32}$ |
| rendement | $8/32 = 1/4$ | $0{,}1041$ |
| distance minimale | $25$ | $n - (\ell + r) + 1 = 3\,848\,273\,922$ |

Les valeurs de FlashProve viennent de la ligne `table 11 32 402653184 44040191 0 18` de `prover/examples/target_full_f2/policy.txt` et de l'article (p. 14, table 2). Le code est un Reed-Solomon ordinaire de dimension $\ell + r$ (`dim()` et `min_distance`, `blocks/code/code.h:62-66` et `94-98`). L'article donne le rendement $0{,}1041$, arrondi par excès ; le calcul donne $446\,693\,375 / 2^{32} \approx 0{,}10400$, donc un mot environ $9{,}6$ fois plus long que ce qu'il encode. Les fichiers ne donnent pas ce facteur, qu'on calcule ici comme $1/\rho$.
