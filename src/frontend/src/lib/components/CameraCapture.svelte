<script lang="ts">
	let { onCapture, hasPages }: { onCapture: (base64: string) => void; hasPages: boolean } = $props();

	function toBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});
	}

	async function handleChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		onCapture(await toBase64(file));
		input.value = '';
	}
</script>

<label class="dropzone">
	<svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<path
			d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1-1.6A1.5 1.5 0 0 1 10 3.7h4a1.5 1.5 0 0 1 1.3.7l1 1.6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
			stroke="var(--primary)"
			stroke-width="2"
		/>
		<circle cx="12" cy="12.5" r="3.4" stroke="var(--primary)" stroke-width="2" />
	</svg>
	<span class="dropzone__title">{hasPages ? 'Add another page' : 'Take a photo of your letter'}</span>
	<span class="dropzone__hint">Tap to use your camera, or choose a photo</span>
	<input type="file" accept="image/*" capture="environment" class="hidden" onchange={handleChange} />
</label>
