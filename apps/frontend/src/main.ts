import './style.css'
import './global.css'
import { Router } from './router/Router';
import { registerComponents } from './components';
import { SimpleAuth } from './simpleAuth/SimpleAuth'

declare global {
    interface Window {
        router: Router;
        simpleAuth: SimpleAuth;
    }
}

registerComponents(); 

const auth = new SimpleAuth()
window.simpleAuth = auth;

// Gérer le retour OAuth GitHub
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('oauth') === 'success') {
    const username = urlParams.get('username');
    if (username) {
        auth.login(username);
    }
    // Nettoyer l'URL
    window.history.replaceState({}, '', '/');
} else if (urlParams.get('error')) {
    console.error('OAuth error:', urlParams.get('error'));
    window.history.replaceState({}, '', window.location.pathname);
}

const router = new Router();

const currentPath = window.location.pathname;
router.navigate(currentPath, false);

window.router = router;
