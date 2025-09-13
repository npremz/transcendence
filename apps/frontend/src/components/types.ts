export interface ComponentProps {
    children?: string | string[];
    className?: string;
    id?: string;
    [key: string]: any;
}

export function renderChildren(children?: string | string[]): string {
    if (!children) return '';
    return Array.isArray(children) ? children.join('') : children;
}

export interface Component
{
    cleanup(): void;
}