// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  experimental: {
    viewTransition: true,
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  router: {
    options: {
      sensitive: true,
    }
  },
  modules: [
    "@nuxthub/core",
    "nuxt-auth-utils",
    "@nuxtjs/critters",
    "@louislschvn/nuxt-form",
  ],
  compatibilityDate: "2024-11-18",

  future: { compatibilityVersion: 4 },

  nitro: {
    minify: false,
    experimental: {
      openAPI: true,
    }
  },

  hub: {
    ai: true,
    analytics: true,
    blob: true,
    database: true,
  },
})