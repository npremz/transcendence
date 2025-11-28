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
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password"
                                    placeholder="Enter your password"
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
                                >>> SUBMIT <<<
                            </button>
                        </form>

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
                        </div>c
                    </div>
                </div>
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
    const form = document.getElementById('loginForm') as HTMLFormElement;
    const submitBtn = document.getElementById('submit-btn');
    
    const handleSubmit = (e?: Event) => {
        if (e) e.preventDefault();
        
        const username = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;

        // Animation du bouton
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            gsap.to(submitBtn, {
                scale: 0.95,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
        }

        // Simule une connexion réussie : enregistre le pseudo et redirige vers l'accueil
        if ((window as any)?.simpleAuth?.setUsername) {
            (window as any).simpleAuth.setUsername(username);
        }
        // Redirige immédiatement vers l'accueil
        // @ts-ignore - router global
        if (window.router?.navigate) {
            window.router.navigate('/');
        } else {
            window.location.assign('/');
        }
    };

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    } else {
        console.warn('[Login] submit button not found, navigation may fail');
    }

    // Enregistrer le cleanup
    cleanupManager.onCleanup(() => {
        if (form) {
            form.removeEventListener('submit', handleSubmit);
        }
<<<<<<< HEAD
    });

    return cleanupManager.getCleanupFunction();
=======
        if (submitBtn) {
            submitBtn.removeEventListener('click', handleSubmit);
        }
    };
>>>>>>> 0351f6be3d080010c47f1b3b2ae56d66816f2d2f
};
