import './style.css'
import { Router } from './router/Router';
import { registerComponents } from './components';

registerComponents(); 



const router = new Router();

const currentPath = window.location.pathname;
router.navigate(currentPath);

declare global {
    interface Window {
        router: Router;
    }
}
window.router = router;
