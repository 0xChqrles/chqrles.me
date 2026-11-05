// Run before the page is drawn: it says a script runs, so the map is drawn for the camera from
// the first frame, never first as the page without a script.
export function GET() {
  return new Response("document.documentElement.classList.add('js')\n", { headers: { 'Content-Type': 'text/javascript' } })
}
