// The figures a post can use, by name, with no import: <Plane … />, <Bars … />,
// <Arcs … />. The article page hands them to the post (src/pages/[slug].astro).
import Arcs from './Arcs.astro'
import Bars from './Bars.astro'
import Plane from './Plane.astro'

export const figures = { Arcs, Bars, Plane }
