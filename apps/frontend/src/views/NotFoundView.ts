import type { ViewFunction, CleanupFunction } from "../router/types";
import { gsap } from "gsap";
import { Layout } from "../components/Layout";
import { createCleanupManager } from "../utils/CleanupManager";

export const NotFoundView: ViewFunction = () => {
    const content = `
        <div class="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <!-- Animated 404 -->
            <div class="text-center mb-8">
                <h1 class="pixel-font text-8xl md:text-9xl text-red-500 mb-4"
                    id="error-code"
                    style="opacity: 0; text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);">
                    404
                </h1>
                <div class="pixel-font text-2xl md:text-3xl text-blue-400 mb-2" id="error-message" style="opacity: 0;">
                    PAGE NOT FOUND
                </div>
                <p class="pixel-font text-sm md:text-base text-blue-300 opacity-80" id="error-subtitle" style="opacity: 0;">
                    >>> LOOKS LIKE YOU'VE HIT A WALL <<<
                </p>
            </div>

            <!-- Glitch effect decoration -->
            <div class="my-12 relative" id="glitch-container" style="opacity: 0;">
                <div class="pixel-font text-6xl text-blue-500 opacity-20">
                    ⚠
                </div>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-col md:flex-row gap-4 mt-8" id="action-buttons" style="opacity: 0;">
                <a href="/"
                   class="neon-border px-8 py-4 pixel-font text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 transition-all">
                    ← GO HOME
                </a>
                <button
                   onclick="window.history.back()"
                   class="neon-border px-8 py-4 pixel-font text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 transition-all">
                    ↶ GO BACK
                </button>
            </div>

            <!-- Error details -->
            <div class="mt-12 max-w-2xl w-full neon-border p-6"
                 id="error-details"
                 style="background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px); opacity: 0;">
                <h3 class="pixel-font text-lg text-blue-400 mb-4">
                    DIAGNOSTIC:
                </h3>
                <div class="pixel-font text-sm text-blue-300 space-y-2 opacity-80">
                    <p>→ URL: <span class="text-pink-400" id="current-url"></span></p>
                    <p>→ STATUS: <span class="text-red-500">ROUTE NOT FOUND</span></p>
                    <p>→ SUGGESTION: Check the URL or navigate to a valid page</p>
                </div>
            </div>
        </div>
    `;

    return Layout.render(content, {
        showFooter: true,
        showBackButton: false
    });
};

export const notFoundLogic = (): CleanupFunction => {
    const cleanupManager = createCleanupManager();
    cleanupManager.registerGsapTarget('#error-code');
    cleanupManager.registerGsapTarget('#error-message');
    cleanupManager.registerGsapTarget('#error-subtitle');
    cleanupManager.registerGsapTarget('#glitch-container');
    cleanupManager.registerGsapTarget('#action-buttons');
    cleanupManager.registerGsapTarget('#error-details');

    // Display current URL
    const urlElement = document.getElementById('current-url');
    if (urlElement) {
        urlElement.textContent = window.location.pathname;
    }

    // Glitch animation for 404
    gsap.to('#error-code', {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.inOut'
    });

    // Glitch effect
    const glitchTimeline = gsap.timeline({ repeat: -1, repeatDelay: 3 });
    glitchTimeline
        .to('#error-code', {
            x: -5,
            duration: 0.05
        })
        .to('#error-code', {
            x: 5,
            duration: 0.05
        })
        .to('#error-code', {
            x: -3,
            duration: 0.05
        })
        .to('#error-code', {
            x: 0,
            duration: 0.05
        });

    cleanupManager.registerGsapTarget(glitchTimeline);

    // Staggered entrance animations
    gsap.to('#error-message', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 0.3,
        ease: 'power2.out'
    });

    gsap.to('#error-subtitle', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 0.5,
        ease: 'power2.out'
    });

    gsap.to('#glitch-container', {
        opacity: 1,
        scale: 1,
        duration: 1,
        delay: 0.7,
        ease: 'back.out(1.7)'
    });

    gsap.to('#action-buttons', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 0.9,
        ease: 'power2.out'
    });

    gsap.to('#error-details', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 1.1,
        ease: 'power2.out'
    });

    return cleanupManager.getCleanupFunction();
};
