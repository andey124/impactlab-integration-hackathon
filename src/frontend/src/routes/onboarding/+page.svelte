<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { matchBrowserLanguage } from '$lib/languages';
	import { userLocale } from '$lib/state/userLocale.svelte';
	import LanguagePicker from '$lib/components/LanguagePicker.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';

	const detected = matchBrowserLanguage(browser ? navigator.language : 'en');
	let showPicker = $state(false);

	function confirm(code: string) {
		userLocale.set(code);
		goto('/');
	}
</script>

<main class="mx-auto flex max-w-md flex-col items-center gap-8 p-6">
	{#if showPicker}
		<LanguagePicker onSelect={confirm} />
	{:else}
		<p class="text-2xl">We think you speak <strong>{detected.label}</strong> — is that right?</p>
		<button
			class="btn preset-filled-primary-500 w-full p-6 text-xl"
			onclick={() => confirm(detected.code)}
		>
			Yes, that's right
		</button>
		<button class="btn preset-tonal-surface w-full p-4 text-lg" onclick={() => (showPicker = true)}>
			Choose a different language
		</button>
	{/if}
</main>

<HelpOverlay text="This tells DocuAId which language to use when explaining your letters." />
