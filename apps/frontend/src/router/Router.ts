import type { Route, CleanupFunction } from './types';
import { HomeView } from '../views/HomeView';
import { TestView, initWebSocket } from '../views/TestView';
import { GameView, gameLogic } from '../views/GameView';

export class Router {
    private routes: Route[];
	private currentCleanup: CleanupFunction | null = null;
    
    constructor() {
        this.routes = [];
        this.setupRoutes();
		this.setupLinkInterception();
		this.setupHistoryNavigation();
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

		this.routes.push({
            path: '/game',
            view: GameView,
			onMount: gameLogic,
            title: 'Test'
        });
    }

	private setupLinkInterception(): void {
		document.addEventListener('click', (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const link = target.closest('a');
			
			if (link && link instanceof HTMLAnchorElement) {
				const href = link.getAttribute('href');
				
				if (!href) return;
				
				if (this.isExternalLink(href)) {
					return;
				}
				
				e.preventDefault();
				this.navigateTo(href);
			}
		});
	}

	private isExternalLink(href: string): boolean {
		return /^(https?:\/\/|mailto:|tel:|ftp:)/.test(href);
	}

	private setupHistoryNavigation(): void {
        window.addEventListener('popstate', () => {
            this.navigate(window.location.pathname, false);
        });
    }

	public navigateTo(path: string): void {
        if (window.location.pathname !== path) {
            window.history.pushState({}, '', path);
            this.navigate(path);
        }
    }
    
    public navigate(path: string, updateHistory: boolean = true): void {
        this.cleanup();
        
        const route = this.findRoute(path);
        if (route) {
            const htmlContent = route.view();
            const app = document.getElementById('app');
            if (app) {
                app.innerHTML = htmlContent;
            }
            
            document.title = route.title || 'Transcendence';
            
            if (updateHistory && window.location.pathname !== path) {
                window.history.pushState({}, '', path);
            }
            
            if (route.onMount) {
                const cleanup = route.onMount();
                if (cleanup && typeof cleanup === 'function') {
                    this.currentCleanup = cleanup;
                }
            }
        } else {
            this.show404();
        }
    }

	private cleanup(): void {
        if (this.currentCleanup) {
            this.currentCleanup();
            this.currentCleanup = null;
        }
    }
    
    private findRoute(path: string): Route | undefined {
        return this.routes.find(route => route.path === path);
    }
    
    private show404(): void {
        document.getElementById('app')!.innerHTML = '<h1>Erm... This page does not exist.</h1>';
    }
}
