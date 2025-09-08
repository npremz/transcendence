
export interface Route {
    path: string;
    view: ViewFunction;
	onMount?: () => void;
    title?: string;
}

export type ViewFunction = () => string;
