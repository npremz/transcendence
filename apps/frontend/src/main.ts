import './style.css'
import { Router } from './router/Router';
import { registerComponents } from './components';
import { SimpleAuth } from './simpleAuth/SimpleAuth'

registerComponents(); 

const auth = new SimpleAuth()
const router = new Router();

const currentPath = window.location.pathname;
router.navigate(currentPath);

declare global {
    interface Window {
        router: Router;
        simpleAuth: SimpleAuth;
    }
}
window.router = router;
window.simpleAuth = auth;
