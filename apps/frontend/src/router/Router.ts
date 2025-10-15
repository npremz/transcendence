import type { Route, CleanupFunction, RouteParams } from './types';
import { ComponentManager } from '../components/ComponantManager'
import { HomeView, homeLogic } from '../views/HomeView';
import { QuickPlayView } from '../views/QuickPlayView';
import { WaitingRoomView, waitingRoomLogic } from '../views/WaitingRoomView';
import { GameView } from '../views/GameView';
import { StartGameView } from '../views/StartGameView';
import { LoginView } from '../views/LoginView';
import { CreateAccountView } from '../views/CreateAccountView';
import { tournamentLogic, TournamentView } from '../views/TournamentView';
import { BracketView, bracketLogic } from '../views/BracketView';
import { HistoryView, historyLogic } from '../views/HistoryView';
import { GameDetailView, gameDetailLogic } from '../views/GameDetailView';
import type { NavigationGuard } from './types';
import {
    logGuard,
    tournamentExistsGuard,
    roomExistsGuard
} from './Guards'

export class Router {
    private routes: Route[];
	private currentCleanup: CleanupFunction | null = null;
    private componentManager: ComponentManager;
    private currentRoute?: Route;
    private globalBeforeEach?: NavigationGuard;
    
    constructor()
    {
        this.routes = [];
        this.componentManager = new ComponentManager();
        this.setupRoutes();
		this.setupLinkInterception();
		this.setupHistoryNavigation();

        this.globalBeforeEach = logGuard;
    }
    
    private setupRoutes(): void
    {
        this.routes.push({
            path: '/',
            view: HomeView,
            onMount: homeLogic,
            title: 'Accueil'
        });

		this.routes.push({
            path: '/play',
            view: QuickPlayView,
            title: 'QuickPlay'
        });

		this.routes.push({
            path: '/play/waiting',
            view: WaitingRoomView,
            onMount: waitingRoomLogic,
            title: 'Waiting Room'
        });

		this.routes.push({
            path: '/game/:roomId',
            view: GameView,
            title: 'Pong gaming',
            beforeEnter: async (to, from, params) => {
                return await roomExistsGuard(to, from, params);
            },
        });

        this.routes.push({
            path: '/tournament',
            view: TournamentView,
            onMount: tournamentLogic,
            title: 'Tournament'
        });

        this.routes.push({
            path: '/tournament/:id',
            view: BracketView,
            onMount: bracketLogic,
            title: 'Tounament brackets',
            beforeEnter: async (to, from, params) => {
                return await tournamentExistsGuard(to, from, params);
            }
        });

		this.routes.push({
            path: '/startgame',
            view: StartGameView,
            title: 'Test'
        });

        this.routes.push({
            path: '/history',
            view: HistoryView,
            onMount: historyLogic,
            title: 'Historique des Parties'
        });

        this.routes.push({
            path: '/history/:id',
            view: GameDetailView,
            onMount: gameDetailLogic,
            title: 'Détails de la Partie'
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
    
    public async navigate(path: string, updateHistory: boolean = true): Promise<void> {
        this.cleanup();
        
        const matchResult = this.findRoute(path);
        if (matchResult) {
            const { route, params } = matchResult;

            if (this.globalBeforeEach)
            {
                const globalResult = await this.globalBeforeEach(
                    route, 
                    this.currentRoute, 
                    params
                );
                
                if (globalResult === false)
                {
                    console.log('Navigation unauthorized by global guard');
                    return;
                }
                
                if (typeof globalResult === 'string')
                {
                    console.log(`Global redirection to ${globalResult}`);
                    this.navigateTo(globalResult);
                    return;
                }
            }

            if (route.beforeEnter)
            {
                const guardResult = await route.beforeEnter(
                    route, 
                    this.currentRoute, 
                    params
                );
                
                if (guardResult === false)
                {
                    console.log('Navigation unauthorized by local path guard');
                    return;
                }
                
                if (typeof guardResult === 'string')
                {
                    console.log(`Redirection by local path guard to ${guardResult}`);
                    this.navigateTo(guardResult);
                    return;
                }
            }
            
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

            this.currentRoute = route;

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

    public setGlobalGuard(guard: NavigationGuard): void {
        this.globalBeforeEach = guard;
    }
}
