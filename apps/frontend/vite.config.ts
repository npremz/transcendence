import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	server: {
		host: '0.0.0.0',
		port: 5173,
<<<<<<< HEAD
		allowedHosts: true
=======
		allowedHosts: ["fu-r2-p4"]
>>>>>>> 5d02d0c (New: Server-side game + refactor)
	},
	plugins: [
		tailwindcss(),
	],
})
