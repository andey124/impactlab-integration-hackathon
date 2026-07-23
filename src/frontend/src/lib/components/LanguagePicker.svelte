<script lang="ts">
	import { LANGUAGES } from '$lib/languages';
	import { userLocale } from '$lib/state/userLocale.svelte';

	let { onSelect }: { onSelect: (code: string) => void } = $props();
</script>

<div class="lang-grid">
	{#each LANGUAGES as lang (lang.code)}
		<button
			class="lang-card"
			class:lang-card--active={lang.code === userLocale.lang}
			onclick={() => onSelect(lang.code)}
		>
			<span class="lang-card__native" dir="auto">{lang.nativeLabel}</span>
			<span class="lang-card__label">{lang.label}</span>
		</button>
	{/each}
</div>
