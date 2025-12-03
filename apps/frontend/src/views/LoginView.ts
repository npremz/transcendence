import type { ViewFunction } from "../router/types";
import { gsap } from "gsap";
import { Layout } from "../components/Layout";
import { createCleanupManager } from "../utils/CleanupManager";

export const LoginView: ViewFunction = () => {
    const content = `
            <div class="flex-1 flex items-center justify-center px-4 py-12">
                <div class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <!-- Côté gauche - Animation/Image -->
                    <div class="flex items-center justify-center p-8" id="left-panel">
                        <div class="relative w-full h-full min-h-[400px] neon-border bg-black/50 backdrop-blur-sm rounded-lg overflow-hidden flex items-center justify-center">
                            <!-- GIF ou animation -->
                            <img 
                                src="/sprites/cat.gif" 
                                alt="Animation"
                                class="w-full h-full object-contain"
                                style="image-rendering: pixelated;"
                            />
                            
                            <!-- Overlay avec effet néon -->
                            <div class="absolute inset-0 pointer-events-none" style="
                                background: radial-gradient(circle at center, transparent 40%, rgba(59, 130, 246, 0.1) 100%);
                            "></div>
                        </div>
                    </div>

                    <!-- Côté droit - Formulaire -->
                    <div class="flex flex-col justify-center p-8 neon-border bg-black/50 backdrop-blur-sm rounded-lg" id="right-panel">
                        <!-- Titre -->
                        <div class="text-center mb-8">
                            <h1 class="pixel-font text-4xl md:text-5xl text-blue-400 mb-2" 
                                style="animation: neonPulse 2s ease-in-out infinite;"
                                id="login-title">
                                HELLO!
                            </h1>
                            <h2 class="pixel-font text-xl md:text-2xl text-blue-300 opacity-80">
                                Login your account
                            </h2>
                        </div>

                        <!-- Message d'erreur -->
                        <div id="login-error" class="hidden mb-4 p-3 neon-border bg-red-500/10 rounded">
                            <p class="pixel-font text-xs text-red-400 text-center"></p>
                        </div>

                        <!-- Formulaire -->
                        <form id="loginForm" class="space-y-6">
                            <!-- Username -->
                            <div>
                                <label for="username" class="block mb-2 pixel-font text-sm text-blue-300">
                                    USERNAME:
                                </label>
                                <input 
                                    type="text" 
                                    id="username" 
                                    name="username"
                                    placeholder="Enter your username"
                                    required
                                    class="w-full p-3 rounded pixel-font text-sm neon-input"
                                >
                            </div>

                            <!-- Password -->
                            <div>
                                <label for="password" class="block mb-2 pixel-font text-sm text-blue-300">
                                    PASSWORD:
                                </label>
                                <div class="relative">
                                    <input 
                                        type="password" 
                                        id="password" 
                                        name="password"
                                        placeholder="Enter your password"
                                        required
                                        class="w-full p-3 rounded pixel-font text-sm neon-input pr-12"
                                    >
                                    <button
                                        type="button"
                                        class="absolute inset-y-0 right-2 px-2 text-blue-300 text-xs pixel-font hover:text-white"
                                        data-toggle-password="login-password"
                                    >
                                        SHOW
                                    </button>
                                </div>
                            </div>

                            <!-- Bouton Submit -->
                            <button 
                                type="submit" 
                                class="w-full py-3 pixel-font text-sm neon-border bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 hover:text-white transition-all disabled:opacity-60"
                                id="submit-btn"
                            >
                                >>> SUBMIT <<<
                            </button>
                        </form>

                        <!-- Séparateur OAuth -->
                        <div class="mt-6 flex items-center gap-4">
                            <hr class="flex-1 border-blue-500/30" />
                            <span class="pixel-font text-xs text-blue-300/60">OR</span>
                            <hr class="flex-1 border-blue-500/30" />
                        </div>

                        <!-- Bouton GitHub OAuth -->
                        <button 
                            type="button"
                            class="mt-4 w-full py-3 pixel-font text-sm neon-border bg-gray-800/80 text-white hover:bg-gray-700 transition-all flex items-center justify-center gap-2 rounded"
                            id="github-login-btn"
                        >
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                            </svg>
                            CONTINUE WITH GITHUB
                        </button>

                        <!-- Lien vers création de compte -->
                        <div class="mt-6 text-center">
                            <p class="pixel-font text-xs text-blue-300/60 mb-3">
                                Don't have an account?
                            </p>
                            <a 
                                href="/create" 
                                class="pixel-font text-sm text-blue-400 hover:text-blue-300 transition-colors inline-block"
                            >
                                >>> CREATE ACCOUNT <<<
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div 
                id="login-toast" 
                class="fixed bottom-6 right-6 z-50 px-4 py-3 neon-border bg-emerald-500/20 text-emerald-200 rounded shadow-2xl opacity-0 pointer-events-none translate-y-4"
                aria-live="polite"
            >
                <span class="pixel-font text-sm"></span>
            </div>
    `;

    return Layout.render(content, {
        showBackButton: true,
        showFooter: true
    });
};

export const loginLogic = (): (() => void) => {
    const cleanupManager = createCleanupManager();

    // Enregistrer les cibles GSAP
    cleanupManager.registerGsapTarget('#login-title');
    cleanupManager.registerGsapTarget('#left-panel');
    cleanupManager.registerGsapTarget('#right-panel');
    cleanupManager.registerGsapTarget('#login-error');
    cleanupManager.registerGsapTarget('#login-toast');

    const hostRaw = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
    const host = (hostRaw || '').replace(/^https?:\/\//, '').trim();

    // Animations d'entrée avec GSAP
    gsap.from('#login-title', {
        scale: 0.5,
        opacity: 0,
        duration: 1,
        ease: 'back.out(1.7)'
    });

    gsap.from('#left-panel', {
        x: -100,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
    });

    gsap.from('#right-panel', {
        x: 100,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
    });

    // Gestion du formulaire
    const form = document.getElementById('loginForm') as HTMLFormElement | null;
    const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement | null;
    const errorMessage = document.getElementById('login-error');
    const errorText = errorMessage?.querySelector('p');
    const toast = document.getElementById('login-toast');
    const toastText = toast?.querySelector('span');
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    const passwordToggle = document.querySelector('[data-toggle-password="login-password"]') as HTMLButtonElement | null;

    const hideError = () => {
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }
    };

    const showError = (message: string) => {
        if (!errorMessage || !errorText) return;
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        gsap.fromTo(errorMessage,
            { opacity: 0, scale: 0.9 },
            { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(1.4)' }
        );
    };

    const hideToast = () => {
        if (!toast) return;
        gsap.to(toast, {
            opacity: 0,
            y: 20,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => {
                toast.classList.add('pointer-events-none');
            }
        });
    };

    const showToast = (message: string) => {
        if (!toast || !toastText) return;
        toastText.textContent = message;
        toast.classList.remove('pointer-events-none');
        gsap.killTweensOf(toast);
        gsap.fromTo(toast,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
        );
        cleanupManager.setTimeout(hideToast, 2500);
    };

    const togglePasswordVisibility = () => {
        if (!passwordInput) return;
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        if (passwordToggle) {
            passwordToggle.textContent = isHidden ? 'HIDE' : 'SHOW';
        }
    };

    const animateButton = () => {
        if (!submitBtn) return;
        gsap.to(submitBtn, {
            scale: 0.95,
            duration: 0.1,
            yoyo: true,
            repeat: 1
        });
    };

    const handleSubmit = async () => {
        hideError();

        const username = (document.getElementById('username') as HTMLInputElement)?.value.trim();
        const password = (document.getElementById('password') as HTMLInputElement)?.value;

        if (!username || !password) {
            showError('⚠️ Username and password are required');
            return;
        }

        animateButton();
        if (submitBtn) {
            submitBtn.setAttribute('disabled', 'true');
        }

        try {
            const response = await fetch(`https://${host}/userback/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Important pour envoyer le cookie player_session
                body: JSON.stringify({ username, password })
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload?.success) {
                showError(payload?.error || 'Unable to login, please try again.');
                return;
            }

            const resolvedUsername = payload?.user?.username || username;
            const auth = (window as any)?.simpleAuth;
            if (auth?.login) {
                auth.login(resolvedUsername);
            } else {
                auth?.setUsername?.(resolvedUsername);
            }

            showToast(`✅ Welcome back, ${resolvedUsername}!`);

            cleanupManager.setTimeout(() => {
                // @ts-ignore - router global
                if (window.router?.navigate) {
                    window.router.navigate('/');
                } else {
                    window.location.assign('/');
                }
            }, 900);
        } catch (error) {
            showError('Network error while logging in. Please try again.');
        } finally {
            if (submitBtn) {
                submitBtn.removeAttribute('disabled');
            }
        }
    };

    const onFormSubmit = (e: Event) => {
        e.preventDefault();
        handleSubmit();
    };

    if (form) {
        form.addEventListener('submit', onFormSubmit);
    }
    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    } else {
        console.warn('[Login] submit button not found, navigation may fail');
    }

    if (passwordToggle) {
        passwordToggle.addEventListener('click', togglePasswordVisibility);
    }

    // GitHub OAuth button - navigation directe (bypass router)
    const githubBtn = document.getElementById('github-login-btn') as HTMLButtonElement | null;
    const handleGithubLogin = () => {
        window.location.href = '/userback/auth/github';
    };
    if (githubBtn) {
        githubBtn.addEventListener('click', handleGithubLogin);
    }

    // Enregistrer le cleanup
    cleanupManager.onCleanup(() => {
        if (form) {
            form.removeEventListener('submit', onFormSubmit);
        }
        if (submitBtn) {
            submitBtn.removeEventListener('click', handleSubmit);
        }
        if (passwordToggle) {
            passwordToggle.removeEventListener('click', togglePasswordVisibility);
        }
        if (githubBtn) {
            githubBtn.removeEventListener('click', handleGithubLogin);
        }
    });

    return cleanupManager.getCleanupFunction();
};
