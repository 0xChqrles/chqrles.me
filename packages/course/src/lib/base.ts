// Every course is served under its own path, /<slug>/, on one host (astro.config.ts sets
// the base): every URL the engine writes goes through `url`, and every saved key through
// `saved`, since the courses share one origin and so one storage.
const base = import.meta.env.BASE_URL
export const BASE = base.endsWith('/') ? base : base + '/'
export const url = (path = '') => BASE + path.replace(/^\//, '')
export const saved = (key: string) => BASE + key
