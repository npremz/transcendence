
// Type pour les modules de vue chargés dynamiquement
export interface ViewModule {
	[key: string]: ViewFunction | ((params?: RouteParams) => CleanupFunction | void);
}

// Type pour le lazy loading - fonction qui retourne une Promise du module
export type LazyViewLoader = () => Promise<ViewModule>;

export interface Route
{
	path: string;
	view?: ViewFunction;  // Vue synchrone (optionnel maintenant)
	lazyView?: LazyViewLoader;  // Vue lazy-loaded (optionnel)
	onMount?: (params?: RouteParams) => CleanupFunction | void;
	title?: string;
	regex?: RegExp;
    paramNames?: string[];

	beforeEnter?: NavigationGuard;
    meta?: Record<string, any>;

	// Options de performance
	prefetch?: boolean;  // Précharger cette route en arrière-plan
}

export type GuardResult = boolean | string | Promise<boolean | string>;

export type NavigationGuard = (
	to: Route,
    from?: Route,
    params?: RouteParams
) => GuardResult;

export type ViewFunction = (params?: RouteParams) => string;
export type CleanupFunction = () => void;
export type RouteParams = Record<string, string>;
