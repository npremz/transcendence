import { ChatComponant } from './Chat';
import { PongGame } from './PongGame';
import { ComponentRegistry } from './ComponantManager';

export function registerComponents(): void
{
    ComponentRegistry.register('chat', ChatComponant)
    ComponentRegistry.register('pong-game', PongGame)
}
