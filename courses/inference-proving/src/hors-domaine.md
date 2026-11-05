---
id: hors-domaine
---
Au-delà du rayon du décodage unique, un mot engagé peut être proche de plusieurs mots du code ([[distance]]). Il ne désigne alors aucun message en particulier, et le prouveur peut parler d'un mot du code dans une affirmation et d'un autre dans la suivante. On veut le forcer à en choisir un, une fois pour toutes, juste après l'engagement. Cette page montre d'abord ce que le prouveur gagne à choisir après coup. Elle construit ensuite la question qui le force à choisir, calcule la probabilité qu'elle échoue, et fixe l'ordre des étapes. Elle finit par la forme que FlashProve donne à cette question.

## Choisir après coup

On reprend l'exemple de [[distance]] : un code de $\ell = 4$ et $n = 8$ sur $D_8$, et le mot reçu

$$w = (79, 95, 48, 96, 21, 12, 87, 78)$$

Les mots du code à distance au plus 3 de $w$ sont trois :

$$
\begin{aligned}
c_1 = \Enc(1, 2, 3, 4) &= (79, 23, 48, 48, 21, 12, 87, 78) && \text{faux aux positions } 1, 3 \\
c_2 = \Enc(31, 31, 15, 5) &= (79, 95, 48, 96, 21, 2, 80, 21) && \text{faux aux positions } 5, 6, 7 \\
c_3 = \Enc(61, 77, 24, 6) &= (51, 95, 2, 96, 21, 58, 87, 78) && \text{faux aux positions } 0, 2, 5
\end{aligned}
$$

Le prouveur s'est engagé sur $w$. Le vérifieur va lire $w$ en quelques positions et les comparer à l'encodage du message que le prouveur défend.

:::exercice ★
Le vérifieur tire 2 positions avec remise, et le prouveur défend $m_1$, fixé d'avance. Quelle chance a-t-il de passer ?
:::reponse
Chaque position doit éviter les positions 1 et 3, où $w$ diffère de $c_1$, donc il passe avec probabilité $(6/8)^2 = 36/64 \approx 0{,}56$.
:::
:::

:::exercice ★★
Le prouveur connaît maintenant les 2 positions avant de dire quel message il défend. Comment en profite-t-il ? Calculez sa chance de passer (comptez les paires ordonnées de positions où aucun des trois mots ne coïncide avec $w$).
:::reponse
Il choisit, parmi $c_1$, $c_2$ et $c_3$, un mot qui coïncide avec $w$ aux deux positions tirées, et il défend son message.

Il ne perd que si aucun des trois mots ne convient. Une paire de positions qui touche $\{1, 3\}$ exclut $c_1$, une qui touche $\{5, 6, 7\}$ exclut $c_2$, une qui touche $\{0, 2, 5\}$ exclut $c_3$. Aucune position n'est dans deux de ces ensembles à la fois sauf 5, donc une paire qui exclut les trois mots contient 5 et une position de $\{1, 3\}$ : ce sont $(1, 5)$, $(5, 1)$, $(3, 5)$ et $(5, 3)$. Il passe avec probabilité $60/64 \approx 0{,}94$, contre $0{,}56$ avec $m_1$ fixé (le notebook compte les 64 paires).
:::
:::

Le prouveur gagne donc à garder plusieurs mots du code en réserve. Il faut qu'il en désigne un avant toute lecture de positions, et que ce choix l'engage.

## Une question sur tout le message

Juste après l'engagement, le vérifieur tire un point $z$ au hasard et demande la valeur de l'[[multilineaire|extension multilinéaire]] du message en ce point :

$$\tilde m(z) = \sum_j \eq(z, j)\, m_j$$

Le prouveur répond par un seul nombre. On rappelle la convention : la première variable $z_1$ est le bit de poids faible de l'indice $j$.

:::exercice ★
Avec $z = (5, 3)$, on a $\eq((5,3), \cdot) = (8, -10, -12, 15)$. Calculez $\tilde m_1(5, 3)$ et $\tilde m_2(5, 3)$ pour $m_1 = (1, 2, 3, 4)$ et $m_2 = (31, 31, 15, 5)$, dans $\mathbb{F}_{97}$.
:::reponse
$$
\begin{aligned}
\tilde m_1(5, 3) &= 8 - 20 - 36 + 60 = 12 \\
\tilde m_2(5, 3) &= 248 - 310 - 180 + 75 = -167 \equiv 27
\end{aligned}
$$
:::
:::

Les deux réponses diffèrent. Si le prouveur répond 12, il a choisi $m_1$, et s'il défend ensuite $m_2$, sa réponse est fausse pour $m_2$. On cherche maintenant la probabilité que deux messages donnent la même réponse.

Deux messages $m_1 \neq m_2$ donnent la même réponse en $z$ si et seulement si $z$ annule $\tilde m_1 - \tilde m_2$. Cette différence est l'extension multilinéaire de $m_1 - m_2$, qui n'est pas nul, donc c'est un polynôme non nul. Il a $k$ variables, chacune de degré au plus 1, donc son degré total vaut au plus $k$. Par [[schwartz-zippel]], un point tiré dans un corps $\mathbb{K}$ l'annule avec probabilité au plus

$$\frac{k}{|\mathbb{K}|}$$

:::exercice ★★
Pour quels $z \in \mathbb{F}_{97}^2$ les réponses de $m_1$ et $m_2$ coïncident-elles ? Écrivez $\tilde m_2 - \tilde m_1$ avec les coefficients de $m_2 - m_1 = (30, 29, 12, 1)$, puis comptez ses zéros.
:::reponse
L'extension multilinéaire de $(f_0, f_1, f_2, f_3)$ s'écrit $f_0 + (f_1 - f_0) z_1 + (f_2 - f_0) z_2 + (f_3 - f_2 - f_1 + f_0) z_1 z_2$. Avec $(30, 29, 12, 1)$ :

$$\tilde m_2 - \tilde m_1 = 30 - z_1 - 18 z_2 - 10 z_1 z_2$$

On la regroupe en $z_2$ : elle s'annule quand $(18 + 10 z_1)\, z_2 = 30 - z_1$. Pour chaque $z_1$ tel que $18 + 10 z_1 \neq 0$, il y a exactement un $z_2$, soit 96 valeurs de $z_1$. Pour $z_1 = -18/10 = -18 \times 68 \equiv 37$, il faudrait $30 - 37 = 0$, ce qui est faux, donc aucun $z_2$.

Il y a 96 zéros sur $97^2 = 9\,409$ points. Schwartz-Zippel bornait leur nombre par $2 \times 97 = 194$, puisque la part des zéros vaut au plus $2/97$.
:::
:::

La liste est fixée par le mot engagé, donc avant le tirage de $z$, et chacune de ses paires est un polynôme fixé d'avance. Une liste de $L$ messages contient $L(L-1)/2$ paires. Chacune donne la même réponse avec probabilité au plus $k/|\mathbb{K}|$, donc une paire au moins coïncide avec probabilité au plus

$$\binom{L}{2} \frac{k}{|\mathbb{K}|}$$

C'est la borne que FlashProve reprend de CFW26, lemme 9.1 (D1 §5.2). Hors de cette probabilité, les messages de la liste donnent tous des réponses différentes, donc la réponse désigne au plus un mot de la liste.

:::exercice ★
Pourquoi tirer $z$ dans le corps des défis $\mathbb{E}_{97}$ plutôt que dans $\mathbb{F}_{97}$, pour notre paire $m_1$, $m_2$ ?
:::reponse
La borne vaut $2/97 \approx 0{,}021$ dans $\mathbb{F}_{97}$ et $2/97^3 \approx 2{,}2 \times 10^{-6}$ dans $\mathbb{E}_{97}$, qui a $97^3$ éléments ([[extension]]). Le polynôme $\tilde m_2 - \tilde m_1$ garde les mêmes coefficients ; seul l'ensemble où l'on tire $z$ grandit.
:::
:::

## Une affirmation de plus

La réponse $a$ dit que $\tilde m(z) = a$, c'est-à-dire

$$\langle \eq(z, \cdot), m \rangle = a$$

C'est une affirmation linéaire sur le message, de la même forme que celles que laissent les sumchecks. Le [[test-proximite|test de proximité]] la regroupe avec les autres et les contrôle toutes ensemble. Si le prouveur défend plus tard un autre mot de la liste, cette affirmation est fausse pour lui, et le test la rejette comme une autre.

## L'ordre des étapes

La question ne sert que si le prouveur répond avant de connaître les positions. Si le vérifieur tirait les positions d'abord, le prouveur choisirait son mot de la liste après les avoir vues, comme plus haut, puis répondrait à la question avec le message de ce mot.

L'ordre est donc fixé : le prouveur envoie l'engagement, puis le vérifieur tire $z$, puis le prouveur répond, et aucune position n'est tirée entre le tirage de $z$ et la réponse. FlashProve rend tout autre ordre difficile à écrire : « positions are never drawn while a sample is open » (`blocks/README.md`, règle 6).

## Le nom

DEEP-FRI (ePrint 2019/336) a introduit cette question pour un polynôme à une variable : le vérifieur demande sa valeur en un point pris hors du domaine $D$ où le mot est évalué, d'où le nom d'**échantillon hors domaine**. FlashProve demande plutôt la valeur de l'extension multilinéaire du message, comme WHIR (ePrint 2024/1586, section 4.4) ; l'article cite les deux (paper p.16 §4.3 ; D1 §5.1). Le nom est resté, même si le point $z$ n'a plus rien à voir avec le domaine.

## Dans FlashProve

La réponse d'une ligne $f$ de la table des poids s'écrit (paper p.15, définition 4.3 ; D1 §5.2) :

$$a = \sum_{j < \ell'} \eq(z, j)\, f[j] + \beta \cdot \mathrm{pad}$$

Le point $z$ est dans $\mathbb{E}^{29}$, parce que la ligne a $402\,653\,184$ places et que $\lceil \log_2 402\,653\,184 \rceil = 29$. La somme porte sur les $\ell' = \ell - 3$ premières places, les entrées ordinaires de la ligne. Les 3 dernières places sont des entrées aléatoires, que le terme $\beta \cdot \mathrm{pad}$ ajoute à la réponse pour qu'elle ne dise rien des poids ([[cacher]]). Pour la table stockée, les points sont dérivés de la racine par une chaîne de hachage à eux, donc tout le monde peut les recalculer (FORMAT R4.10 ; D1 §5.2).

:::exercice ★★★
La liste de FlashProve a au plus 26 messages ([[distance]]), et $z$ a 29 coordonnées dans $\mathbb{E}$, qui a $p^3 \approx 2^{192}$ éléments. Bornez la probabilité qu'une réponse ne suffise pas à distinguer deux messages de la liste.
:::reponse
$$\binom{26}{2} \frac{29}{2^{192}} = \frac{325 \times 29}{2^{192}} = \frac{9\,425}{2^{192}} \approx 2^{13{,}2 - 192} = 2^{-178{,}8}$$

FlashProve compte $L^2/2 = 338$ paires au lieu de $\binom{26}{2} = 325$, une borne un peu plus large, et trouve $2^{-178{,}74}$ pour la table, avec un point de 29 coordonnées (`docs/format/08-parameters.md` §8.5, ligne « the record » ; paper p.62, lemme A.25).
:::
:::

:::piege
**La réponse n'est pas muette.** Sans le terme $\beta \cdot \mathrm{pad}$, la réponse $\langle \eq(z, \cdot), m \rangle$ est une combinaison linéaire connue des poids, que le vérifieur apprend. Le chapitre [[cacher]] ajoute le masque. Autre erreur facile : inverser l'ordre des bits de $j$ dans $\eq(z, j)$ donne une autre réponse, et le contrôle échoue.
:::
