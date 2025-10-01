import { ChatComponant } from './Chat';
import { PongGame } from './PongGame/PongGame';
import { ComponentRegistry } from './ComponantManager';
import { JoinTournamentComponent } from './JoinTournament';

export function registerComponents(): void
{
    ComponentRegistry.register('chat', ChatComponant)
    ComponentRegistry.register('pong-game', PongGame)
    ComponentRegistry.register('joinTournament', JoinTournamentComponent)
}
