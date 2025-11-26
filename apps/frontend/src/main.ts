import './style.css'
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

const router = new Router();

const currentPath = window.location.pathname;
router.navigate(currentPath);

window.router = router;

document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const backButton = target.closest('[data-smart-back]');
    
    if (backButton) {
        e.preventDefault();
        const fallback = backButton.getAttribute('data-smart-back');
        
        if (window.router) {
            window.router.goBack();
        } else if (fallback) {
            window.location.href = fallback;
        } else {
            window.location.href = '/';
        }
    }
});
