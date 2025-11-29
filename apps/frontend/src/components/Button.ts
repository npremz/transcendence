import type { ComponentProps } from './types';
import { renderChildren } from './types';

// ============= BUTTON DE BASE =============
interface ButtonProps extends ComponentProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'default';
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
        danger: 'bg-red-500 hover:bg-red-600 text-white',
        default: ''
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

// ============= SETTINGS BUTTON =============
interface SettingsButtonProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function SettingsButton({ 
    className = '', 
    size = 'md' 
}: SettingsButtonProps = {}): string {
    return Button({
        children: "⚙️",
        variant: "default",
        size: size,
        href: "/settings",
        className: className,
        id: "settings-button"
    });
}

// ============= SKIN BUTTON =============
interface SkinButtonProps extends ButtonProps {
    showLabel?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'default';
}

export function SkinButton({ 
    className = '', 
    size = 'md',
    showLabel = true,
    variant = 'default'
}: SkinButtonProps = {}): string {
    const buttonContent = showLabel ? "🎨" : "🎨";
    
    return Button({
        children: buttonContent,
        variant: variant,
        size: size,
        href: "/customization",
        className: className,
        id: "skin-button"
    });
}

// ============= COFFEE BUTTON =============
interface CoffeeButtonProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
}

export function CoffeeButton({ 
    className = '', 
    size = 'md',
    showIcon = true
}: CoffeeButtonProps = {}): string {
    const content = showIcon ? "☕ Buy me a Coffee" : "Buy me a Coffee";
    
    return Button({
        children: content,
        variant: "default",
        size: size,
        href: "/cafe",
        className: `bg-yellow-500 hover:bg-yellow-600 ${className}`,
        id: "coffee-button"
    });
}

// ============= BACK BUTTON =============
interface BackButtonProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'default';
    fallbackHref?: string;
}

export function BackButton({ 
    className = '', 
    size,
    text = "←",
    variant = 'default',
    fallbackHref = '/'
}: BackButtonProps = {}): string {
    return `
        <button 
            id="back-button"
            type="button"
            data-smart-back="${fallbackHref}"
            class="
                ${variant === 'primary' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                ${variant === 'secondary' ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : ''}
                ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                ${size === 'sm' ? 'px-3 py-1 text-sm' : ''}
                ${size === 'md' ? 'px-4 py-2' : ''}
                ${size === 'lg' ? 'px-6 py-3 text-lg' : ''}
                rounded-lg font-medium transition-colors cursor-pointer
                relative block w-fit
                ${className}
            "
        >
            ${text}
        </button>
    `;
}
