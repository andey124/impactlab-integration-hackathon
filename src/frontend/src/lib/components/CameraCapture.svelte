<script lang="ts">
	let { onCapture }: { onCapture: (base64: string) => void } = $props();

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

<label class="btn preset-filled-primary-500 block w-full cursor-pointer p-8 text-center text-2xl">
	Take a photo
	<input
		type="file"
		accept="image/*"
		capture="environment"
		class="hidden"
		onchange={handleChange}
	/>
</label>
