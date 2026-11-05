---
id: merkle
---
Le prouveur doit publier une empreinte courte qui le lie à $n$ valeurs, puis pouvoir montrer n'importe laquelle de ces valeurs sans montrer les autres. Le vérifieur doit pouvoir contrôler que la valeur montrée est bien celle que l'empreinte fixe.

On part d'un seul hachage de toutes les valeurs, qui lie le prouveur mais l'oblige à tout montrer. On range ensuite les hachages en arbre, on définit l'ouverture d'une valeur, et on montre pourquoi la racine lie le prouveur. On ouvre ensuite plusieurs valeurs à la fois, on sépare les feuilles des nœuds, et on finit par le sel que FlashProve ajoute à chaque feuille.

On note $H$ une fonction de hachage à 32 octets, comme SHA-256 ou BLAKE2b, et $a \| b$ la concaténation de deux chaînes d'octets. On suppose qu'on ne sait pas trouver de **collision** de $H$, deux chaînes différentes de même condensé.

## Un seul condensé

La première idée publie $R = H(v_0 \| v_1 \| \dots \| v_{n-1})$. Une autre liste de valeurs donnerait un autre condensé, sauf collision, donc $R$ lie le prouveur à toute la liste. Mais pour montrer $v_3$, le prouveur doit envoyer toutes les autres valeurs, puisque le vérifieur ne peut recalculer $R$ qu'à partir de la chaîne entière. Montrer une valeur coûte autant que montrer la liste.

## L'arbre

On prend $n = 2^a$ valeurs. Chaque valeur $v_x$ donne une **feuille**, son condensé $H(v_x)$. Chaque paire de feuilles voisines donne un nœud, le condensé de leur concaténation, puis chaque paire de nœuds voisins un nœud au niveau au-dessus, jusqu'à un seul nœud, la **racine**. L'arbre a la **profondeur** $a$. On note $(k, j)$ le nœud de place $j$ à la profondeur $k$ : la racine est $(0, 0)$ et la feuille de la position $x$ est $(a, x)$. Les enfants de $(k, j)$ sont $(k+1, 2j)$ à gauche et $(k+1, 2j+1)$ à droite.

Le prouveur publie la racine, 32 octets quel que soit $n$.

## Ouvrir une valeur

Pour montrer $v_x$, le prouveur envoie $v_x$ et, à chaque profondeur, le condensé du **frère** du nœud qui est au-dessus de $v_x$. Le vérifieur calcule $H(v_x)$, le combine avec le premier frère pour obtenir le nœud au-dessus, puis recommence avec le frère suivant, jusqu'à la racine. Il accepte si le nœud obtenu est la racine publiée. Cet envoi s'appelle une **ouverture** de la position $x$, et la suite des nœuds de la feuille à la racine son **chemin**.

:::figure Ouvrir la position 3 d'un arbre de profondeur 3. Le prouveur envoie $v_3$ et les trois frères du chemin ; le vérifieur recalcule le chemin jusqu'à la racine.
<svg viewBox="0 0 480 236" role="img" aria-label="Un arbre de Merkle de profondeur 3 sur huit valeurs v0 à v7. Pour ouvrir la position 3, le prouveur envoie v3 et les condensés des nœuds (3,2), (2,0) et (1,1). Le vérifieur recalcule (3,3), (2,1), (1,0) puis la racine."><line x1="120.0" y1="55" x2="240.0" y2="33" class="lm"/><line x1="360.0" y1="55" x2="240.0" y2="33" class="lm"/><line x1="60.0" y1="99" x2="120.0" y2="77" class="lm"/><line x1="180.0" y1="99" x2="120.0" y2="77" class="lm"/><line x1="300.0" y1="99" x2="360.0" y2="77" class="lm"/><line x1="420.0" y1="99" x2="360.0" y2="77" class="lm"/><line x1="30.0" y1="143" x2="60.0" y2="121" class="lm"/><line x1="90.0" y1="143" x2="60.0" y2="121" class="lm"/><line x1="150.0" y1="143" x2="180.0" y2="121" class="lm"/><line x1="210.0" y1="143" x2="180.0" y2="121" class="lm"/><line x1="270.0" y1="143" x2="300.0" y2="121" class="lm"/><line x1="330.0" y1="143" x2="300.0" y2="121" class="lm"/><line x1="390.0" y1="143" x2="420.0" y2="121" class="lm"/><line x1="450.0" y1="143" x2="420.0" y2="121" class="lm"/><rect x="216.0" y="11" width="48" height="22" class="ring"/><text x="240.0" y="26.5" class="b s mid">racine</text><rect x="96.0" y="55" width="48" height="22" class="ring"/><text x="120.0" y="70.5" class="b s mid">(1,0)</text><rect x="336.0" y="55" width="48" height="22" class="hot"/><text x="360.0" y="70.5" class="o s mid">(1,1)</text><rect x="36.0" y="99" width="48" height="22" class="hot"/><text x="60.0" y="114.5" class="o s mid">(2,0)</text><rect x="156.0" y="99" width="48" height="22" class="ring"/><text x="180.0" y="114.5" class="b s mid">(2,1)</text><rect x="276.0" y="99" width="48" height="22" class="dim"/><text x="300.0" y="114.5" class="m s mid">(2,2)</text><rect x="396.0" y="99" width="48" height="22" class="dim"/><text x="420.0" y="114.5" class="m s mid">(2,3)</text><rect x="6.0" y="143" width="48" height="22" class="dim"/><text x="30.0" y="158.5" class="m s mid">(3,0)</text><rect x="66.0" y="143" width="48" height="22" class="dim"/><text x="90.0" y="158.5" class="m s mid">(3,1)</text><rect x="126.0" y="143" width="48" height="22" class="hot"/><text x="150.0" y="158.5" class="o s mid">(3,2)</text><rect x="186.0" y="143" width="48" height="22" class="ring"/><text x="210.0" y="158.5" class="b s mid">(3,3)</text><rect x="246.0" y="143" width="48" height="22" class="dim"/><text x="270.0" y="158.5" class="m s mid">(3,4)</text><rect x="306.0" y="143" width="48" height="22" class="dim"/><text x="330.0" y="158.5" class="m s mid">(3,5)</text><rect x="366.0" y="143" width="48" height="22" class="dim"/><text x="390.0" y="158.5" class="m s mid">(3,6)</text><rect x="426.0" y="143" width="48" height="22" class="dim"/><text x="450.0" y="158.5" class="m s mid">(3,7)</text><line x1="30.0" y1="177" x2="30.0" y2="185" class="lm"/><text x="30.0" y="199" class="m mid">v₀</text><line x1="90.0" y1="177" x2="90.0" y2="185" class="lm"/><text x="90.0" y="199" class="m mid">v₁</text><line x1="150.0" y1="177" x2="150.0" y2="185" class="lm"/><text x="150.0" y="199" class="m mid">v₂</text><line x1="210.0" y1="177" x2="210.0" y2="185" class="lm"/><text x="210.0" y="199" class="b mid">v₃</text><line x1="270.0" y1="177" x2="270.0" y2="185" class="lm"/><text x="270.0" y="199" class="m mid">v₄</text><line x1="330.0" y1="177" x2="330.0" y2="185" class="lm"/><text x="330.0" y="199" class="m mid">v₅</text><line x1="390.0" y1="177" x2="390.0" y2="185" class="lm"/><text x="390.0" y="199" class="m mid">v₆</text><line x1="450.0" y1="177" x2="450.0" y2="185" class="lm"/><text x="450.0" y="199" class="m mid">v₇</text><rect x="0" y="216" width="14" height="12" class="hot"/><text x="20" y="226" class="s">envoyé : v₃ et trois condensés</text><rect x="250" y="216" width="14" height="12" class="ring"/><text x="270" y="226" class="s">recalculé par le vérifieur</text></svg>
:::

À la profondeur $a - k$, le bit $k$ de la position dit de quel côté est le nœud du chemin : à droite s'il vaut 1, et son frère est alors à gauche. Pour $x = 3$, qui s'écrit `011`, le bit 0 vaut 1 : la feuille $(3, 3)$ est à droite, et son frère $(3, 2)$ à gauche.

:::exercice ★
Pour la position $6$ d'un arbre de profondeur 3, donnez les trois frères à envoyer, et dites à chaque niveau si le frère est à gauche ou à droite du nœud du chemin.
:::reponse
6 s'écrit `110`. Le chemin passe par $(3, 6)$, $(2, 3)$ et $(1, 1)$. Le bit 0 vaut 0, donc $(3, 6)$ est à gauche et son frère $(3, 7)$ à droite. Le bit 1 vaut 1, donc $(2, 3)$ est à droite et son frère $(2, 2)$ à gauche. Le bit 2 vaut 1, donc $(1, 1)$ est à droite et son frère $(1, 0)$ à gauche.
:::
:::

:::exercice ★
Combien de condensés faut-il pour ouvrir une feuille d'un arbre de $2^{32}$ feuilles, et combien d'octets cela fait-il ?
:::reponse
Un frère par profondeur, donc 32 condensés, soit $32 \times 32 = 1\,024$ octets, en plus de la valeur ouverte.
:::
:::

## Pourquoi la racine lie le prouveur

On veut montrer que le prouveur ne peut pas ouvrir deux valeurs différentes à la même position sous la même racine.

:::exercice ★★
Le prouveur veut ouvrir la position 3 avec la valeur $v$, puis avec une valeur $v' \neq v$, sous la même racine. Les deux ouvertures sont acceptées. Que doit-il avoir trouvé ? Suivez les deux calculs du vérifieur de la feuille vers la racine.
:::reponse
Les deux calculs partent de $H(v)$ et de $H(v')$ et finissent tous les deux à la racine. Si $H(v) = H(v')$, les chaînes $v$ et $v'$ forment une collision. Sinon, on remonte jusqu'au premier niveau où les deux calculs donnent le même nœud. Juste en dessous, les deux nœuds du chemin diffèrent, donc les deux chaînes « gauche $\|$ droite » hachées à ce niveau diffèrent, et elles ont le même condensé : c'est une collision. Dans tous les cas, le prouveur a trouvé une collision de $H$.
:::
:::

Tant qu'on ne sait pas trouver de collision de $H$, la racine fixe donc une seule valeur à chaque position. Le vérifieur doit pour cela recalculer lui-même chaque condensé à partir de la valeur ouverte, et prendre la position dans son propre tirage : une position lue dans la preuve laisserait le prouveur choisir où il est contrôlé (FORMAT R7.10).

## Ouvrir plusieurs positions

Un vérifieur ouvre souvent plusieurs positions de la même racine. Les chemins se rejoignent alors près de la racine, et certains frères sont eux-mêmes sur un autre chemin ouvert : le vérifieur peut les calculer, et le prouveur ne les envoie pas. FlashProve envoie les condensés **niveau par niveau**, du plus profond au plus haut, et de gauche à droite dans un niveau, jamais un condensé que le vérifieur sait calculer (FORMAT R7.8, R7.9).

:::exercice ★★
Dans un arbre de profondeur 3, on ouvre les positions 0, 5 et 7. Quels condensés le prouveur envoie-t-il, et dans quel ordre ? Combien en faudrait-il avec trois ouvertures séparées ?
:::reponse
À la profondeur 3, les frères de 0, 5 et 7 sont 1, 4 et 6, et aucun n'est ouvert : on envoie $(3, 1)$, $(3, 4)$, $(3, 6)$. Le vérifieur connaît alors les nœuds $(2, 0)$, $(2, 2)$ et $(2, 3)$. Le frère de $(2, 0)$ est $(2, 1)$, inconnu, donc on l'envoie ; $(2, 2)$ et $(2, 3)$ sont frères. À la profondeur 1, le vérifieur connaît $(1, 0)$ et $(1, 1)$, qui donnent la racine.

Il faut donc 4 condensés, dans l'ordre $(3, 1)$, $(3, 4)$, $(3, 6)$, $(2, 1)$, contre $3 \times 3 = 9$ avec trois ouvertures séparées. C'est l'exemple de FORMAT R7.9.
:::
:::

## Séparer les feuilles et les nœuds

Une feuille est le condensé d'une valeur, et un nœud le condensé de deux condensés. Si les deux s'obtiennent avec la même fonction, une chaîne de 64 octets peut être lue comme une valeur ou comme une paire de condensés.

:::exercice ★★★
Les feuilles et les nœuds sont hachés avec la même $H$. Montrez que la racine d'un arbre de profondeur 3 sur $v_0, \dots, v_7$ est aussi la racine d'un arbre de profondeur 2 dont on donnera les quatre valeurs. Qu'est-ce que le prouveur peut alors « ouvrir » ?
:::reponse
Le nœud $(2, j)$ vaut $H(\ell_{2j} \| \ell_{2j+1})$, où $\ell_x = H(v_x)$ sont les feuilles. C'est aussi la feuille d'une valeur $w_j = \ell_{2j} \| \ell_{2j+1}$, puisque les feuilles sont hachées avec la même $H$. L'arbre de profondeur 2 sur $w_0, w_1, w_2, w_3$ a donc les mêmes nœuds au-dessus et la même racine.

Le prouveur peut alors ouvrir la position $j$ de cet arbre avec la valeur $w_j$, deux condensés que la liste engagée ne contient pas. La racine ne fixe plus ni la liste ni sa longueur.
:::
:::

On hache donc les feuilles et les nœuds avec deux fonctions différentes, par exemple en ajoutant un octet `0x00` devant une valeur et `0x01` devant une paire de condensés, comme le notebook du chapitre [[engager]]. Une chaîne de feuille n'est alors jamais une chaîne de nœud. FlashProve met un numéro dans l'en-tête de chaque hachage : 174 pour une feuille de table stockée, 166 pour un nœud interne (FORMAT R2.1, R7.4, R7.7, R3.4).

## Le sel

FlashProve ajoute à chaque feuille un **sel**, 40 octets aléatoires propres à cette feuille (FORMAT R7.3 ; `salt 40` dans `prover/examples/target_full_f2/policy.txt`). Une ouverture envoie des condensés de feuilles non ouvertes, et sans sel, un vérifieur qui devine la valeur d'une feuille pourrait contrôler sa supposition en la hachant. Le chapitre [[cacher]] en a besoin pour que la preuve ne montre rien des valeurs non ouvertes.

:::piege
**Deux erreurs faciles.** Envoyer les frères chemin par chemin au lieu de niveau par niveau donne une autre preuve, que le vérifieur de FlashProve rejette (FORMAT §6.7, point 1). Prendre les positions dans la preuve au lieu de les tirer soi-même laisse le prouveur ouvrir les positions qui l'arrangent.
:::

## Notre prouveur et FlashProve

| | notre prouveur | FlashProve |
|---|---|---|
| hachage | SHA-256, 32 octets | BLAKE2b, 32 octets, avec un en-tête de 16 octets par usage (FORMAT R2.1, R2.2) |
| feuilles et nœuds | octet `0x00` ou `0x01` devant la chaîne | numéros 174 et 166 dans l'en-tête (R7.4, R7.7) |
| sel | aucun (jusqu'au chapitre [[cacher]]) | 40 octets par feuille (R7.3) |
| ouverture | niveau par niveau | niveau par niveau ; le vérifieur hache chaque feuille ouverte et garde une seule valeur par nœud (R7.9, R7.10, R7.14) |
