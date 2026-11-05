---
id: distance
---
Un prouveur qui s'engage sur une ligne encodée se lie à un mot de $n$ symboles, et rien ne l'oblige à ce que ce mot soit un mot du code de [[reed-solomon]]. On veut mesurer de combien un mot s'écarte du code, savoir combien de positions il faut lire pour voir cet écart, et savoir quand un mot désigne un seul mot du code. Cette page définit d'abord la distance, puis calcule la probabilité de voir un mot éloigné en lisant $t$ positions. Elle montre ensuite jusqu'à quelle distance un mot reste proche d'un seul mot du code, ce qui se passe au-delà, et la distance que choisit FlashProve.

## La distance de Hamming

La **distance de Hamming** entre deux mots de même longueur est le nombre de positions où ils diffèrent. La **distance relative** divise ce nombre par la longueur $n$ : c'est la part des positions où les deux mots diffèrent, et on la note $\delta$.

Sur le domaine $D_8 = (7, 90, 40, 57, 38, 59, 37, 60)$, les deux mots du code

$$
\begin{aligned}
\Enc(5, 1) &= (12, 95, 45, 62, 43, 64, 42, 65) \\
\Enc(3, 4) &= (31, 72, 66, 37, 58, 45, 54, 49)
\end{aligned}
$$

diffèrent dans les 8 positions, donc ils sont à distance 8, et à distance relative 1.

La distance d'un mot au code est sa distance au mot du code le plus proche. Le mot $(12, 95, 45, 62, 43, 64, 42, 66)$ n'est pas un mot du code ([[reed-solomon]] le montre en interpolant), et il ne diffère de $\Enc(5, 1)$ qu'à la dernière position, donc il est à distance 1 du code.

La distance compte des positions, pas des écarts entre nombres : remplacer 65 par 66 et remplacer 65 par 3 ajoutent chacun 1 à la distance.

## Voir un mot éloigné en lisant peu

Le vérifieur ne lit pas tout le mot $w$ engagé. Il a en main un mot du code $c$ auquel $w$ doit être égal, par exemple l'encodage d'une ligne que le prouveur lui a envoyée, et il lit $w$ en quelques positions pour les comparer à $c$.

On suppose que $w$ est à distance relative au moins $\delta$ de tout mot du code. Il est donc aussi à distance au moins $\delta$ de $c$ : au moins $\delta n$ positions de $w$ diffèrent de $c$. Une position tirée au hasard parmi les $n$ montre une différence avec probabilité au moins $\delta$, donc elle n'en montre aucune avec probabilité au plus $1 - \delta$.

Le vérifieur tire $t$ positions indépendamment, avec remise. Les probabilités de ces tirages indépendants se multiplient, donc le mot passe les $t$ positions avec probabilité au plus

$$(1 - \delta)^t$$

:::exercice ★
Un mot est faux en 3 positions sur 8. Le vérifieur tire 2 positions, avec remise. Quelle chance a-t-il de ne rien voir ?
:::reponse
Une position tombe sur une des 5 positions justes avec probabilité $5/8$. Les deux tirages sont indépendants, donc

$$(5/8)^2 = 25/64 \approx 0{,}39$$
:::
:::

On compte cette probabilité en bits, comme les autres erreurs du prouveur : une erreur $2^{-s}$ vaut $s$ bits. Les $t$ positions donnent

$$t \log_2 \frac{1}{1 - \delta} \text{ bits}$$

Chaque position ajoute donc $\log_2(1/(1 - \delta))$ bits, et ce gain grandit avec $\delta$.

## Le décodage unique

On cherche jusqu'à quelle distance un mot désigne un seul mot du code. On a ce que donne [[reed-solomon]] : deux mots du code différents diffèrent en au moins $d = n - \ell + 1$ positions, la **distance minimale**.

:::exercice ★★
Un mot $w$ est à distance $e$ d'un mot du code $c$, avec $2e < d$. Soit $c'$ un autre mot du code. Montrez que $w$ est à distance plus grande que $e$ de $c'$. (Regardez une position où $c$ et $c'$ diffèrent : $w$ ne peut pas être égal aux deux.)
:::reponse
Il y a au moins $d$ positions où $c$ et $c'$ diffèrent. $w$ diffère de $c$ en $e$ positions seulement, donc il est égal à $c$ en au moins $d - e$ de ces positions, et en chacune il diffère de $c'$. Il est donc à distance au moins $d - e$ de $c'$. Comme $2e < d$, on a $d - e > e$.
:::
:::

Un mot à distance $e < d/2$ d'un mot du code est donc plus loin de tous les autres : le mot du code le plus proche est unique. Retrouver ce mot s'appelle le **décodage unique**, et il corrige jusqu'à

$$e = \left\lfloor \frac{d - 1}{2} \right\rfloor \text{ erreurs}$$

Pour Reed-Solomon, $d - 1 = n - \ell$, donc le rayon relatif vaut à peu près $(1 - \rho)/2$, avec le rendement $\rho = \ell/n$.

:::exercice ★★
Pour $\ell = 2$ et $n = 8$ : quelle est la distance minimale ? Combien d'erreurs le décodage unique corrige-t-il ? Quel rayon relatif cela donne-t-il ?
:::reponse
$d = 8 - 2 + 1 = 7$. Le décodage unique corrige $\lfloor 6/2 \rfloor = 3$ erreurs, soit un rayon relatif $3/8 = 0{,}375$. Avec $\rho = 2/8 = 1/4$, on trouve exactement $(1 - \rho)/2 = 0{,}375$, parce que $d - 1 = 6$ est pair.
:::
:::

## Au-delà, des listes

On prend un code de rendement plus élevé, $\ell = 4$ et $n = 8$, de distance minimale $d = 5$. Le décodage unique y corrige 2 erreurs. Les messages $m_1 = (1, 2, 3, 4)$ et $m_2 = (31, 31, 15, 5)$ donnent deux mots qui ne diffèrent qu'en 5 positions, la distance minimale ([[reed-solomon]] les construit) :

$$
\begin{aligned}
c_1 = \Enc(m_1) &= (79, 23, 48, 48, 21, 12, 87, 78) \\
c_2 = \Enc(m_2) &= (79, 95, 48, 96, 21, 2, 80, 21)
\end{aligned}
$$

On reçoit le mot

$$w = (79, 95, 48, 96, 21, 12, 87, 78)$$

:::exercice ★★
Calculez la distance de $w$ à $c_1$ et à $c_2$. Vers quel mot le décodage unique corrige-t-il $w$ ? Quels mots trouve-t-on parmi les mots du code à distance au plus 3 de $w$ ?
:::reponse
$w$ diffère de $c_1$ aux positions 1 et 3 : distance 2. Il diffère de $c_2$ aux positions 5, 6 et 7 : distance 3.

Le rayon du décodage unique vaut 2 ici, donc le décodage corrige $w$ en $c_1$, et ce résultat est sûr : tout autre mot du code est à distance au moins $5 - 2 = 3$.

À distance au plus 3, on trouve $c_1$ et $c_2$. Le notebook cherche tous les mots du code à cette distance (un mot qui coïncide avec $w$ en 5 positions est fixé par 4 d'entre elles, donc il suffit d'interpoler sur chaque choix de 4 positions), et il en trouve un troisième, $c_3 = \Enc(61, 77, 24, 6) = (51, 95, 2, 96, 21, 58, 87, 78)$, qui diffère de $w$ aux positions 0, 2 et 5.
:::
:::

Au-delà du rayon du décodage unique, un mot reçu peut donc être proche de plusieurs mots du code. Le **décodage en liste** de rayon $\delta$ renvoie tous les mots du code à distance relative au plus $\delta$ du mot reçu, et leur nombre s'appelle la **taille de liste** $L$. Dans l'exemple, la liste de rayon 3 contient $c_1$, $c_2$ et $c_3$.

## Le rayon de Johnson

Une longue liste laisse au prouveur beaucoup de mots du code entre lesquels choisir, donc on cherche jusqu'à quelle distance elle reste courte. On a deux faits. Chaque mot de la liste coïncide avec le mot reçu $w$ en au moins $an$ positions, avec $a = 1 - \delta$. Deux mots du code différents coïncident en au plus $n - d = \ell - 1$ positions, et on note $\rho = (\ell - 1)/n$ cette part : c'est le rendement à $1/n$ près.

Ces deux faits suffisent à borner la liste. Si $a^2 > \rho$, elle a au plus

$$L \le \frac{a - \rho}{a^2 - \rho}$$

mots du code. La condition $a^2 > \rho$ s'écrit $1 - \delta > \sqrt{\rho}$ : la distance $\delta$ est sous le **rayon de Johnson**

$$J = 1 - \sqrt{\rho}$$

:::derivation Démontrer la borne de Johnson
On compte les coïncidences de deux façons. Soit $L$ le nombre de mots de la liste, et $k_x$ le nombre de mots de la liste qui valent $w_x$ en la position $x$.

Chaque mot coïncide avec $w$ en au moins $an$ positions, donc la somme $S = \sum_x k_x$ vaut au moins $Lan$.

En la position $x$, les $k_x$ mots valent tous $w_x$, donc ils coïncident deux à deux : cela fait $k_x(k_x - 1)$ paires ordonnées de mots différents. Une paire de mots différents coïncide en au plus $\rho n$ positions, et il y a $L(L - 1)$ paires ordonnées, donc

$$\sum_x k_x(k_x - 1) \le L(L - 1)\rho n$$

Il reste à relier les deux sommes. Une somme de $n$ carrés vaut au moins le carré de la somme divisé par $n$, parce que l'écart $\sum_x k_x^2 - S^2/n$ vaut $\sum_x (k_x - S/n)^2 \ge 0$. Donc

$$\frac{S^2}{n} - S \le \sum_x k_x(k_x - 1) \le L(L - 1)\rho n$$

La fonction $s \mapsto s^2/n - s$ croît dès que $s \ge n/2$. Si $La \ge 1/2$, on a $S \ge Lan \ge n/2$, donc on peut remplacer $S$ par $Lan$ à gauche :

$$\frac{(Lan)^2}{n} - Lan \le L(L - 1)\rho n$$

On divise par $Ln$ : $La^2 - a \le (L - 1)\rho$, soit $L(a^2 - \rho) \le a - \rho$, d'où la borne quand $a^2 > \rho$.

Si $La < 1/2$, la borne est vraie d'emblée : $a \le 1$ donne $a(a - \rho) \ge a^2 - \rho$, donc $(a - \rho)/(a^2 - \rho) \ge 1/a > 2L$.
:::

:::exercice ★★
Calculez $J$ pour $\rho = 1/4$ et pour $\rho = 1/2$. Pour $\rho = 1/4$, calculez la borne de liste à $\delta = 0{,}4$ et à $\delta = 0{,}45$.
:::reponse
$J = 1 - \sqrt{1/4} = 0{,}5$ et $J = 1 - \sqrt{1/2} \approx 0{,}293$.

À $\delta = 0{,}4$ : $a = 0{,}6$, $a^2 = 0{,}36$, donc

$$L \le \frac{0{,}6 - 0{,}25}{0{,}36 - 0{,}25} = \frac{0{,}35}{0{,}11} \approx 3{,}18$$

À $\delta = 0{,}45$ : $a = 0{,}55$, $a^2 = 0{,}3025$, donc

$$L \le \frac{0{,}30}{0{,}0525} \approx 5{,}71$$

La borne grandit vite quand $\delta$ s'approche de $J$, parce que $a^2 - \rho$ tend vers 0.
:::
:::

C'est la borne qu'utilise le code de FlashProve (`johnson_list`, `blocks/numbers/codes.h`), avec la même valeur de $\rho$ : « a plain Reed-Solomon code of dimension d enters with k = d − 1 » (même fichier, commentaire de tête). Sur un code de $2^{32}$ positions, l'écart de $1/n$ entre $(\ell - 1)/n$ et $\ell/n$ ne se voit pas.

:::exercice ★★
Le code de l'exemple a $\ell = 4$ et $n = 8$. Avec $\rho = (\ell - 1)/n$, la liste de rayon 3 est-elle sous le rayon de Johnson ? Que donne la borne, et combien de mots la liste contient-elle ? Que se passerait-il si l'on prenait $\rho = \ell/n$ ?
:::reponse
$\rho = 3/8$ et $J = 1 - \sqrt{3/8} \approx 0{,}388$. Le rayon $3/8 = 0{,}375$ est en dessous, donc la borne s'applique, avec $a = 5/8$ :

$$L \le \frac{5/8 - 3/8}{25/64 - 24/64} = \frac{2/8}{1/64} = 16$$

La liste contient 3 mots, sous la borne.

Avec $\rho = 1/2$, on trouverait $J \approx 0{,}293$, sous $0{,}375$ : la borne ne dirait rien. Sur un code de 8 positions, l'écart de $1/n$ change le résultat.
:::
:::

:::piege
On ne confond pas le rayon de Johnson avec le rayon du décodage unique, qui est plus petit : $(1 - \rho)/2$ contre $1 - \sqrt{\rho}$, soit $0{,}375$ contre $0{,}5$ pour $\rho = 1/4$.
:::

## Pourquoi dépasser le décodage unique

Un test qui garantit une plus grande distance $\delta$ ouvre moins de positions pour le même nombre de bits, puisque chaque position donne $\log_2(1/(1 - \delta))$ bits.

:::exercice ★
Un code a pour rendement $\rho = 1/4$. Combien de positions faut-il pour 20 bits au rayon du décodage unique, $\delta = 0{,}375$ ? Et à $\delta = 0{,}45$, sous le rayon de Johnson ?
:::reponse
À $\delta = 0{,}375$, une position donne $\log_2(1/0{,}625) \approx 0{,}678$ bit, donc il en faut $20/0{,}678 \approx 29{,}5$, soit 30.

À $\delta = 0{,}45$, une position donne $\log_2(1/0{,}55) \approx 0{,}862$ bit, donc il en faut $20/0{,}862 \approx 23{,}2$, soit 24.
:::
:::

Chaque position ouverte coûte des octets dans la preuve, donc ce gain compte, mais il se paie de deux façons. Quand la liste a $L$ mots, une erreur qui valait pour un mot du code doit être comptée pour chacun d'eux, ou pour chaque paire, ce qui multiplie certaines probabilités d'erreur par $L$ ou par $L^2/2$. De plus, un mot engagé ne désigne plus un seul mot du code, et le prouveur pourrait parler de l'un à un moment et d'un autre plus tard. Une question posée juste après l'engagement l'en empêche, l'[[hors-domaine|échantillon hors domaine]].

## La table de FlashProve

FlashProve se place sous le rayon de Johnson, moins une marge (`Radius`, `blocks/numbers/codes.h`). Sa table des poids a des lignes de $\ell = 402\,653\,184$ places, plus $r = 44\,040\,191$ coefficients aléatoires (la queue aléatoire, [[cacher]]), encodées sur $|D| = 2^{32}$ points. Le décodeur de l'article va jusqu'à $2\,852\,142\,980$ positions, donc $\delta = 2\,852\,142\,980/2^{32} \approx 0{,}66407$ (paper p.14 ; D1 §2.2).

:::exercice ★★
Le code de cette table a la dimension $\ell + r$. Calculez son rendement $(\ell + r)/2^{32}$, son rayon de Johnson avec $\rho = (\ell + r - 1)/2^{32}$, et la borne de liste à $\delta = 0{,}66407$.
:::reponse
$\ell + r = 446\,693\,375$, donc le rendement vaut $446\,693\,375/2^{32} \approx 0{,}10400$.

Avec $\rho = 446\,693\,374/2^{32} \approx 0{,}104004$ : $\sqrt{\rho} \approx 0{,}32250$, donc $J \approx 0{,}6775$. La distance choisie, $0{,}66407$, est sous $J$ d'environ $0{,}013$ : c'est la marge.

$a = 1 - 0{,}66407 = 0{,}33593$ et $a^2 \approx 0{,}112850$, donc

$$L \le \frac{0{,}33593 - 0{,}10400}{0{,}112850 - 0{,}10400} \approx \frac{0{,}23193}{0{,}00885} \approx 26{,}2$$

Une taille de liste est entière, donc au plus 26 mots du code : c'est la taille de liste de la table, avec la distance $0{,}664066$ (`docs/format/08-parameters.md` §8.5 ; paper p.62, lemme A.23).
:::
:::

Le notebook du chapitre [[proximite]] refait ces calculs, et cherche la liste de l'exemple.
