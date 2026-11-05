---
id: developpement
---
Le développement est la distance d'un tour de pédales. Il multiplie le [[rapport|rapport]] par la longueur de la [[roue|roue]].

$$
\begin{aligned}
d &= r \times c \\
  &= \frac{44}{16} \times 2{,}1 \\
  &= 5{,}775
\end{aligned}
$$

:::figure Le plateau, à gauche, entraîne le `pignon`, à droite.
<svg viewBox="0 0 480 160" role="img" aria-label="Un grand plateau relié à un petit pignon par une chaîne">
  <circle class="box" cx="130" cy="80" r="64"></circle>
  <circle class="dim" cx="350" cy="80" r="26"></circle>
  <path class="l" d="M130 16L350 54M130 144L350 106"></path>
  <path class="lc dash" d="M210 34L262 43" marker-end="url(#fac)"></path>
  <text class="mid b" x="130" y="85">44</text>
  <text class="mid m" x="350" y="85">16</text>
</svg>
:::

:::code Mesurer
```js
let d = r * c; // ceci n'est pas du $math$
```
:::

:::incertain
La valeur de $c$ dépend de la pression.
:::

| Plateau | Pignon | Rapport |
|---|---|---|
| 44 | 16 | 2,75 |
| 34 | 28 | 1,21 |

Une liste longue reste lisible sur un téléphone :

$$(a_1, a_2, a_3, a_4, a_5, a_6, a_7, a_8, a_9, a_{10}, a_{11}, a_{12}, a_{13}, a_{14})$$
