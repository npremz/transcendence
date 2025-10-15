import type { NavigationGuard } from './types';

export const roomExistsGuard: NavigationGuard = async (to, from, params) => {
    const roomId = params?.roomId;
    
    if (!roomId)
	{
        console.log('No room id provided');
        return '/';
    }

	const cachedWsUrl = sessionStorage.getItem('gameWsURL');
    if (cachedWsUrl && cachedWsUrl.includes(roomId)) {
        console.log('Room URL found in cache, allowing navigation');
        return true;
    }
    
    try {
        const host = import.meta.env.VITE_HOST || 'localhost:8443';
        const response = await fetch(
            `https://${host}/quickplay/status/${roomId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            console.log('Invalid room');
            return '/';
        }
        
        const data = await response.json();
        
        if (data.status === 'ready' && data.gameServerURL) {
            console.log('Room exists, statut ready');
            sessionStorage.setItem('gameWsURL', data.gameServerURL);
            return true;
        } else if (data.status === 'waiting') {
            console.log('Room is waiting for players, redirection');
            return '/play';
        } else if (data.status === 'finished') {
            console.log('Room is finished, redirection');
            return '/play';
        } else {
            console.log('Invalid room status:', data.status);
            return '/play';
        }
    } catch (err) {
        console.error('Error while guard checking the room', err);
        return '/';
    }
};

export const tournamentExistsGuard: NavigationGuard = async (to, from, params) => {
    if (!params?.id) {
        console.log('No tournament id provided');
        return '/tournament';
    }
    
    try {
        const host = import.meta.env.VITE_HOST || 'localhost:8443';
        const response = await fetch(
            `https://${host}/tournamentback/tournaments/${params.id}`
        );
        
        if (!response.ok) {
            console.log('Tournament not found');
            return '/tournament';
        }
        
        return true;
    } catch (err) {
        console.error('Error while fetching tournament:', err);
        return '/tournament';
    }
};

export const logGuard: NavigationGuard = (to, from, params) => {
    console.log('📍 Navigation:', {
        from: from?.path || 'initial',
        to: to.path,
        params
    });
    return true;
};
