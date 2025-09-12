
export interface Route {
	path: string;
	view: ViewFunction;
	onMount?: () => CleanupFunction | void;
	title?: string;
}

export type ViewFunction = () => string;
export type CleanupFunction = () => void;
