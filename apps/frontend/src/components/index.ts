import { PongGame } from './PongGame/PongGame';
import { ComponentRegistry } from './ComponantManager';
import { JoinTournamentComponent } from './JoinTournament';

export function registerComponents(): void
{
    ComponentRegistry.register('pong-game', PongGame)
    ComponentRegistry.register('joinTournament', JoinTournamentComponent)
}
