<script lang="ts">
	import { LANGUAGES } from '$lib/languages';

	let { onSelect }: { onSelect: (code: string) => void } = $props();
</script>

<div class="grid w-full grid-cols-2 gap-4">
	{#each LANGUAGES as lang (lang.code)}
		<button class="btn preset-tonal-surface p-6 text-xl" onclick={() => onSelect(lang.code)}>
			{lang.nativeLabel}
		</button>
	{/each}
</div>
