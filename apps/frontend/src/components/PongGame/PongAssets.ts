export class PongAssets {
	private images: Map<string, HTMLImageElement> = new Map();
	private loaded = false;

	async loadAll(): Promise<void> {
		this.loaded = true;
	}

	getImage(key: string): HTMLImageElement | undefined {
		return (this.images.get(key));
	}

	isLoaded(): boolean {
		return (this.loaded);
	}
}