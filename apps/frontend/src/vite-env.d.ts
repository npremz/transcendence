/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_HOST: string
    readonly VITE_GAME_ENDPOINT: string
    readonly VITE_CHAT_ENDPOINT: string
    readonly VITE_CREATEGAME_ENDPOINT: string
    // Ajoute ici toutes tes variables d'environnement VITE_*
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}