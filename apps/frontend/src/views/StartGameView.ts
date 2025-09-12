import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";
import { 
	Button,
	BackButton,
	SkinButton,
	SettingsButton
 } from "../components/Button";

export const StartGameView: ViewFunction = () => {
    return `
        ${Header({ isLogged: false })}
        <div class="container ml-auto mr-auto p-8">
			${BackButton()}
			${SettingsButton()}
            <h1 class="text-4xl font-bold mb-8">Choisir un mode de jeu</h1>
            
             ${Button({
                children: "⚡ Quickplay",
                variant: "primary",
                size: "lg",
                href: "/game",
            })}
              ${Button({
                children: "🏆 Tournament",
                variant: "primary",
                size: "lg",
               href: "/tournament",
            })}
			${SkinButton()}
        </div>
    `;
};
