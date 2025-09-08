import type { ViewFunction } from "../router/types";

export const HomeView: ViewFunction = () => {
    return `
        <div class="container ml-auto mr-auto">
            <h1 class="text-9xl text-amber-300">Home</h1>
        </div>
    `;
};
