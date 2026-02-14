export default defineNuxtConfig({
  app: {
    head: {
      title: 'PANKOW_77C / HYBRID SYNDICATE',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Glitchwave rituals & cyberpunk entropy' }
      ]
    }
  },
  css: ['~/assets/css/tailwind.css'],
  build: {
    transpile: []
  },
  modules: []
})