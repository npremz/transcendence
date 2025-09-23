import type { Route, CleanupFunction, RouteParams } from './types';
import { ComponentManager } from '../components/ComponantManager'
import { HomeView } from '../views/HomeView';
import { TestView, initWebSocket } from '../views/TestView';
import { GameView } from '../views/GameView';
import { StartGameView } from '../views/StartGameView';
import { LoginView } from '../views/LoginView';
import { CreateAccountView } from '../views/CreateAccountView';
import { tournamentLogic, TournamentView } from '../views/TournamentView';

export class Router {
    private routes: Route[];
	private currentCleanup: CleanupFunction | null = null;
    private componentManager: ComponentManager;
    
    constructor()
    {
        this.routes = [];
        this.componentManager = new ComponentManager();
        this.setupRoutes();
		this.setupLinkInterception();
		this.setupHistoryNavigation();
    }
    
    private setupRoutes(): void
    {
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
            path: '/game/:roomId',
            view: GameView,
            title: 'Test'
        });

        this.routes.push({
            path: '/tournament',
            view: TournamentView,
            onMount: tournamentLogic,
            title: 'Tournament'
        });

		this.routes.push({
            path: '/startgame',
            view: StartGameView,
            title: 'Test'
        });

		this.routes.push({
            path: '/login',
            view: LoginView,
            title: 'Test'
        });

		this.routes.push({
            path: '/create',
            view: CreateAccountView,
            title: 'Test'
        });

        this.compileRoutes();
    }

    private compileRoutes(): void {
        this.routes.forEach(route => {
            if (route.path.includes(':'))
            {
                const paramNames: string[] = [];
                
                const regexPattern = route.path.replace(/:([^/]+)/g, (match, paramName) => {
                    paramNames.push(paramName);
                    return '([^/]+)';
                });

                route.regex = new RegExp(`^${regexPattern}$`);
                route.paramNames = paramNames;
            }
        });
    }

	private setupLinkInterception(): void
    {
		document.addEventListener('click', (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const link = target.closest('a');
			
			if (link && link instanceof HTMLAnchorElement)
            {
				const href = link.getAttribute('href');
				
				if (!href) return;
				
				if (this.isExternalLink(href))
                {
					return;
				}
				
				e.preventDefault();
				this.navigateTo(href);
			}
		});
	}

	private isExternalLink(href: string): boolean
    {
		return /^(https?:\/\/|mailto:|tel:|ftp:)/.test(href);
	}

	private setupHistoryNavigation(): void
    {
        window.addEventListener('popstate', () => {
            this.navigate(window.location.pathname, false);
        });
    }

	public navigateTo(path: string): void
    {
        if (window.location.pathname !== path)
        {
            window.history.pushState({}, '', path);
            this.navigate(path);
        }
    }
    
    public navigate(path: string, updateHistory: boolean = true): void {
        this.cleanup();
        
        const matchResult = this.findRoute(path);
        if (matchResult) {
            const { route, params } = matchResult;
            
            const htmlContent = route.view(params);
            const app = document.getElementById('app');
            if (app) {
                app.innerHTML = htmlContent;
            }
            
            document.title = route.title || 'Transcendence';
            
            if (updateHistory && window.location.pathname !== path) {
                window.history.pushState({}, '', path);
            }
            
            this.componentManager.scanAndMount();

            if (route.onMount) {
                const cleanup = route.onMount(params);
                if (cleanup && typeof cleanup === 'function') {
                    this.currentCleanup = cleanup;
                }
            }
        } else {
            this.show404();
        }
    }

	private cleanup(): void
    {
        this.componentManager.cleanupAll();

        if (this.currentCleanup)
        {
            this.currentCleanup();
            this.currentCleanup = null;
        }
    }
    
    private findRoute(path: string): { route: Route; params: RouteParams } | undefined {
        for (const route of this.routes)
        {
            if (!route.regex && route.path === path)
            {
                return { route, params: {} };
            }
            
            if (route.regex && route.paramNames)
            {
                const match = path.match(route.regex);
                if (match)
                {
                    const params: RouteParams = {};
                    
                    route.paramNames.forEach((paramName, index) => {
                        params[paramName] = match[index + 1];
                    });
                    
                    return { route, params };
                }
            }
        }
        
        return undefined;
    }
    
    private show404(): void
    {
        document.getElementById('app')!.innerHTML = '<h1>Erm... This page does not exist.</h1>';
    }
}
