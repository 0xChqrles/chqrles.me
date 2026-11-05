import { sep } from 'node:path'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'
import { loadCourse, type Course } from './lib/course'
import { courseDir } from './lib/course-dir'

// One entry, the whole course, built from one folder. A build stops on any fault and
// names them all. In dev a fault is logged and the page keeps rendering, so a slip
// in a card being written does not take the preview down.
export const collections = {
  course: defineCollection({
    loader: {
      name: 'course',
      load: async ({ store, logger, watcher }) => {
        const dev = import.meta.env.DEV
        const dir = courseDir({ dev, env: process.env })
        const sync = () => {
          const { course, errors, summary } = loadCourse(dir)
          if (errors.length && !dev) throw new Error(`${dir}:\n${errors.join('\n')}`)
          for (const error of errors) logger.error(error)
          if (!course) return
          store.clear()
          store.set({ id: 'course', data: course })
          logger.info(summary!)
        }
        sync()
        if (!watcher) return
        watcher.add(dir)
        const onChange = (path: string) => {
          if (path.startsWith(dir + sep)) sync()
        }
        watcher.on('change', onChange)
        watcher.on('add', onChange)
        watcher.on('unlink', onChange)
      },
    },
    schema: z.custom<Course>(),
  }),
}
