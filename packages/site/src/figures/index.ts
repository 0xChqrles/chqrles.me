// The figures a post can use, by name, with no import: <Plane … />, <Bars … />,
// <Arcs … />, and the exhibits <Words … />, <Flow … />. The article page hands
// them to the post (src/pages/[slug].astro).
import Arcs from './Arcs.astro'
import Bars from './Bars.astro'
import Flow from './Flow.astro'
import Plane from './Plane.astro'
import Words from './Words.astro'

export const figures = { Arcs, Bars, Flow, Plane, Words }
