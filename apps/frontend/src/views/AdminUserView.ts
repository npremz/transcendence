import type { ViewFunction } from "../router/types";

export const AdminUserView: ViewFunction = () => {
	return `
		<div class="min-h-screen bg-black text-blue-100 flex flex-col">
			<header class="flex items-center justify-between px-6 py-4 border-b border-blue-500/40">
				<h1 class="text-xl font-bold tracking-wide">Admin / User Inspect (temp)</h1>
				<button onclick="window.router?.navigate('/')" class="px-4 py-2 border border-blue-500/60 rounded text-blue-300 hover:bg-blue-500/10 transition">
					← Back
				</button>
			</header>

			<main class="flex-1 px-6 py-4 space-y-4">
				<form id="admin-user-form" class="flex gap-3">
					<input id="admin-user-input" class="flex-1 bg-gray-900 border border-blue-500/40 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="username" autocomplete="off" />
					<button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition">Charger</button>
				</form>

				<pre id="admin-user-output" class="bg-gray-900 border border-blue-500/40 rounded p-3 text-xs overflow-auto h-[70vh]"></pre>
			</main>
		</div>
	`;
};

export const adminUserLogic = (): (() => void) => {
	const hostRaw = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
	const host = (hostRaw || '').replace(/^https?:\/\//, '').trim();
	const form = document.getElementById('admin-user-form') as HTMLFormElement | null;
	const input = document.getElementById('admin-user-input') as HTMLInputElement | null;
	const output = document.getElementById('admin-user-output');

	const render = (data: any) => {
		if (!output) return;
		output.textContent = JSON.stringify(data, null, 2);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!input) return;
		const username = input.value.trim();
		if (!username) return;

		render({ loading: true });

		try {
			const resp = await fetch(`https://${host}/userback/admin/users/details?username=${encodeURIComponent(username)}`);
			const payload = await resp.json().catch(() => ({}));
			render(payload);
		} catch (err) {
			render({ success: false, error: String(err) });
		}
	};

	if (form) form.addEventListener('submit', handleSubmit);

	return () => {
		if (form) form.removeEventListener('submit', handleSubmit);
	};
};
