import type { Route } from './types';
import { HomeView } from '../views/HomeView';

export class Router {
    private routes: Route[];
    
    constructor() {
        this.routes = [];
        this.setupRoutes();
    }
    
    private setupRoutes(): void {
        this.routes.push({
            path: '/',
            view: HomeView,
            title: 'Accueil'
        });
    }
    
    public navigate(path: string): void {
        const route = this.findRoute(path);
        if (route) {
            const htmlContent = route.view();
            document.getElementById('app')!.innerHTML = htmlContent;
            document.title = route.title || 'Mon App';
        } else {
            this.show404();
        }
    }
    
    private findRoute(path: string): Route | undefined {
        return this.routes.find(route => route.path === path);
    }
    
    private show404(): void {
        document.getElementById('app')!.innerHTML = '<h1>Page non trouvée</h1>';
    }
}
