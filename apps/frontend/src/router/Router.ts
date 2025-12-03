import type { Route, CleanupFunction, RouteParams, ViewModule, ViewFunction } from './types';
import { ComponentManager } from '../components/ComponantManager'
import { LoadingView } from '../components/LoadingView';
import type { NavigationGuard } from './types';
import {
    logGuard,
    authGuard,
    noActiveGameGuard,
    tournamentExistsGuard,
    roomExistsGuard
} from './Guards'

export class Router {
    private routes: Route[];
	private currentCleanup: CleanupFunction | null = null;
    private componentManager: ComponentManager;
    private currentRoute?: Route;
    private globalBeforeEach?: NavigationGuard;
	private moduleCache: Map<string, ViewModule> = new Map();
	private loadingPromises: Map<string, Promise<ViewModule>> = new Map();

	// Map hardcodée des destinations "back" pour chaque route
	private readonly backRoutes: Map<string, string> = new Map([
		// Pages principales → accueil
		['/play', '/'],
		['/tournament', '/'],
		['/history', '/'],
		['/dashboard', '/'],
		['/login', '/'],
		['/create', '/'],
		['/admin/users', '/'],
		['/dbuser', '/'],
		
		// Parcours Play
		['/play/waiting', '/play'],
		['/local', '/play'],
		
		// Parcours Tournament (local)
		['/local-tournament-setup', '/tournament'],
		['/local-tournament-bracket', '/local-tournament-setup'],
		
		// 404
		['/404', '/'],
		
		// Dev
		['/dev3d', '/'],
	]);
    
    constructor()
    {
        this.routes = [];
        this.componentManager = new ComponentManager();
        this.setupRoutes();
		this.setupLinkInterception();
		this.setupHistoryNavigation();

        this.globalBeforeEach = logGuard;

		// Précharger les routes critiques après le chargement initial
		this.prefetchCriticalRoutes();
    }

	/**
	 * Charge un module de vue de manière lazy avec mise en cache
	 */
	private async loadView(route: Route): Promise<{ view: ViewFunction; onMount?: (params?: RouteParams) => CleanupFunction | void }> {
		// Si la vue est synchrone, retourner directement
		if (route.view) {
			return { view: route.view, onMount: route.onMount };
		}

		// Si pas de lazyView, erreur
		if (!route.lazyView) {
			throw new Error(`Route ${route.path} has no view or lazyView`);
		}

		const cacheKey = route.path;

		// Vérifier le cache
		if (this.moduleCache.has(cacheKey)) {
			const module = this.moduleCache.get(cacheKey)!;
			return this.extractViewFromModule(module);
		}

		// Vérifier si un chargement est déjà en cours
		if (this.loadingPromises.has(cacheKey)) {
			const module = await this.loadingPromises.get(cacheKey)!;
			return this.extractViewFromModule(module);
		}

		// Charger le module
		const loadingPromise = route.lazyView();
		this.loadingPromises.set(cacheKey, loadingPromise);

		try {
			const module = await loadingPromise;
			this.moduleCache.set(cacheKey, module);
			this.loadingPromises.delete(cacheKey);
			return this.extractViewFromModule(module);
		} catch (error) {
			this.loadingPromises.delete(cacheKey);
			console.error(`Failed to load view for ${route.path}:`, error);
			throw error;
		}
	}

	/**
	 * Extrait la fonction de vue et onMount du module chargé
	 */
	private extractViewFromModule(module: ViewModule): { view: ViewFunction; onMount?: (params?: RouteParams) => CleanupFunction | void } {
		// Chercher la fonction de vue selon les conventions de nommage
		// 1. Exports standards: HomeView, QuickPlayView, etc.
		// 2. Export default
		// 3. Export nommé 'view'
		// 4. Premier export fonction trouvé
		let viewFunction: ViewFunction | undefined;

		// Essayer de trouver un export avec pattern *View
		const viewExport = Object.entries(module).find(([key]) =>
			key.endsWith('View') && typeof module[key] === 'function'
		);

		if (viewExport) {
			viewFunction = viewExport[1] as ViewFunction;
		} else {
			// Fallback sur default ou view
			viewFunction = (module.default ||
						   module.view ||
						   Object.values(module).find(exp => typeof exp === 'function' && exp.length <= 1)) as ViewFunction;
		}

		if (!viewFunction || typeof viewFunction !== 'function') {
			throw new Error('No valid view function found in module');
		}

		// Chercher onMount/logic selon les conventions
		// homeLogic, quickPlayLogic, etc. ou onMount
		let onMount: ((params?: RouteParams) => CleanupFunction | void) | undefined;

		const logicExport = Object.entries(module).find(([key]) =>
			key.endsWith('Logic') && typeof module[key] === 'function'
		);

		if (logicExport) {
			onMount = logicExport[1] as (params?: RouteParams) => CleanupFunction | void;
		} else {
			onMount = module.onMount || module.logic;
		}

		return {
			view: viewFunction,
			onMount: onMount as ((params?: RouteParams) => CleanupFunction | void) | undefined
		};
	}

	/**
	 * Précharge une route en arrière-plan
	 */
	public prefetch(path: string): void {
		const matchResult = this.findRoute(path);
		if (matchResult?.route.lazyView && !this.moduleCache.has(matchResult.route.path)) {
			this.loadView(matchResult.route).catch(err => {
				console.warn(`Failed to prefetch ${path}:`, err);
			});
		}
	}

	/**
	 * Précharge les routes critiques définies avec prefetch: true
	 */
	private prefetchCriticalRoutes(): void {
		// Attendre que la page soit chargée avant de précharger
		if (document.readyState === 'complete') {
			this.doPrefetch();
		} else {
			window.addEventListener('load', () => {
				// Attendre un peu pour ne pas ralentir le chargement initial
				setTimeout(() => this.doPrefetch(), 500);
			});
		}
	}

    private doPrefetch(): void {
        this.routes
            .filter(route => route.prefetch)
            .forEach(route => {
                if (route.lazyView) {
					this.loadView(route).catch(err => {
						console.warn(`Failed to prefetch ${route.path}:`, err);
					});
				}
			});
	}

	/**
	 * Retourne la route de retour hardcodée pour le chemin actuel
	 */
	public getBackRoute(): string {
		const currentPath = window.location.pathname;
		
		// Vérifier d'abord la map statique
		const staticBack = this.backRoutes.get(currentPath);
		if (staticBack) {
			return staticBack;
		}
		
		// Patterns dynamiques
		if (currentPath.startsWith('/game/') || currentPath.startsWith('/game3d/')) {
			return '/play';
		}
		if (currentPath.startsWith('/tournament/') && currentPath !== '/tournament') {
			return '/tournament';
		}
		if (currentPath.startsWith('/history/') && currentPath !== '/history') {
			return '/history';
		}
		
		// Fallback → accueil
		return '/';
	}
    
    private setupRoutes(): void
    {
        // Page d'accueil - Eager loading (chargée immédiatement)
		// C'est la première page donc on la charge directement
        this.routes.push({
            path: '/',
            lazyView: () => import('../views/HomeView'),
			prefetch: false,  // Déjà chargée
            title: 'Accueil'
        });

		// QuickPlay - Lazy avec prefetch (page très visitée)
		this.routes.push({
            path: '/play',
            lazyView: () => import('../views/QuickPlayView'),
			prefetch: true,  // Précharger en arrière-plan
            title: 'QuickPlay',
            beforeEnter: authGuard
        });

		// Waiting Room - Lazy
		this.routes.push({
            path: '/play/waiting',
            lazyView: () => import('../views/WaitingRoomView'),
            title: 'Waiting Room',
            beforeEnter: (to, from, params) => {
                const authResult = authGuard(to, from, params);
                if (authResult !== true) {
                    return authResult;
                }
                return noActiveGameGuard(to, from, params);
            }
        });

		// Local Game - Lazy
		this.routes.push({
            path: '/local',
            lazyView: () => import('../views/LocalGameView'),
            title: 'Local Game',
            beforeEnter: authGuard
        });

		// Local Tournament Setup - Lazy
		this.routes.push({
            path: '/local-tournament-setup',
            lazyView: () => import('../views/LocalTournamentSetupView'),
            title: 'Local Tournament Setup',
            beforeEnter: authGuard
        });

		// Local Tournament Bracket - Lazy
		this.routes.push({
            path: '/local-tournament-bracket',
            lazyView: () => import('../views/LocalTournamentBracketView'),
            title: 'Local Tournament Bracket',
            beforeEnter: authGuard
        });

		// Game View - Lazy
		this.routes.push({
            path: '/game/:roomId',
            lazyView: () => import('../views/GameView'),
            title: 'Pong gaming',
            beforeEnter: async (to, from, params) => {
                const authResult = authGuard(to, from, params);
                if (authResult !== true) {
                    return authResult;
                }
                return await roomExistsGuard(to, from, params);
            },
        });

		// Game 3D View - Lazy
		this.routes.push({
            path: '/game3d/:roomId',
            lazyView: () => import('../views/Game3dView'),
            title: 'Pong 3D gaming',
            beforeEnter: async (to, from, params) => {
                const authResult = authGuard(to, from, params);
                if (authResult !== true) {
                    return authResult;
                }
                return await roomExistsGuard(to, from, params);
            },
        });

		// Tournament - Lazy avec prefetch
        this.routes.push({
            path: '/tournament',
            lazyView: () => import('../views/TournamentView'),
			prefetch: true,  // Précharger en arrière-plan
            title: 'Tournament',
            beforeEnter: authGuard
        });

		// Tournament Bracket - Lazy
        this.routes.push({
            path: '/tournament/:id',
            lazyView: () => import('../views/BracketView'),
            title: 'Tounament brackets',
            beforeEnter: async (to, from, params) => {
                const authResult = authGuard(to, from, params);
                if (authResult !== true) {
                    return authResult;
                }
                return await tournamentExistsGuard(to, from, params);
            }
        });

        // DB User - Lazy
        this.routes.push({
            path: '/dbuser',
            lazyView: () => import('../views/DbUserView'),
            title: 'dbUser',
        });

		// User Dashboard - Lazy
		this.routes.push({
			path: '/dashboard',
			lazyView: () => import('../views/UserDashboardView'),
			title: 'User Dashboard',
			prefetch: true
		});

		// History - Lazy
		this.routes.push({
            path: '/history',
            lazyView: () => import('../views/HistoryView'),
            title: 'Historique des Parties'
        });

		// Game Detail - Lazy
        this.routes.push({
            path: '/history/:id',
            lazyView: () => import('../views/GameDetailView'),
            title: 'Détails de la Partie'
        });

		// Chat - Lazy (désactivé temporairement)
		// this.routes.push({
		// 	path: '/chat',
        //     lazyView: () => import('../views/ChatView'),
		// 	title: 'Chat'
		// });

		// Login - Lazy
		this.routes.push({
            path: '/login',
            lazyView: () => import('../views/LoginView'),
            title: 'Login'
        });

		// Create Account - Lazy
		this.routes.push({
            path: '/create',
            lazyView: () => import('../views/CreateAccountView'),
            title: 'Create Account'
        });

		// Admin Users - Lazy
		this.routes.push({
			path: '/admin/users',
            lazyView: () => import('../views/AdminUserView'),
			title: 'Admin Users'
		});

		// Dev 3D - Lazy
		this.routes.push({
			path: '/dev3d',
            lazyView: () => import('../views/Game3dView'),
			title: 'game 3D'
		});

		// 404 Page - Lazy
		this.routes.push({
			path: '/404',
            lazyView: () => import('../views/NotFoundView'),
			title: '404 - Page Not Found'
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
            const targetPath = window.location.pathname;
			const currentPath = this.currentRoute?.path || '/';

			// Bloquer navigation arrière pendant le jeu
			if (currentPath.startsWith('/game/') || currentPath.startsWith('/game3d/'))
			{
                window.history.pushState(null, '', currentPath);
                console.log('Navigation back blocked during game');
                return;
            }

            this.navigate(targetPath, false);
        });
    }

	public navigateTo(path: string): void
    {
        if (window.location.pathname !== path)
        {
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

            if (updateHistory) {
                if (window.location.pathname === path) {
                    window.history.replaceState(null, '', path);
                } else {
                    window.history.pushState(null, '', path);
                }
            }

			// Afficher le loading si vue lazy et non cachée
			const app = document.getElementById('app');
			if (route.lazyView && !this.moduleCache.has(route.path)) {
				if (app) {
					app.innerHTML = LoadingView();
				}
			}

			try {
				// Charger la vue (lazy ou synchrone)
				const { view, onMount } = await this.loadView(route);
				const htmlContent = view(params);

				if (app) {
					app.innerHTML = htmlContent;
				}

				document.title = route.title || 'Transcendence';

				this.componentManager.scanAndMount();

				// Utiliser onMount du module chargé ou de la route
				const mountFunction = onMount || route.onMount;
				if (mountFunction) {
					const cleanup = mountFunction(params);
					if (cleanup && typeof cleanup === 'function') {
						this.currentCleanup = cleanup;
					}
				}

				this.currentRoute = route;

				// Stocker le chemin de la route pour les routes de jeu
				if (path.startsWith('/game/') || path.startsWith('/game3d/')) {
					sessionStorage.setItem('currentGameRoute', path);
				}

				if (typeof window !== 'undefined') {
					const simpleAuth = (window as any).simpleAuth;
					simpleAuth?.syncAuthDom?.();
				}
			} catch (error) {
				console.error('Failed to load view:', error);
				this.show404();
			}

        } else {
            this.show404();
        }
    }

	public goBack(): void {
        const backRoute = this.getBackRoute();
        this.navigateTo(backRoute);
    }

	private cleanup(): void
    {
		// Nettoyer le sessionStorage si on quitte une partie
		const currentPath = this.currentRoute?.path;
		if (currentPath && (currentPath.startsWith('/game/') || currentPath.startsWith('/game3d/'))) {
			console.log('🧹 Cleaning up game session from router');
			sessionStorage.removeItem('gameWsURL');
			sessionStorage.removeItem('currentGameRoute');
			sessionStorage.removeItem('localGameConfig');
			sessionStorage.removeItem('localTournamentMatch');
		}

		// Tuer toutes les animations GSAP en cours
		if (typeof window !== 'undefined' && (window as any).gsap) {
			const gsap = (window as any).gsap;
			gsap.killTweensOf('*');  // Tue toutes les animations
		}

		// Nettoyer les composants
        this.componentManager.cleanupAll();

		// Appeler le cleanup spécifique de la vue
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
    
    private async show404(): Promise<void>
    {
        try {
            const module = await import('../views/NotFoundView');
            const { NotFoundView, notFoundLogic } = module;

            const app = document.getElementById('app');
            if (app) {
                app.innerHTML = NotFoundView();
            }

            document.title = '404 - Page Not Found | Transcendence';

            this.componentManager.scanAndMount();

            if (notFoundLogic) {
                const cleanup = notFoundLogic();
                if (cleanup && typeof cleanup === 'function') {
                    this.currentCleanup = cleanup;
                }
            }
        } catch (error) {
            console.error('Failed to load 404 view:', error);
            const app = document.getElementById('app');
            if (app) {
                app.innerHTML = '<h1>Erm... This page does not exist.</h1>';
            }
        }
    }

    public setGlobalGuard(guard: NavigationGuard): void {
        this.globalBeforeEach = guard;
    }
}
