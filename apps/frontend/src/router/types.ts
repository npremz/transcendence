
export interface Route {
    path: string;
    view: ViewFunction;
    title?: string;
}

export type ViewFunction = () => string;
