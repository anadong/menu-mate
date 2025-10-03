import { createRoot } from 'react-dom/client'
import 'tailwindcss/tailwind.css'
import App from 'components/App'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', import.meta.env.BASE_URL).toString()
    navigator.serviceWorker.register(swUrl).catch(() => {})
  })
}

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

root.render(<App />)
