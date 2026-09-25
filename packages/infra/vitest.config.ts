import { configDefaults, defineConfig } from 'vitest/config'

// A local synth stages copies of the build under cdk.out; they are not tests.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, 'cdk.out/**'] },
})
