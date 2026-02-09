import { render } from 'preact'
import App from '@/App'
import '@/assets/css/main.css'

const root = document.getElementById('app')
if (root) render(<App />, root)
