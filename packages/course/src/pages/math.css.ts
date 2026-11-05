import { mathCss } from '../lib/math-styles'
import { getCourse } from '../lib/pages'

export async function GET() {
  const { styles } = await getCourse()
  return new Response(mathCss(styles), { headers: { 'Content-Type': 'text/css' } })
}
