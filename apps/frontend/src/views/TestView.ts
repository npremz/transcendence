import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";
import { Chat } from "../components/Chat";

export const TestView: ViewFunction = () => {
	return `
		${Header({ isLogged: false })}
		<div class="container ml-auto mr-auto mt-8">
			${Chat({ type: 'global' })}
		</div>
		<div class="container ml-auto mr-auto mt-8">
			${Chat({ type: 'global' })}
		</div>
	`;
};

export const initWebSocket : (() => void | void) = () => {

	return () => {

	}
}
