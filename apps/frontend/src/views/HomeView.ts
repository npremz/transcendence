import type { ViewFunction } from "../router/types";

export const HomeView: ViewFunction = () => {
    return `
        <div>
            <h1 class="text-3xl">Home</h1>
        </div>
    `;
};
