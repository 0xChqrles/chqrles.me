---
id: test-proximite
---
Le vérifieur a une affirmation linéaire $\langle c, m \rangle = \tau$ sur un groupe de $2^k$ lignes engagées ([[engagement-colonnes]]). Il veut s'assurer, en lisant peu, que ces lignes sont proches de mots du code et que l'affirmation vaut pour les messages qu'elles désignent. Cette page pose d'abord la forme de l'affirmation et regroupe plusieurs affirmations en une. Elle plie ensuite les $2^k$ lignes en une seule par un [[sumcheck]], et lit cette ligne à travers l'ancien engagement. Elle finit le test de deux façons, en envoyant la dernière ligne ou en changeant de code, puis elle dit pourquoi le test tient et le compare à FRI.

## L'affirmation d'un groupe

La table $m$ a $2^k$ lignes de $\ell$ places. L'entrée de la ligne $b$ et de la place $j$ est l'entrée $b + 2^k j$ du vecteur rangé dans la table, donc les bits de poids faible de l'indice donnent la ligne. Le vecteur de coefficients $c$ se range de la même façon, et l'affirmation se coupe en une somme sur les lignes :

$$\langle c, m \rangle = \sum_b \langle c_b, m_b \rangle = \tau$$

On suit un exemple dans $\mathbb{F}_{97}$. Le vecteur $w = (5, 3, 1, 4)$ se range en deux lignes ($k = 1$, $\ell = 2$) : $m_0 = (5, 1)$ et $m_1 = (3, 4)$. L'affirmation est $\tilde w(3, 5) = 54$, avec la première variable pour le bit de poids faible. Ses coefficients sont

$$c = \eq((3, 5), \cdot) = (8, -12, -10, 15)$$

donc $c_0 = (8, -10)$ et $c_1 = (-12, 15)$, et on vérifie $8 \times 5 - 10 \times 1 - 12 \times 3 + 15 \times 4 = 54$.

## Regrouper

Le vérifieur a souvent plusieurs affirmations sur le même groupe : une par sumcheck qui finit sur ces lignes, et une par réponse à un [[hors-domaine|échantillon hors domaine]]. Il les regroupe en une seule avec les puissances d'un défi $\chi$, comme dans [[horner]] :

$$\Big\langle \sum_i \chi^i c^{(i)}, m \Big\rangle = \sum_i \chi^i \tau_i$$

Avec $s$ affirmations, la différence entre les deux côtés est un polynôme en $\chi$ de degré au plus $s - 1$, dont le coefficient $i$ vaut $\langle c^{(i)}, m \rangle - \tau_i$. Si une des affirmations est fausse, ce polynôme n'est pas nul, donc il s'annule en au plus $s - 1$ valeurs de $\chi$ ([[schwartz-zippel]]), et l'affirmation regroupée est fausse pour toutes les autres. La suite de la page traite donc une seule affirmation $\langle c, m \rangle = \tau$, dont le vecteur $c$ est quelconque. FlashProve appelle cette étape BAT.

## Plier par un sumcheck

Dans [[engagement-colonnes]], une évaluation $\tilde w(z)$ se lit sur une seule ligne pliée : on plie les lignes au point formé par les coordonnées de $z$ qui indexent les lignes, puis on prend un produit scalaire. Un vecteur regroupé n'a plus cette forme.

:::exercice ★★
Le vérifieur a deux affirmations sur $w = (5, 3, 1, 4)$ : $\tilde w(3, 5) = 54$ et $\tilde w(5, 3) = 58$. Le prouveur envoie la ligne pliée en 3, $u = -2 m_0 + 3 m_1 = (-1, 10)$. Contrôlez la première affirmation avec $u$. Quelle ligne faudrait-il pour la seconde ?
:::reponse
$\tilde w(3, 5) = \langle (1 - 5, 5), u \rangle = 4 + 50 = 54$.

La seconde affirmation plie les lignes en 5, la coordonnée de ligne de son point : il faut $u' = -4 m_0 + 5 m_1 = (-5, 16)$, et $\langle (1 - 3, 3), u' \rangle = 10 + 48 = 58$. La ligne pliée en 3 est une autre combinaison des lignes et ne dit rien de $u'$. Avec $s$ affirmations en $s$ points différents, le prouveur devrait envoyer $s$ lignes.
:::
:::

On cherche donc une seule ligne pliée qui serve à n'importe quel $c$. On a une somme sur les lignes, $\tau = \sum_b H(b)$ avec

$$H(b) = \langle c_b, m_b \rangle$$

et le [[sumcheck]] ramène une somme sur le cube $\{0, 1\}^k$ à une valeur en un point aléatoire. Il faut d'abord prolonger $H$ hors du cube. On note $c(x)$ et $m(x)$ les lignes pliées au point $x = (x_1, \dots, x_k)$ :

$$m(x) = \sum_b \eq(x, b)\, m_b, \qquad c(x) = \sum_b \eq(x, b)\, c_b$$

Chaque place de $m(x)$ et de $c(x)$ est multilinéaire en $x$, donc

$$H(x) = \langle c(x), m(x) \rangle$$

est une somme de $\ell$ produits de deux fonctions multilinéaires. Elle est de degré au plus 2 en chaque variable, et elle vaut $\langle c_b, m_b \rangle$ sur le cube.

Le sumcheck de $\sum_b H(b) = \tau$ dure $k$ tours. Au tour $j$, le prouveur envoie le polynôme $g_j(X)$ de degré 2, le vérifieur tire le défi $\gamma_j$, et l'affirmation devient $g_j(\gamma_j)$. Après $k$ tours, il reste

$$\langle c(\gamma), m(\gamma) \rangle = \tau'$$

Le vérifieur calcule $c' = c(\gamma)$ lui-même, puisqu'il connaît $c$. La ligne $u = m(\gamma)$ est un pli des lignes engagées au point $\gamma$, le même pli qu'en [[engagement-colonnes]], mais personne ne l'a encore envoyée : on dit qu'elle est **virtuelle**. Le sumcheck a remplacé une affirmation sur $2^k$ lignes par une affirmation sur une seule ligne, pliée en un point que le prouveur ne connaissait pas. FlashProve appelle cette étape FOLD.

:::exercice ★★
Dans l'exemple ($k = 1$), écrivez $g_1(X) = \langle (1 - X) c_0 + X c_1, (1 - X) m_0 + X m_1 \rangle$, vérifiez $g_1(0) + g_1(1) = 54$, puis calculez $\tau' = g_1(6)$, la ligne $u$ pliée en $\gamma = 6$ et $c' = c(6)$. Contrôlez $\langle c', u \rangle = \tau'$.
:::reponse
$(1 - X) c_0 + X c_1 = (8 - 20X, -10 + 25X)$ et $(1 - X) m_0 + X m_1 = (5 - 2X, 1 + 3X)$, donc

$$
\begin{aligned}
g_1(X) &= (8 - 20X)(5 - 2X) + (-10 + 25X)(1 + 3X) \\
&= 30 - 121X + 115X^2 \\
&\equiv 30 + 73X + 18X^2
\end{aligned}
$$

$g_1(0) + g_1(1) = 30 + 121 = 151 \equiv 54$.

$\tau' = g_1(6) = 30 + 438 + 648 = 1\,116 \equiv 49$.

$u = -5 m_0 + 6 m_1 = (-7, 19) \equiv (90, 19)$ et $c' = -5 c_0 + 6 c_1 = (-112, 140) \equiv (82, 43)$.

$\langle c', u \rangle = 82 \times 90 + 43 \times 19 = 8\,197 \equiv 49$.
:::
:::

:::exercice ★
Le prouveur n'envoie que deux coefficients de $g_1$ : $g_{1,0} = 30$ et $g_{1,2} = 18$. Retrouvez $g_{1,1}$ à partir de l'affirmation $\tau = 54$.
:::reponse
$g_1(0) + g_1(1) = 2 g_{1,0} + g_{1,1} + g_{1,2} = 54$, donc $g_{1,1} = 54 - 60 - 18 = -24 \equiv 73$.
:::
:::

Le vérifieur déduit ainsi le coefficient du milieu de l'affirmation, ce qui rend le contrôle $g_j(0) + g_j(1) = \tau$ vrai par construction. Il n'y a donc rien à contrôler pendant le pliage, et chaque tour envoie un nombre de moins. Un $g_j$ faux se voit à la fin, quand $\tau'$ ne vaut pas $\langle c', u \rangle$ pour la vraie ligne $u$ : comme dans tout [[sumcheck]], un polynôme faux de degré 2 coïncide avec le vrai en au plus 2 défis (TOY Part 3 §2.4 ; D1 §4.1).

## Lire la ligne pliée dans l'ancien engagement

La ligne $u$ est virtuelle, mais le vérifieur peut lire son encodage en une position $x$. Il ouvre la colonne $x$ de la table, qui donne le symbole $x$ de chaque ligne, et il la plie avec les poids $\eq(\gamma, b)$ :

$$y(x) = \sum_b \eq(\gamma, b)\, \Enc(m_b)(x)$$

L'encodage est linéaire, donc si chaque ligne est un mot du code, $y(x) = \Enc(u)(x)$.

## Le cas de base

Quand $u$ est courte, le prouveur l'envoie en clair. Le vérifieur fait deux contrôles :

- B1 : $\langle c', u \rangle = \tau'$, ce qui ferme le sumcheck ;
- B2 : $\Enc(u)(x) = y(x)$ en $t$ positions $x$ qu'il tire, ce qui relie $u$ aux lignes engagées.

FlashProve appelle cette étape BASE. Dans FlashProve, le prouveur envoie une copie masquée de $u$ plutôt que $u$ ; [[cacher]] explique pourquoi.

:::exercice ★
Dans l'exemple, les mots engagés sont $\Enc(5, 1) = (12, 95, 45, 62, 43, 64, 42, 65)$ et $\Enc(3, 4) = (31, 72, 66, 37, 58, 45, 54, 49)$ sur $D_8 = (7, 90, 40, 57, 38, 59, 37, 60)$. Le vérifieur ouvre les positions 2 et 5. Calculez $y(2)$ et $y(5)$ avec $\gamma = 6$, puis faites le contrôle B2 avec $u = (90, 19)$.
:::reponse
Les poids du pli valent $1 - 6 = -5$ et $6$.

$$
\begin{aligned}
y(2) &= -5 \times 45 + 6 \times 66 = 171 \equiv 74 \\
y(5) &= -5 \times 64 + 6 \times 45 = -50 \equiv 47
\end{aligned}
$$

$\Enc(u)$ évalue $90 + 19X$ : en $X = 40$, $90 + 760 = 850 \equiv 74$ ; en $X = 59$, $90 + 1\,121 = 1\,211 \equiv 47$. Les deux positions passent.
:::
:::

## Le changement de code

Quand $u$ est longue, l'envoyer coûte trop cher : dans FlashProve, une ligne pliée de la table des poids a des centaines de millions d'entrées. Le prouveur s'engage alors sur $G = \Enc'(u)$, l'encodage de $u$ par un nouveau code, plus court que l'ancien, sous une nouvelle racine. Le vérifieur pose une question hors domaine sur $G$, attend la réponse, puis tire $t$ positions $x$ de l'**ancien** code.

En chaque position, il ouvre la colonne de l'ancienne table et calcule $y(x)$. L'équation $\Enc(u)(x) = y(x)$ s'écrit avec les puissances du point $z_x$ de la position :

$$\langle (1, z_x, z_x^2, \dots, z_x^{\ell - 1}), u \rangle = y(x)$$

C'est une affirmation linéaire sur $u$, c'est-à-dire sur le message de $G$. Avec l'affirmation portée $\langle c', u \rangle = \tau'$ et la réponse hors domaine, le vérifieur a $t + 2$ affirmations sur le message de $G$, et il les regroupe en une. Le message de $G$, rangé en $2^{k'}$ lignes, forme un nouveau groupe avec une affirmation : on plie à nouveau, et ainsi de suite jusqu'à une ligne assez courte pour le cas de base. FlashProve appelle cette étape CS (TOY Part 4 §3-5 ; D1 §4.1).

L'ancienne table n'est lue qu'aux $t$ positions de ce changement. Les contrôles B2 ne sont pas faits sur place : ils sont devenus des affirmations, que la suite du test contrôle.

:::exercice ★★
Le prouveur s'engage sur $u = (90, 19)$ encodé sur $D_4 = (7, 90, 40, 57)$ : $G = (29, 54, 74, 9)$. Écrivez les deux affirmations sur $u$ que donnent les positions 2 et 5 de l'ancien code. Regroupez-les avec l'affirmation portée $\langle (82, 43), u \rangle = 49$, avec les coefficients $1, 3, 9$ (puissances de 3), et vérifiez le résultat sur $u$.
:::reponse
Les positions 2 et 5 ont les points 40 et 59, et $y = 74$ et $47$ :

$$
\begin{aligned}
u_0 + 40\, u_1 &= 74 \\
u_0 + 59\, u_1 &= 47
\end{aligned}
$$

Les coefficients regroupés valent $(82, 43) + 3 (1, 40) + 9 (1, 59) = (94, 694) \equiv (94, 15)$, et la valeur $49 + 3 \times 74 + 9 \times 47 = 694 \equiv 15$. L'affirmation regroupée est $\langle (94, 15), u \rangle = 15$.

Sur $u = (90, 19)$ : $94 \times 90 + 15 \times 19 = 8\,745 \equiv 15$.
:::
:::

:::figure Le test de proximité. Un groupe est plié en une ligne virtuelle ; une ligne courte finit le test, une ligne longue est encodée par un nouveau code et forme un nouveau groupe.
<svg viewBox="0 0 480 290" role="img" aria-label="Schéma du test. On regroupe les affirmations en une, on plie le groupe par k tours de sumcheck, on obtient une ligne virtuelle u avec l'affirmation c prime u égale tau prime. Si u est courte, le cas de base l'envoie et lit t positions. Si u est longue, le changement de code s'engage sur G, l'encodage de u, et transforme t positions en t affirmations ; G forme un nouveau groupe et on recommence au regroupement."><rect x="90" y="8" width="300" height="34" class="box"/><text x="240" y="30" class="mid">regrouper : ⟨c, m⟩ = τ</text><line x1="240" y1="43" x2="240" y2="66" class="l" marker-end="url(#fa)"/><rect x="90" y="70" width="300" height="34" class="box"/><text x="240" y="92" class="mid">plier : k tours de sumcheck</text><line x1="240" y1="105" x2="240" y2="128" class="l" marker-end="url(#fa)"/><rect x="90" y="132" width="300" height="34" class="ring"/><text x="240" y="154" class="b mid">ligne virtuelle u : ⟨c′, u⟩ = τ′</text><line x1="190" y1="167" x2="120" y2="206" class="l" marker-end="url(#fa)"/><text x="132" y="186" class="m s end">u courte</text><line x1="290" y1="167" x2="360" y2="206" class="l" marker-end="url(#fa)"/><text x="348" y="186" class="m s">u longue</text><rect x="10" y="210" width="220" height="70" class="box"/><text x="120" y="232" class="b mid">cas de base</text><text x="120" y="252" class="s mid">envoie u : B1</text><text x="120" y="270" class="s mid">lit t positions : B2</text><rect x="250" y="210" width="220" height="70" class="box"/><text x="360" y="232" class="b mid">changement de code</text><text x="360" y="252" class="s mid">engage G = Enc′(u)</text><text x="360" y="270" class="s mid">t positions → t affirmations</text><path d="M 470 216 H 476 V 25 H 394" class="lc" marker-end="url(#fac)"/><text x="433" y="94" class="c s mid">G : un</text><text x="433" y="110" class="c s mid">nouveau</text><text x="433" y="126" class="c s mid">groupe</text></svg>
:::

## Pourquoi le test tient

Le test ne regarde que la ligne pliée. Il faut donc qu'un pli au hasard ne rapproche pas du code des lignes qui en sont loin.

:::exercice ★★★
On engage deux lignes sur $D_8$ ($\ell = 2$) : $r_0 = \Enc(5, 1) + (1, 1, 1, 1, 0, 0, 0, 0)$ et $r_1 = \Enc(3, 4) + (0, 0, 0, 0, 1, 1, 1, 1)$. Chacune est à distance 4 du code (le notebook le vérifie en parcourant les $97^2$ mots du code). Pour quel défi $\gamma$ le pli $(1 - \gamma) r_0 + \gamma r_1$ est-il un mot du code ?
:::reponse
Par linéarité, le pli vaut $\Enc\big((1 - \gamma)(5, 1) + \gamma (3, 4)\big) + e_\gamma$ avec

$$e_\gamma = (1 - \gamma, 1 - \gamma, 1 - \gamma, 1 - \gamma, \gamma, \gamma, \gamma, \gamma)$$

La différence de deux mots du code est un mot du code, donc le pli est un mot du code si et seulement si $e_\gamma$ en est un. Un mot du code s'écrit $a + b z$ ; s'il vaut $1 - \gamma$ en quatre points différents, le polynôme $a + bz - (1 - \gamma)$, de degré au plus 1, a quatre racines, donc il est nul : $b = 0$ et $a = 1 - \gamma$. Il vaut aussi $\gamma$ aux quatre autres points, donc $1 - \gamma = \gamma$, soit $\gamma = 1/2 = 49$.

Pour ce seul défi sur 97, le pli est un mot du code. Le notebook trouve que pour les 96 autres, le pli reste à distance 4.
:::
:::

L'exemple montre la forme du résultat qu'on utilise. Si une ligne du groupe est à distance au moins $\delta$ du code, avec $\delta$ sous le rayon de Johnson ([[distance]]), alors le pli est lui aussi à distance au moins $\delta$, sauf pour une petite part des défis $\gamma$, que le théorème borne. Ce résultat est une conséquence de l'**accord corrélé mutuel** (mutual correlated agreement), une propriété des codes de Reed-Solomon sous le rayon de Johnson. Le cours l'admet, comme FlashProve, qui prend tel quel le théorème 4.6 de BCHKS (ePrint 2025/2055) (`blocks/numbers/codes.h`, commentaire de tête ; D1 §5.3). L'analyse de CFW26, dont FlashProve reprend les étapes, repose aussi sur l'accord corrélé mutuel (D1 §4.4).

Le reste suit de [[distance]]. Pour un $\gamma$ hors de cette petite part, les colonnes pliées forment un mot à distance au moins $\delta$ du code. $\Enc(u)$ est un mot du code, quelle que soit la ligne $u$ que le prouveur envoie, donc les colonnes pliées diffèrent de $\Enc(u)$ en au moins $\delta n$ positions, et les $t$ positions de B2 passent avec probabilité au plus $(1 - \delta)^t$.

FlashProve compte une erreur par tour du test (TOY Part 3 §6 et Part 4 §7 ; D1 §4.1). Pour chaque défi du pliage, l'erreur est la part des défis qui rapprocheraient le pli du code, plus un terme qui vient de la taille de liste ; pour chaque tirage de positions, elle vaut $(1 - \delta)^t$, plus un terme de liste au changement de code.

:::exercice ★★★
Le tricheur de [[engagement-colonnes]] s'engage sur $\Enc(5, 1)$ et sur $\Enc(3, 4)$ altéré en la seule position 5. Le test l'attrape-t-il plus souvent après le pliage ? Ce tricheur est-il dangereux ? Que se passe-t-il avec une ligne loin du code ?
:::reponse
Non. Pour $\gamma \neq 0$, le pli ne diffère de $\Enc(u)$, avec $u$ la vraie ligne pliée, qu'en la position 5 : il est à distance $1/8$ du code, et une position tirée tombe sur 5 avec probabilité $1/8$.

Ce tricheur n'est pas dangereux : sa ligne altérée est à distance 1, sous le rayon du décodage unique (3 pour $\ell = 2$, $n = 8$), donc elle désigne toujours le message $(3, 4)$, et les affirmations portent sur le vrai message.

Une ligne à distance au moins $\delta$ du code ne désigne aucun message. C'est elle que le test doit attraper, et il l'attrape avec probabilité au moins $1 - (1 - \delta)^t$, sauf pour la petite part des défis de l'exercice précédent.
:::
:::

## Face à FRI

FRI est le test de proximité des STARK. Il plie un seul mot de Reed-Solomon, celui d'un polynôme $P$ à une variable. On sépare $P$ en puissances paires et impaires, $P(X) = E(X^2) + X\, O(X^2)$, comme dans [[domaine]], et un défi $r$ donne le polynôme plié $E + rO$, de degré moitié, sur le domaine des carrés. Le prouveur s'engage sur chaque mot plié, et le vérifieur contrôle deux mots consécutifs aux mêmes positions.

:::exercice ★★
FRI sur $P = 1 + 2X + 3X^2 + 4X^3$ : à partir de $P(7) = 79$ et $P(-7) = 23$, retrouvez $E(49)$ et $O(49)$, puis la valeur pliée $E(49) + 5\, O(49)$.
:::reponse
$P(7) + P(-7) = 2 E(49)$ et $P(7) - P(-7) = 2 \times 7 \times O(49)$, donc

$$
\begin{aligned}
E(49) &= (79 + 23)/2 = 51 \\
O(49) &= (79 - 23)/14 = 56/14 = 4
\end{aligned}
$$

La valeur pliée vaut $51 + 5 \times 4 = 71$. On vérifie $E(y) = 1 + 3y$ et $O(y) = 2 + 4y$ en $y = 49$ : $148 \equiv 51$ et $198 \equiv 4$.
:::
:::

Le test de FlashProve part d'une autre forme. Il plie $2^k$ lignes d'une table par un sumcheck, ce qui est un pli multilinéaire. Il encode la ligne pliée par un nouveau code, plus court, et il ne lit l'ancien mot qu'aux positions de ce changement. Il porte aussi des affirmations linéaires d'un étage à l'autre, ce que FRI seul ne fait pas. Cette comparaison est celle du cours : FlashProve se compare à WHIR et à CFW26, dont ses étapes reprennent les constructions (D1 §4.4).

## Dans FlashProve

Les étages d'un test sont écrits dans le fichier de paramètres. Pour le test d'un segment de requête, `prover/examples/target_full_f2/policy.txt` contient :

```
group link 1 23 22 17 13
stages link 4 3 22 17 3 3 19 16 3 3 16 15 4 4 13 13 0 0 15 15
```

La ligne `group` donne la règle 1, une distance égale au rayon de Johnson moins une marge, puis un code de longueur $2^{23}$ pour des messages de $2^{22}$ entrées (et le code des masques, $2^{17}$ et $2^{13}$). La ligne `stages` donne, pour chaque étage suivant, $2^k$ lignes principales, $2^h$ lignes de masque et les longueurs des deux codes ; seul le dernier étage a $k = h = 0$, et c'est le cas de base (`blocks/frame/parameters.h`, commentaire de `GroupLine`). FlashProve plie donc $2^3$ ou $2^4$ lignes par étage, pas 2 comme FRI.

:::piege
**Trois erreurs d'ordre ou d'oubli.** Envoyer le coefficient $g_{j,1}$ et le contrôler fait payer un nombre pour rien : il se déduit de l'affirmation. Tirer les positions d'un changement de code avant la réponse à la question hors domaine sur $G$ laisse le prouveur choisir son mot après coup ([[hors-domaine]]). Enfin, dans FlashProve, le changement de code encode $u$ avec sa queue aléatoire ; l'oublier fait rejeter un prouveur honnête (TOY Part 4 §1).
:::
