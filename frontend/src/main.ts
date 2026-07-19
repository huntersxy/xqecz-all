import './assets/main.css'
import 'viewerjs/dist/viewer.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { plugin as FormKitPlugin, defaultConfig } from '@formkit/vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import Antd from 'ant-design-vue'
import VueViewer from 'v-viewer'

import App from './App.vue'
import router from './router'
import { initWebVitals } from './utils/webVitals'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(FormKitPlugin, defaultConfig())
app.use(VueQueryPlugin)
app.use(Antd)
app.use(VueViewer, {
  defaultOptions: {
    zIndex: 9999,
    navbar: true,
    toolbar: true,
    title: true,
    movable: true,
    zoomable: true,
    rotatable: true,
    scalable: true,
    transition: true,
    fullscreen: true,
    keyboard: true,
  },
})

app.mount('#app')

// 初始化 Web Vitals 性能监控
if (import.meta.env.PROD) {
  initWebVitals()
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
