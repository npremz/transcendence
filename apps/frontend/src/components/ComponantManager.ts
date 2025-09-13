import type { Component } from "./types";

type ComponentConstructor = new (element: HTMLElement) => Component;

export class ComponentRegistry
{
    private static components: Map<string, ComponentConstructor> = new Map();

    static register(name: string, constructor: ComponentConstructor): void
    {
        this.components.set(name, constructor);
    }

    static get(name: string): ComponentConstructor | undefined
    {
        return this.components.get(name);
    }
}

export class ComponentManager
{
    private instances: Map<HTMLElement, Component> = new Map();
    
    scanAndMount(): void
    {
        const components = document.querySelectorAll('[data-component]');
        console.log(components)
        
        components.forEach(element => {
            const componentName = element.getAttribute('data-component');
            if (!componentName) return;
            
            const ComponentClass = ComponentRegistry.get(componentName);
            
            if (ComponentClass && !this.instances.has(element as HTMLElement))
            {
                const instance = new ComponentClass(element as HTMLElement);
                this.instances.set(element as HTMLElement, instance);
            }
        });
    }
    
    cleanupAll(): void
    {
        this.instances.forEach(instance => instance.cleanup());
        this.instances.clear();
    }
}
