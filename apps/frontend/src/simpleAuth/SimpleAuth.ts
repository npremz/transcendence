import { v4 as uuidv4 } from 'uuid'

class CookieManager {
    static setCookie(name: string, value: string | null, days: number = 7): void
	{
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
    }

    static getCookie(name: string): string | null
	{
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++)
		{
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    static deleteCookie(name: string): void
	{
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
}

export class SimpleAuth
{
    private static readonly COOKIE_NAME = 'player_session';
    private playerId: string | null;

    constructor()
	{
        this.playerId = this.getOrCreatePlayerId();
    }

    private getOrCreatePlayerId(): string | null
	{
        let playerId = CookieManager.getCookie(SimpleAuth.COOKIE_NAME);
        
        if (!playerId)
		{
            playerId = uuidv4();
            CookieManager.setCookie(SimpleAuth.COOKIE_NAME, playerId, 30);
            console.log('New player ID created:', playerId);
        }
		else
		{
            console.log('Existing player ID found:', playerId);
        }
        
        return playerId;
    }

    getPlayerId(): string | null
	{
        return this.playerId;
    }

    renewSession(): void
	{
        CookieManager.setCookie(SimpleAuth.COOKIE_NAME, this.playerId, 30);
    }

    logout(): void
	{
        CookieManager.deleteCookie(SimpleAuth.COOKIE_NAME);
        this.playerId = uuidv4();
        CookieManager.setCookie(SimpleAuth.COOKIE_NAME, this.playerId, 30);
    }
}
