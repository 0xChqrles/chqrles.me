---
id: goldilocks
---
FlashProve calcule modulo le nombre premier

$$p = 2^{64} - 2^{32} + 1$$

qui s'écrit `0xFFFFFFFF00000001` en hexadécimal et qu'on appelle **Goldilocks** (`blocks/field/gl64.h`). Un élément du corps est un reste inférieur à $p$, donc il tient dans un mot de 64 bits, et le produit de deux éléments tient dans 128 bits. On cherche le reste de ce produit modulo $p$ sans faire de division, avec des décalages, des masques, des additions et des soustractions sur des mots de 64 bits.

La [[modulo|réduction modulaire]] à la main modulo 97 remplace chaque centaine par 3, parce que $100 \equiv 3$. La forme de $p$ donne de même des puissances de 2 congrues à de petits nombres. On fait d'abord le calcul modulo 13, un petit premier de la même forme, puis modulo $p$. On règle ensuite les débordements que les mots de 64 bits imposent, on arrive au code de FlashProve, et on le vérifie sur le plus grand produit. On finit par ce que la forme de $p$ donne d'autre.

## Le petit cas : $p = 13$

$13 = 2^4 - 2^2 + 1$ a la forme de Goldilocks, avec $2^2$ à la place de $2^{32}$ : les mots de 32 bits y deviennent des mots de 2 bits. Comme $13 \equiv 0$, on a $2^4 \equiv 2^2 - 1 = 3$.

:::exercice ★
Modulo 13, montrez que $2^6 \equiv -1$ et $2^8 \equiv -4$, en n'utilisant que $2^4 \equiv 3$.

:::reponse
$$
\begin{aligned}
2^6 &= 2^2 \times 2^4 \equiv 4 \times 3 = 12 \equiv -1 \\
2^8 &= 2^2 \times 2^6 \equiv 4 \times (-1) = -4
\end{aligned}
$$
:::
:::

Un produit de deux éléments de $\F_{13}$ vaut au plus $12 \times 12 = 144$, qui est inférieur à $2^8$, donc il s'écrit avec quatre mots de 2 bits $w_0, w_1, w_2, w_3$ :

$$v = w_0 + 2^2 w_1 + 2^4 w_2 + 2^6 w_3$$

Les deux premiers termes restent tels quels, puisque leur somme est inférieure à 16. On remplace $2^4$ par 3 et $2^6$ par $-1$ dans les deux autres :

$$v \equiv (w_0 + 4 w_1) + 3 w_2 - w_3 \pmod{13}$$

Par exemple $11 \times 9 = 99$ s'écrit $01\,10\,00\,11$ en binaire, donc $w_3 = 1$, $w_2 = 2$, $w_1 = 0$ et $w_0 = 3$ :

$$99 \equiv (3 + 0) + 3 \times 2 - 1 = 8$$

et en effet $99 = 7 \times 13 + 8$.

## Le cas réel

Modulo le $p$ de Goldilocks, $p \equiv 0$ donne de même

$$2^{64} \equiv 2^{32} - 1$$

On note $e = 2^{32} - 1$ ce nombre, qui joue le rôle de 3 pour $p = 13$.

:::exercice ★
Montrez que $2^{96} \equiv -1$ modulo le $p$ de Goldilocks, comme $2^6 \equiv -1$ modulo 13.

:::reponse
$$
\begin{aligned}
2^{96} = 2^{32} \times 2^{64} &\equiv 2^{32}(2^{32} - 1) = 2^{64} - 2^{32} \\
&\equiv (2^{32} - 1) - 2^{32} = -1
\end{aligned}
$$
:::
:::

Un produit de deux éléments est inférieur à $p^2$, donc à $2^{128}$, et on le coupe en quatre mots de 32 bits :

$$v = w_0 + 2^{32} w_1 + 2^{64} w_2 + 2^{96} w_3$$

On remplace $2^{64}$ par $e$ et $2^{96}$ par $-1$ :

$$v \equiv (w_0 + 2^{32} w_1) + e\, w_2 - w_3 \pmod p$$

Le processeur donne le produit en deux mots de 64 bits, le mot haut $\hi$ et le mot bas $\lo$, avec $v = 2^{64} \hi + \lo$. Le premier terme, $w_0 + 2^{32} w_1$, est $\lo$ tel quel. $w_3$ et $w_2$ sont les moitiés haute et basse de $\hi$. Comme $e$ s'écrit avec 32 bits à 1, il sert lui-même de masque :

$$w_3 = \hi \shr 32 \qquad w_2 = \hi \mand e$$

:::figure Le produit de 128 bits coupé en quatre mots de 32 bits. Chaque mot est remplacé par un terme congru, et les trois termes s'additionnent dans un mot de 64 bits.
<svg viewBox="0 0 470 216" role="img" aria-label="Le produit v de 128 bits en quatre mots de 32 bits : w₃ et w₂ forment le mot haut hi, w₁ et w₀ le mot bas lo. Comme 2⁹⁶ ≡ −1, w₃ est soustrait ; comme 2⁶⁴ ≡ e, w₂ est multiplié par e ; lo est gardé tel quel. Les trois termes s'additionnent dans un mot de 64 bits, lo + e·w₂ − w₃."><text x="130" y="16" class="m mid">hi</text><text x="350" y="16" class="m mid">lo</text><rect x="20" y="26" width="110" height="32" class="box"/><text x="75" y="47" class="b mid">w₃</text><rect x="130" y="26" width="110" height="32" class="box"/><text x="185" y="47" class="b mid">w₂</text><rect x="240" y="26" width="110" height="32" class="box"/><text x="295" y="47" class="b mid">w₁</text><rect x="350" y="26" width="110" height="32" class="box"/><text x="405" y="47" class="b mid">w₀</text><line x1="240" y1="20" x2="240" y2="64" class="lc dash"/><text x="75" y="78" class="s m mid">hi &gt;&gt; 32</text><text x="185" y="78" class="s m mid">hi &amp; e</text><text x="350" y="78" class="s m mid">w₀ + 2³² w₁</text><text x="75" y="102" class="c mid">2⁹⁶ ≡ −1</text><text x="185" y="102" class="c mid">2⁶⁴ ≡ e</text><text x="350" y="102" class="c mid">tel quel</text><line x1="75" y1="112" x2="288" y2="164" class="l" marker-end="url(#fa)"/><line x1="185" y1="112" x2="318" y2="164" class="l" marker-end="url(#fa)"/><line x1="350" y1="112" x2="350" y2="164" class="l" marker-end="url(#fa)"/><text x="140" y="154" class="s m mid">× (−1)</text><text x="282" y="128" class="s m">× e</text><rect x="240" y="170" width="220" height="34" class="ring"/><text x="350" y="191.5" class="b mid">lo + e·w₂ − w₃</text><text x="20" y="191.5" class="m">un mot de 64 bits</text></svg>
:::

## Multiplier par $e$ sans multiplication

On calcule le terme $e\, w_2$ à partir de $e = 2^{32} - 1$ :

$$e\, w_2 = 2^{32} w_2 - w_2$$

soit un décalage de 32 bits vers la gauche et une soustraction. Comme $w_2 < 2^{32}$, ce terme vaut au plus $e^2 = 2^{64} - 2^{33} + 1$, et il tient dans un mot de 64 bits.

## Les deux corrections

On calcule $\lo - w_3 + e\,w_2$ dans des mots de 64 bits, en deux opérations : $t = \lo - w_3$, puis $r = t + e\,w_2$. Le vrai résultat de chacune peut ne pas tenir dans 64 bits.

- La soustraction **emprunte** quand $\lo < w_3$ : le mot contient alors $t + 2^{64}$ au lieu de $t$.
- L'addition **déborde** quand la vraie somme $s = t + e\,w_2$ atteint $2^{64}$ : le mot contient alors $s - 2^{64}$.

Dans les deux cas, le mot diffère du vrai résultat de $2^{64}$, et $2^{64} \equiv e$.

:::exercice ★★
Après un emprunt, le mot vaut $t + 2^{64}$. Quelle opération le ramène à une valeur congrue à $t$ modulo $p$ ? Même question après un débordement de l'addition.

:::reponse
Comme $2^{64} \equiv e$, le mot $t + 2^{64}$ est congru à $t + e$ : on soustrait $e$.

Après un débordement, le mot vaut $s - 2^{64}$, qui est congru à $s - e$ : on ajoute $e$.
:::
:::

:::piege
Corriger un emprunt en ajoutant $e$ double l'erreur au lieu de l'annuler.

Modulo Goldilocks, $2^{64}$ vaut $e$ et non 1 : $2^{64} \equiv 1$ serait vrai pour un module $2^{64} - 1$.
:::

## La dernière réduction

Après les corrections, $r$ est un mot de 64 bits congru à $v$, mais il peut encore valoir $p$ ou plus. Comme $2^{64} = p + e$ et $e < p$, on a $r < 2^{64} < 2p$. Il y a donc au plus un $p$ à retirer : si $r \ge p$, on soustrait $p$. FlashProve appelle cette étape `canonical`.

On suit maintenant toutes ces étapes sur le petit cas, avec des registres de 4 bits à la place des mots de 64 bits, des moitiés de 2 bits à la place des moitiés de 32 bits, et $e = 3$.

:::exercice ★★
Avec des registres de 4 bits et $p = 13$, réduisez $12 \times 12 = 144$ en suivant ces étapes : $\hi = 9$ et $\lo = 0$, puis $\texttt{hh} = \hi \shr 2$, $\texttt{hl} = \hi \mand 3$, $t = \lo - \texttt{hh}$, $m = 4 \cdot \texttt{hl} - \texttt{hl}$, $r = t + m$, et enfin la dernière réduction. Dites à chaque étape s'il y a un emprunt ou un débordement, et quelle correction s'applique. Recommencez avec $3 \times 10 = 30$ et $8 \times 12 = 96$.

:::reponse
Pour 144 : $\texttt{hh} = 2$ et $\texttt{hl} = 1$. $t = 0 - 2$ emprunte, le registre vaut 14, et on retire $e$ : 11. $m = 3$, et $r = 11 + 3 = 14$ ne déborde pas. $14 \ge 13$, donc on retire 13 : **1**. En effet $144 = 11 \times 13 + 1$.

Pour 30 : $\hi = 1$ et $\lo = 14$, donc $\texttt{hh} = 0$ et $\texttt{hl} = 1$. $t = 14$, sans emprunt. $m = 3$, et $14 + 3 = 17$ déborde de 4 bits : le registre vaut 1, et on ajoute $e$ : **4**. En effet $30 = 2 \times 13 + 4$.

Pour 96 : $\hi = 6$ et $\lo = 0$, donc $\texttt{hh} = 1$ et $\texttt{hl} = 2$. $t = 0 - 1$ emprunte : 15, puis $15 - 3 = 12$. $m = 6$, et $12 + 6 = 18$ déborde : le registre vaut 2, puis $2 + 3 = $ **5**. En effet $96 = 7 \times 13 + 5$.

Le notebook compare ces étapes à `% 13` sur les 169 produits de deux éléments de $\F_{13}$, et tous coïncident.
:::
:::

:::piege
Oublier la dernière réduction laisse des mots qui ne sont pas des éléments du corps : 14 est un registre de 4 bits valide, mais il n'est pas un élément de $\F_{13}$, et il ne serait pas égal à 1 dans une comparaison mot à mot.
:::

## Le code

C'est ce que fait `reduce128`, avec `hh` pour $w_3$, `hl` pour $w_2$, `m` pour $e\,w_2$ et `EPS` pour $e$ :

:::code blocks/field/gl64.h · GL64::reduce128
```cpp
static BLK_HD u64 reduce128(u64 hi, u64 lo) {
  const u64 hh = hi >> 32, hl = hi & EPS;
  u64 t = lo - hh;
  t -= EPS & (0 - (u64)(lo < hh)); // if there was a borrow: t is then at least 2^64 - e, so this does not wrap
  const u64 m = (hl << 32) - hl;   // e hl, at most e^2 = 2^64 - 2^33 + 1
  u64 r = t + m;
  r += EPS & (0 - (u64)(r < m)); // if there was a carry: r is then at most t - 2^33 + 1, so this does not wrap
  return canonical(r);
}
```
:::

La comparaison `lo < hh` détecte l'emprunt. La comparaison `r < m` détecte le débordement, parce qu'une somme qui déborde de 64 bits devient plus petite que chacun de ses deux termes. Les corrections passent par un masque et non par un `if` : `0 - (u64)(lo < hh)` vaut un mot de 64 bits à 1 après un emprunt et 0 sinon, donc `EPS & …` vaut $e$ ou 0. Le commentaire des lignes 65 à 69 donne la raison de ce choix : sur le processeur hôte, un produit dans le corps des défis était plus rapide avec des masques qu'avec des branches, selon les mesures des auteurs.

Les commentaires des deux corrections affirment qu'elles ne débordent pas à leur tour (« does not wrap »). On le montre.

:::exercice ★★★
Montrez que la correction d'un emprunt ne peut pas emprunter à son tour, puis que la correction d'un débordement ne peut pas déborder à son tour.

:::reponse
Après un emprunt, le mot vaut $\lo - w_3 + 2^{64}$. Comme $\lo \ge 0$ et $w_3 \le 2^{32} - 1$, il vaut au moins $2^{64} - 2^{32} + 1$. Retirer $e = 2^{32} - 1$ laisse au moins $2^{64} - 2^{33} + 2$, qui est positif : pas d'emprunt.

Pour le débordement, $m \le 2^{64} - 2^{33} + 1$, donc après un débordement le mot vaut $t + m - 2^{64} \le t - 2^{33} + 1$. Ajouter $e$ donne au plus $t - 2^{32}$, qui reste inférieur à $2^{64}$ : pas de nouveau débordement.
:::
:::

## Le plus grand produit

Le plus grand produit de deux éléments est $(p - 1)^2$. Comme $p - 1 \equiv -1$, il doit se réduire en $(-1)^2 = 1$.

:::exercice ★★
Écrivez $(p - 1)^2$ en quatre mots de 32 bits et appliquez la formule $v \equiv (w_0 + 2^{32} w_1) + e\,w_2 - w_3$.

:::reponse
$p - 1 = 2^{64} - 2^{32}$, donc

$$(p - 1)^2 = 2^{128} - 2^{97} + 2^{64} = 2^{96}(2^{32} - 2) + 2^{64}$$

Les mots sont $w_0 = w_1 = 0$, $w_2 = 1$ et $w_3 = 2^{32} - 2$. La formule donne

$$0 + e \times 1 - (2^{32} - 2) = (2^{32} - 1) - (2^{32} - 2) = 1$$

Dans le code, $t = 0 - (2^{32} - 2)$ emprunte, la correction donne $2^{64} - 2^{33} + 3$, puis $r = 2^{64} - 2^{32} + 2$ sans débordement, et la dernière réduction retire $p$ : il reste 1.
:::
:::

## Ce que la forme de $p$ donne d'autre

La forme de $p$ fixe aussi la décomposition de $p - 1$ en facteurs premiers, dont dépendent deux constructions du cours.

:::exercice ★★
Décomposez $p - 1$ en facteurs premiers, avec $a^2 - b^2 = (a - b)(a + b)$. On admet que 3, 5, 17, 257 et 65537 sont premiers.

:::reponse
$p - 1 = 2^{64} - 2^{32} = 2^{32}(2^{32} - 1)$. Puis

$$
\begin{aligned}
2^{32} - 1 &= (2^{16} - 1)(2^{16} + 1) \\
&= (2^8 - 1)(2^8 + 1)(2^{16} + 1) \\
&= (2^4 - 1)(2^4 + 1)(2^8 + 1)(2^{16} + 1) \\
&= 3 \times 5 \times 17 \times 257 \times 65537
\end{aligned}
$$

donc $p - 1 = 2^{32} \times 3 \times 5 \times 17 \times 257 \times 65537$, la décomposition que donne le commentaire de `gl64.h` (ligne 30).
:::
:::

Le facteur $2^{32}$ donne des ensembles de $2^a$ points, pour tout $a \le 32$, sur lesquels un polynôme s'évalue vite : la page [[domaine|Le domaine d'évaluation]] les construit, et le code de la table des poids de FlashProve a $2^{32}$ positions (`docs/format/08-parameters.md`, ligne `table`, nombre `n` de `record.f2.txt`). Le facteur 3 n'apparaît qu'une fois, et 2 n'est pas un cube modulo $p$ (`gl64.h`, lignes 30 à 33) : la page [[extension|Le corps des défis]] en tire un corps de $p^3$ éléments, où le vérifieur tire ses défis. Le format de FlashProve appelle Goldilocks le corps de référence (`docs/format/FORMAT.md`, R1.2), sans donner de raison à ce choix.

## Dans FlashProve

`reduce128` reprend les étapes de la fonction du même nom de la bibliothèque plonky2, et FlashProve y ajoute la dernière réduction (`gl64.h`, lignes 16 à 20).

Un élément du corps des défis a trois coordonnées dans Goldilocks, et chaque coordonnée d'un produit est une somme de trois produits de Goldilocks. `dot3` additionne ces trois produits de 128 bits avant de réduire, ce qui fait 3 réductions par produit au lieu de 9 (`blocks/field/field.h`, lignes 108 à 134, d'après l'article ePrint 2010/526). Une somme de trois produits peut dépasser 128 bits ; le mot qui déborde, $c$, se corrige avec $2^{128} = 2^{32} \times 2^{96} \equiv -2^{32}$, d'où la soustraction finale de $c \cdot 2^{32}$ (`gl64.h`, lignes 89 à 105).

Notre prouveur réduit à la main, modulo 97.
