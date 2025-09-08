import type { Route } from './types';
import { HomeView } from '../views/HomeView';
import { TestView, initWebSocket } from '../views/TestView';

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

		this.routes.push({
            path: '/test',
            view: TestView,
			onMount: initWebSocket,
            title: 'Test'
        });
    }
    
    public navigate(path: string): void {
        const route = this.findRoute(path);
        if (route)
		{
            const htmlContent = route.view();
            document.getElementById('app')!.innerHTML = htmlContent;
            document.title = route.title || 'Transcendence';

			if (route.onMount)
			{
                route.onMount();
            }
        }
		else
		{
            this.show404();
        }
    }
    
    private findRoute(path: string): Route | undefined {
        return this.routes.find(route => route.path === path);
    }
    
    private show404(): void {
        document.getElementById('app')!.innerHTML = '<h1>Erm... This page does not exist.</h1>';
    }
}
