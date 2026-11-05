import { iconSvg } from '@chqrles/design/icon'

export function GET() {
  return new Response(iconSvg(), { headers: { 'Content-Type': 'image/svg+xml' } })
}
