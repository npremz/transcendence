
export interface Route
{
	path: string;
	view: ViewFunction;
	onMount?: (params?: RouteParams) => CleanupFunction | void;
	title?: string;
	regex?: RegExp;
    paramNames?: string[];

	beforeEnter?: NavigationGuard;
    meta?: Record<string, any>;
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
