<script lang="ts">
	import { LANGUAGES } from '$lib/languages';

	let { onSelect }: { onSelect: (code: string) => void } = $props();
</script>

<div class="lang-grid">
	{#each LANGUAGES as lang (lang.code)}
		<button class="lang-card" onclick={() => onSelect(lang.code)}>
			<span class="lang-card__native" dir="auto">{lang.nativeLabel}</span>
			<span class="lang-card__label">{lang.label}</span>
		</button>
	{/each}
</div>
