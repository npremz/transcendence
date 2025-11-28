import type { ViewFunction } from "../router/types";
import { gsap } from "gsap";
import { Layout } from "../components/Layout";

export const CreateAccountView: ViewFunction = () => {
    const content = `
            <div class="flex-1 flex items-center justify-center px-4 py-12">
                <div class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <!-- Côté gauche - Animation/Image -->
                    <div class="flex items-center justify-center p-8" id="left-panel">
                        <div class="relative w-full h-full min-h-[500px] neon-border bg-black/50 backdrop-blur-sm rounded-lg overflow-hidden flex items-center justify-center">
                            <!-- GIF ou animation -->
                            <img 
                                src="/sprites/dancing-cat.gif" 
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
                    <div class="flex flex-col justify-center p-8 neon-border bg-black/50 backdrop-blur-sm rounded-lg relative" id="right-panel">
                        <!-- Titre -->
                        <div class="text-center mb-8">
                            <h1 class="pixel-font text-4xl md:text-5xl text-blue-400 mb-2" 
                                style="animation: neonPulse 2s ease-in-out infinite;"
                                id="create-title">
                                HELLO!
                            </h1>
                            <h2 class="pixel-font text-xl md:text-2xl text-blue-300 opacity-80">
                                Create your account
                            </h2>
                        </div>

                        <!-- Message d'erreur -->
                        <div id="error-message" class="hidden mb-4 p-3 neon-border bg-red-500/10 rounded">
                            <p class="pixel-font text-xs text-red-400 text-center"></p>
                        </div>

                        <!-- Formulaire -->
                        <form id="createForm" class="space-y-6">
                            <!-- Username -->
                            <div>
                                <label for="username" class="block mb-2 pixel-font text-sm text-blue-300">
                                    USERNAME:
                                </label>
                                <input 
                                    type="text" 
                                    id="username" 
                                    name="username"
                                    placeholder="Enter username"
                                    required
                                    minlength="3"
                                    maxlength="20"
                                    class="w-full p-3 rounded pixel-font text-sm neon-input"
                                >
                            </div>

                            <!-- Password -->
                            <div>
                                <label for="password" class="block mb-2 pixel-font text-sm text-blue-300">
                                    PASSWORD:
                                </label>
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password"
                                    placeholder="Enter password"
                                    required
                                    minlength="6"
                                    class="w-full p-3 rounded pixel-font text-sm neon-input"
                                >
                            </div>

                            <!-- Confirm Password -->
                            <div>
                                <label for="confirmpassword" class="block mb-2 pixel-font text-sm text-blue-300">
                                    CONFIRM PASSWORD:
                                </label>
                                <input 
                                    type="password" 
                                    id="confirmpassword" 
                                    name="confirmpassword"
                                    placeholder="Confirm your password"
                                    required
                                    class="w-full p-3 rounded pixel-font text-sm neon-input"
                                >
                            </div>

                            <!-- Bouton Submit -->
                            <button 
                                type="button" 
                                class="w-full py-3 pixel-font text-sm neon-border bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 hover:text-white transition-all"
                                id="submit-btn"
                            >
                                >>> CREATE ACCOUNT <<<
                            </button>
                        </form>

                        <!-- Lien vers login -->
                        <div class="mt-6 text-center">
                            <p class="pixel-font text-xs text-blue-300/60 mb-3">
                                Already have an account?
                            </p>
                            <a 
                                href="/login" 
                                class="pixel-font text-sm text-blue-400 hover:text-blue-300 transition-colors inline-block"
                            >
                                >>> LOGIN <<<
                            </a>
                        </div>
                    </div>
                </div>
            </div>
    `;

    return Layout.render(content, {
        showBackButton: true,
        showFooter: true
    });
};

export const createAccountLogic = (): (() => void) => {
    gsap.from('#create-title', {
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
    const form = document.getElementById('createForm') as HTMLFormElement | null;
    const errorMessage = document.getElementById('error-message');
    const errorText = errorMessage?.querySelector('p');
    const hostRaw = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
    const host = (hostRaw || '').replace(/^https?:\/\//, '').trim();
    const submitBtn = document.getElementById('submit-btn');
    
    const showError = (message: string) => {
        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
            
            // Animation de l'erreur
            gsap.fromTo(errorMessage, 
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out' }
            );
        }
    };

    const hideError = () => {
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }
    };

    const handleSubmit = async () => {
        hideError();
        
        const username = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirmpassword') as HTMLInputElement).value;

        // Validation
        if (username.length < 3 || username.length > 20) {
            showError('⚠️ Username must be between 3 and 20 characters');
            return;
        }

        const hasMinLength = password.length >= 6;
        const hasDigit = /\d/.test(password);
        const hasUpper = /[A-Z]/.test(password);

        if (!hasMinLength || !hasDigit || !hasUpper) {
            showError('⚠️ Password must be 6+ chars, include 1 digit and 1 uppercase');
            return;
        }

        if (password !== confirmPassword) {
            showError('⚠️ Passwords do not match');
            
            // Ajouter classe error aux champs password
            const passwordInput = document.getElementById('password') as HTMLInputElement;
            const confirmInput = document.getElementById('confirmpassword') as HTMLInputElement;
            passwordInput?.classList.add('error');
            confirmInput?.classList.add('error');
            
            // Retirer après 2 secondes
            setTimeout(() => {
                passwordInput?.classList.remove('error');
                confirmInput?.classList.remove('error');
            }, 2000);
            
            return;
        }

        // Animation du bouton
        if (submitBtn) {
            gsap.to(submitBtn, {
                scale: 0.95,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
            submitBtn.setAttribute('disabled', 'true');
        }

        try {
            const response = await fetch(`https://${host}/userback/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                showError(payload?.error || 'Unable to create account, please try again.');
                return;
            }

            gsap.to('#right-panel', {
                scale: 1.05,
                duration: 0.2,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    setTimeout(() => {
                        // @ts-ignore - router is injected globally by the app
                        window.router?.navigate('/login');
                    }, 300);
                }
            });
        } catch (err) {
            showError('Network error while creating account. Please try again.');
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
    }

    // Cleanup
    return () => {
        if (form) {
            form.removeEventListener('submit', onFormSubmit);
        }
        if (submitBtn) {
            submitBtn.removeEventListener('click', handleSubmit);
        }
    };
};
