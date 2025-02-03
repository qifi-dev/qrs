// @ts-check
import antfu from '@antfu/eslint-config'
import nuxt from './.nuxt/eslint.config.mjs'

export default nuxt(
  await antfu(
    {
      unocss: true,
      formatters: true,
      markdown: false,
      yaml: false,
    },
  ),
)
