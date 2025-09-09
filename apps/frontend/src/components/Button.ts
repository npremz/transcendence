import type { ComponentProps } from './types';
import { renderChildren } from './types';

interface ButtonProps extends ComponentProps {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    href?: string;
}

export function Button({ 
    children, 
    variant = 'primary', 
    size = 'md',
    href,
    className = '',
    id
}: ButtonProps): string {
    const variants = {
        primary: 'bg-blue-500 hover:bg-blue-600 text-white',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
        danger: 'bg-red-500 hover:bg-red-600 text-white'
    };
    
    const sizes = {
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg'
    };
    
    const baseClass = `
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg font-medium transition-colors cursor-pointer
		relative block w-fit
        ${className}
    `.replace(/\s+/g, ' ').trim();
    
    const content = renderChildren(children);
    
    if (href) {
        return `<a href="${href}" id=${id} class="${baseClass}">${content}</a>`;
    }
    
    return `<button id=${id} class="${baseClass}">${content}</button>`;
}
