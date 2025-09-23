
export interface Route
{
	path: string;
	view: ViewFunction;
	onMount?: (params?: RouteParams) => CleanupFunction | void;
	title?: string;
	regex?: RegExp;
    paramNames?: string[];
}

export type ViewFunction = (params?: RouteParams) => string;
export type CleanupFunction = () => void;
export type RouteParams = Record<string, string>;
