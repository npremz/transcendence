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
