import { ChatComponant } from './Chat';
import { ComponentRegistry } from './ComponantManager';

export function registerComponents(): void
{
    ComponentRegistry.register('chat', ChatComponant)
}
