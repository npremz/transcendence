// apps/frontend/src/views/LoginView.ts
import type { ViewFunction } from "../router/types";
import { gsap } from "gsap";

export const LoginView: ViewFunction = () => {
    return `
        <!-- Fond avec grille animée (même que HomeView) -->
        <div class="fixed inset-0 bg-black overflow-hidden">
            <!-- Grille de fond -->
            <div class="absolute inset-0" style="
                background-image: 
                    linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
                background-size: 50px 50px;
                animation: gridMove 20s linear infinite;
            "></div>
            
            <style>
                @keyframes gridMove {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(50px); }
                }
                
                @keyframes neonPulse {
                    0%, 100% { 
                        text-shadow: 
                            0 0 10px rgba(59, 130, 246, 0.8),
                            0 0 20px rgba(59, 130, 246, 0.6),
                            0 0 30px rgba(59, 130, 246, 0.4);
                    }
                    50% { 
                        text-shadow: 
                            0 0 20px rgba(59, 130, 246, 1),
                            0 0 30px rgba(59, 130, 246, 0.8),
                            0 0 40px rgba(59, 130, 246, 0.6);
                    }
                }
                
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100vh); }
                }
                
                .pixel-font {
                    font-family: 'Courier New', monospace;
                    font-weight: bold;
                    letter-spacing: 0.1em;
                }
                
                .neon-border {
                    box-shadow: 
                        0 0 10px rgba(59, 130, 246, 0.5),
                        inset 0 0 10px rgba(59, 130, 246, 0.2);
                    border: 3px solid rgba(59, 130, 246, 0.8);
                }
                
                .neon-border:hover {
                    box-shadow: 
                        0 0 20px rgba(59, 130, 246, 0.8),
                        inset 0 0 20px rgba(59, 130, 246, 0.3);
                    border-color: rgba(59, 130, 246, 1);
                }
                
                .neon-input {
                    background: rgba(15, 23, 42, 0.6);
                    border: 2px solid rgba(59, 130, 246, 0.5);
                    color: #60A5FA;
                    transition: all 0.3s ease;
                }
                
                .neon-input:focus {
                    outline: none;
                    border-color: rgba(59, 130, 246, 1);
                    box-shadow: 
                        0 0 10px rgba(59, 130, 246, 0.5),
                        inset 0 0 10px rgba(59, 130, 246, 0.2);
                    background: rgba(15, 23, 42, 0.8);
                }
                
                .neon-input::placeholder {
                    color: rgba(96, 165, 250, 0.4);
                }
            </style>
            
            <!-- Scanline effect -->
            <div class="absolute inset-0 pointer-events-none opacity-10">
                <div class="absolute w-full h-1 bg-blue-400" style="animation: scanline 8s linear infinite;"></div>
            </div>
        </div>

        <!-- Contenu principal -->
        <div class="relative z-10 min-h-screen flex flex-col">
            <!-- Header avec BackButton -->
            <div class="p-8">
                <button 
                    onclick="history.back()" 
                    class="pixel-font px-6 py-3 neon-border bg-transparent text-blue-400 hover:bg-blue-500/10 transition-all"
                    id="back-button"
                >
                    ← BACK
                </button>
            </div>

            <!-- Zone centrale -->
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
                        <form action="/login" method="POST" id="loginForm" class="space-y-6">
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
                                type="submit" 
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

            <!-- Footer -->
            <footer class="text-center py-6 pixel-font text-xs text-blue-400 opacity-50">
                <p>© 2025 PONG - SKILL ISSUE</p>
            </footer>
        </div>
    `;
};

export const loginLogic = (): (() => void) => {
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
    
    const handleSubmit = (e: Event) => {
        e.preventDefault();
        
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

        // TODO: Logique de connexion réelle
        console.log('Login attempt:', { username, password });
        
        // Exemple de redirection après succès
        // window.router.navigate('/');
    };

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    // Cleanup
    return () => {
        if (form) {
            form.removeEventListener('submit', handleSubmit);
        }
    };
};
