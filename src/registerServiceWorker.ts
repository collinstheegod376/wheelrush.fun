import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // Simple prompt — replace with your app's UI if you prefer
    if (confirm('A new version is available. Reload to update?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('Service worker: offline ready')
  }
})

export default updateSW
