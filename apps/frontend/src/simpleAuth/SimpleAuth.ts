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
    private static readonly USERNAME_KEY = 'player_username';
    private static readonly AUTH_STATE_KEY = 'player_authenticated';
    private static readonly AVATAR_KEY = 'player_avatar';
    private playerId: string | null;
    private username: string = 'Anon';
    private isAuthenticated = false;
    private avatarDataUrl: string | null = null;
    private avatarPickerInitialized = false;

    constructor()
{
        this.playerId = this.getOrCreatePlayerId();
        this.username = localStorage.getItem(SimpleAuth.USERNAME_KEY) || 'Anon';
        this.isAuthenticated = localStorage.getItem(SimpleAuth.AUTH_STATE_KEY) === '1';
        this.avatarDataUrl = localStorage.getItem(SimpleAuth.AVATAR_KEY);

        if (typeof document !== 'undefined') {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.syncAuthDom();
                    this.initAvatarPicker();
                });
            } else {
                this.syncAuthDom();
                this.initAvatarPicker();
            }
        }
    }

    private updateStoredUsername(username: string): void {
        this.username = username;
        localStorage.setItem(SimpleAuth.USERNAME_KEY, username);
    }

    private clearStoredUsername(): void {
        this.username = 'Anon';
        localStorage.removeItem(SimpleAuth.USERNAME_KEY);
    }

    private async setAvatar(dataUrl: string | null): Promise<void> {
        this.avatarDataUrl = dataUrl;
        
        if (dataUrl) {
            localStorage.setItem(SimpleAuth.AVATAR_KEY, dataUrl);
            
            if (this.username && this.username !== 'Anon') {
                try {
                    const hostRaw = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
                    const host = (hostRaw || '').replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
                    const protocol = window.location.protocol;

                    await fetch(`${protocol}//${host}/userback/users/avatar`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            username: this.username, 
                            avatar: dataUrl 
                        })
                    });
                    console.log('Avatar synced with server');
                } catch (e) {
                    console.error('Failed to sync avatar', e);
                }
            }
        } else {
            localStorage.removeItem(SimpleAuth.AVATAR_KEY);
        }
        
        this.syncAuthDom();
    }

    private notifyChange(): void {
        this.syncAuthDom();
    }

    private setAuthenticated(state: boolean): void {
        this.isAuthenticated = state;
        localStorage.setItem(SimpleAuth.AUTH_STATE_KEY, state ? '1' : '0');
        this.notifyChange();
    }

    setUsername(username: string): void {
        this.updateStoredUsername(username);
        this.notifyChange();
    }

    login(username: string): void {
        this.updateStoredUsername(username);
        this.setAuthenticated(true);
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

    getUsername(): string {
        return this.username;
    }

    isLoggedIn(): boolean {
        return this.isAuthenticated;
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
        this.clearStoredUsername();
        this.setAvatar(null);
        this.setAuthenticated(false);
    }

    syncAuthDom(): void {
        if (typeof document === 'undefined') {
            return;
        }

        const username = this.username;

        document.querySelectorAll<HTMLElement>('[data-auth-guest]').forEach((el) => {
            if (this.isAuthenticated) {
                el.classList.add('hidden');
            } else {
                el.classList.remove('hidden');
            }
        });

        document.querySelectorAll<HTMLElement>('[data-auth-user]').forEach((el) => {
            if (this.isAuthenticated) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });

        document.querySelectorAll<HTMLElement>('[data-auth-username]').forEach((el) => {
            el.textContent = username;
        });

        const avatarSrc = this.avatarDataUrl || '/sprites/cat.gif';
        document.querySelectorAll<HTMLImageElement>('[data-auth-avatar]').forEach((img) => {
            img.src = avatarSrc;
        });
    }

    private initAvatarPicker(): void {
        if (this.avatarPickerInitialized || typeof document === 'undefined') return;
        this.avatarPickerInitialized = true;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.className = 'hidden';
        input.setAttribute('aria-hidden', 'true');
        document.body.appendChild(input);

        input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                if (typeof result === 'string') {
                    this.setAvatar(result);
                }
            };
            reader.readAsDataURL(file);
            input.value = '';
        });

        document.addEventListener('click', (event) => {
            const target = (event.target as HTMLElement | null)?.closest('[data-avatar-change]');
            if (!target) return;
            event.preventDefault();
            input.click();
        });
    }
}
