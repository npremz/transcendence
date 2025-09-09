import './style.css'
import { Router } from './router/Router';

const router = new Router();

const currentPath = window.location.pathname;
router.navigate(currentPath);

declare global {
    interface Window {
        router: Router;
    }
}
window.router = router;
