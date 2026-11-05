---
id: entiers-signes
---
Un [[reseau|réseau de neurones à nombres entiers]] calcule sur des entiers signés, et le prouveur calcule modulo un nombre premier $p$. On cherche quand une égalité modulo $p$ dit la même chose qu'une égalité entre entiers. Cette page range d'abord un entier négatif dans le corps, puis relit un élément du corps comme un entier signé et montre ce que cette lecture perd. Elle en déduit la condition cherchée : une congruence entre deux nombres dont l'écart est inférieur à $p$ est une égalité. On l'applique ensuite à un produit scalaire, à FlashProve et au total d'un reçu.

## Ranger un entier négatif

La [[modulo|réduction modulaire]] a montré que $-v \equiv p - v$. Un entier négatif $-v$ se range donc comme $p - v$ : dans $\F_{97}$, $-3$ devient 94. FlashProve fait de même avec `from_i64`, qui range un entier négatif comme l'opposé de sa valeur absolue (`blocks/field/field.h`, lignes 73 à 75).

Comme les opérations passent aux restes, le calcul dans le corps donne le reste du résultat entier. Par exemple $94 \times 94 = 8836 \equiv 9$, qui est le reste de $(-3)^2$.

:::exercice ★
Rangez $-3$ et $-5$ dans $\F_{97}$, multipliez-les dans le corps, et comparez le résultat à $(-3) \times (-5)$.

:::reponse
$-3$ devient 94 et $-5$ devient 92. Avec $100 \equiv 3$ :

$$
\begin{aligned}
94 \times 92 = 8648 &= 86 \times 100 + 48 \equiv 258 + 48 = 306 \\
306 &= 3 \times 100 + 6 \equiv 9 + 6 = 15
\end{aligned}
$$

On retrouve $15 = (-3) \times (-5)$.
:::
:::

## Relire un élément comme un entier

Le corps renvoie un reste entre 0 et 96, et il faut le relire comme un entier signé. On partage les 97 éléments en trois : 0, les 48 positifs $1, \dots, 48$, et les 48 négatifs $-48, \dots, -1$, rangés en $49, \dots, 96$. Le **représentant centré** d'un élément $x$ est donc

$$
\begin{cases}
x & \text{si } x \le 48 \\
x - 97 & \text{si } x > 48
\end{cases}
$$

Chaque entier de $[-48, 48]$ est le représentant centré d'exactement un élément du corps, et l'exercice précédent relit 15 correctement. On regarde ce qui se passe pour un résultat plus grand.

:::exercice ★
Calculez $3 \times 30$ et $7 \times 8$ dans $\F_{97}$, puis relisez chaque résultat avec le représentant centré.

:::reponse
$3 \times 30 = 90$, et $90 > 48$ se relit $90 - 97 = -7$.

$7 \times 8 = 56$, et $56 > 48$ se relit $56 - 97 = -41$.
:::
:::

Les entiers 90 et 56 ne sont pas dans $[-48, 48]$, donc la lecture centrée donne un autre entier, qui en diffère de 97. Le corps garde le reste et oublie le multiple de $p$, et l'élément seul ne permet pas de le retrouver.

:::figure Les éléments de $\F_{97}$ lus par le représentant centré. La moitié haute se relit négative, donc 90 et 56, les produits $3 \times 30$ et $7 \times 8$, se relisent $-7$ et $-41$.
<svg viewBox="0 0 470 172" role="img" aria-label="Les éléments de 0 à 96 sur une barre coupée entre 48 et 49. La moitié basse, de 0 à 48, se relit telle quelle ; la moitié haute, de 49 à 96, se relit x − 97, de −48 à −1. 56, qui vaut 7 × 8 dans le corps, se relit −41 ; 90, qui vaut 3 × 30, se relit −7."><text x="20" y="14" class="m">élément de 𝔽₉₇</text><text x="277" y="38" class="c mid">56 = 7 × 8</text><text x="460" y="38" class="c end">90 = 3 × 30</text><text x="20" y="58">0</text><text x="238" y="58" class="end">48</text><text x="247" y="58">49</text><text x="460" y="58" class="end">96</text><rect x="20" y="66" width="222.3" height="28" class="box"/><rect x="242.3" y="66" width="217.7" height="28" class="box"/><text x="131" y="85" class="s m mid">lu tel quel</text><text x="355" y="85" class="s m mid">lu x − 97</text><line x1="242.3" y1="50" x2="242.3" y2="108" class="lm dash"/><line x1="276.7" y1="44" x2="276.7" y2="100" class="lc"/><line x1="432.5" y1="44" x2="432.5" y2="100" class="lc"/><text x="20" y="118">0</text><text x="238" y="118" class="end">48</text><text x="247" y="118">−48</text><text x="460" y="118" class="end">−1</text><text x="277" y="140" class="c mid">−41</text><text x="432" y="140" class="c mid">−7</text><text x="20" y="164" class="m">relu par le représentant centré</text></svg>
:::

## Quand une congruence est une égalité

Le prouveur montre des égalités modulo $p$, et on veut en tirer des égalités entre entiers. On a $a \equiv b \pmod p$ quand $p$ divise $a - b$, c'est-à-dire quand $a - b$ est l'un des nombres $\dots, -2p, -p, 0, p, 2p, \dots$. On cherche une information qui écarte tous ces multiples sauf 0. Si l'on sait que $|a - b| < p$, le seul multiple de $p$ qui reste possible est 0, donc $a = b$ :

$$a \equiv b \pmod p \quad\text{et}\quad |a - b| < p \quad\Longrightarrow\quad a = b$$

Une équation vérifiée modulo $p$ est donc une équation entre entiers dès qu'on sait ses deux côtés assez petits pour que leur écart reste inférieur à $p$.

:::exercice ★★
Trouvez $x$ et $y$ dans $\{0, \dots, 96\}$ tels que $x \equiv 2y \pmod{97}$ mais $x \neq 2y$ entre entiers. Montrez que c'est impossible si l'on sait que $|x| \le 48$ et $|2y| \le 48$.

:::reponse
$x = 1$ et $y = 49$ conviennent : $2y = 98 \equiv 1$, mais $1 \neq 98$.

Si $|x| \le 48$ et $|2y| \le 48$, alors $|x - 2y| \le 96 < 97$. Comme 97 divise $x - 2y$, on obtient $x - 2y = 0$.
:::
:::

:::piege
« Le corps ne fait pas d'erreur » est vrai et n'aide pas : il répond exactement, mais modulo $p$. L'erreur vient de lire sa réponse comme un entier sans argument de taille. Un produit de deux petits entiers peut déjà dépasser 48 : $7 \times 8$ le fait dans $\F_{97}$.
:::

## Borner un produit scalaire

Toute preuve sur des entiers demande donc un argument de taille. On le fait pour le produit scalaire d'une ligne de poids $w_k \in \{-1, 0, 1\}$ par des entrées $x_k \in \{0, 1, 2, 3\}$, le calcul d'une couche du réseau du cours :

$$h = \sum_{k=0}^{n-1} w_k x_k$$

:::exercice ★★
Jusqu'à quelle longueur $n$ est-on sûr que $\F_{97}$ relit $h$ correctement avec le représentant centré ?

:::reponse
Chaque terme vérifie $|w_k x_k| \le 3$, donc $|h| \le 3n$. La lecture est juste quand $|h| \le 48$, ce qui est garanti pour $3n \le 48$, soit $n \le 16$.

À $n = 17$, des poids tous égaux à 1 et des entrées toutes égales à 3 donnent $h = 51$, qui se relit $51 - 97 = -46$. Le notebook compte, parmi les $12^{17}$ lignes possibles, 342 lignes relues faux, et aucune à $n = 16$.
:::
:::

Le réseau du cours a $n = 4$, donc $|h| \le 12$, loin de 48.

## À l'échelle de FlashProve

Dans le modèle que FlashProve prouve, un poids (hors table d'embedding) est entre $-4096$ et $4095$ et une activation entre $-2047$ et $2047$ (`docs/model.md`, §1 et §3). Un produit d'un poids par une activation vaut donc au plus $4096 \times 2047 = 8\,384\,512$ en valeur absolue, environ $2^{23}$. La lecture centrée de Goldilocks est juste tant que la valeur absolue ne dépasse pas $(p - 1)/2$, à peu près $2^{63}$.

:::exercice ★★
Combien de termes $w \cdot a$ peut-on additionner dans Goldilocks avant que la somme puisse dépasser $(p - 1)/2$ en valeur absolue ?

:::reponse
Chaque terme vaut au plus $8\,384\,512$ en valeur absolue, et

$$\frac{(p - 1)/2}{8\,384\,512} \approx 1{,}1 \times 10^{12} \approx 2^{40}$$

On peut donc additionner environ $2^{40}$ termes.
:::
:::

Les largeurs du modèle, comme $d = 5120$ ou $f = 16\,384$ (`docs/model.md`, §2), sont très loin de $2^{40}$, donc une somme de $d$ ou de $f$ produits d'un poids par une activation de 12 bits tient dans cette limite. Ce calcul est celui du cours, pas une affirmation de la documentation, et il ne couvre que les sommes de cette forme. La norme, elle, additionne des carrés de valeurs plus grandes, et le modèle n'est défini que si cette somme reste inférieure à $2^{78}$ (`docs/model.md`, §9, condition 1), une valeur qui dépasse $p$. FlashProve écrit donc cette somme en base 256, chiffre par chiffre avec des retenues (`docs/format/11-2-feed-forward-segment.md`, « A norm's row of digits ») ; la page [[modele-entier|Le modèle entier de FlashProve]] lit ce calcul.

La borne doit aussi être prouvée. Le vérifieur ne voit pas les valeurs du prouveur, donc il ne sait pas qu'elles sont petites tant qu'une preuve ne le montre pas. Les pages [[intervalles|Les contrôles d'intervalle]] et [[test-petitesse|Le test de petitesse]] construisent ces preuves.

## Le total d'un reçu

:::exercice ★★★
Le reçu du chapitre [[prouver-sans-refaire|Prouver un calcul sans le refaire]] a pour total $5 \times 27 + 7 \times 9 + 11 \times 3 + 13 \times 1 = 244$. Le prouveur annonce un total $T$, et le vérifieur contrôle seulement $T \equiv 244 \pmod{97}$. Quels totaux passent ce contrôle ? Quelle information supplémentaire suffirait pour conclure que $T = 244$ ?

:::reponse
Tout $T = 244 + 97k$ passe, par exemple 147 ou 341.

Pour conclure $T = 244$, il suffit de savoir que $|T - 244| < 97$. Or aucun élément de $\F_{97}$ ne se relit 244, puisque $244 > 48$ : ce corps ne peut pas énoncer ce total.

Dans Goldilocks, si chaque prix, chaque quantité et le total annoncé sont montrés inférieurs à $2^{20}$, alors chaque produit est inférieur à $2^{40}$, la somme des quatre produits est inférieure à $2^{42}$, et l'écart entre $T$ et cette somme reste très en dessous de $p$. La congruence devient alors une égalité.
:::
:::

## Dans FlashProve

Les équations de FlashProve sont prouvées modulo $p$, alors que le modèle calcule sur des entiers. Chaque segment de la preuve contient donc un contrôle de taille, appelé `smallness` dans la sortie des programmes, et le vérifieur `cp_verify` teste sur les paramètres publics des conditions de non-débordement. Le document du protocole en déduit que, sous des conditions sur la taille des nombres du modèle, les équations vraies modulo $p$ le sont aussi entre entiers, et il précise qu'il n'est pas prouvé que les conditions testées par les programmes suffisent (`docs/protocol.md`, §6.3). Sur le GPU, un élément $x$ est relu par une lecture centrée : $x$ si $x < 2^{63} - 2^{31} = (p - 1)/2$, et $x - p$ sinon (`prover/field/lazy_signed.cuh`, lignes 35 à 46).

Le [[reseau|réseau du cours]] garde $|h|$ et $|y|$ au plus égaux à 12, loin de 48, et le chapitre [[arrondir|Arrondir et comparer]] prouve ses marges inférieures à 32 par une table.
