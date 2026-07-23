<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { matchBrowserLanguage } from '$lib/languages';
	import { userLocale } from '$lib/state/userLocale.svelte';
	import Brand from '$lib/components/Brand.svelte';
	import LanguagePicker from '$lib/components/LanguagePicker.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';

	const detected = matchBrowserLanguage(browser ? navigator.language : 'en');
	let showPicker = $state(false);

	function confirm(code: string) {
		userLocale.set(code);
		goto('/');
	}
</script>

<main class="app-shell">
	<Brand />

	{#if showPicker}
		<div class="card">
			<p class="eyebrow">Choose your language</p>
			<h1 class="headline" style="margin:.4rem 0 1.1rem">Which language should we use?</h1>
			<LanguagePicker onSelect={confirm} />
		</div>
	{:else}
		<div class="card" style="text-align:center">
			<div class="state__emoji" aria-hidden="true">👋</div>
			<h1 class="headline" style="margin:.4rem 0 .5rem">Welcome to DocuAId</h1>
			<p class="subtle" style="margin-bottom:1.4rem">
				We help you understand letters from German offices and show you what to do next — in your
				language.
			</p>
			<p class="subtle" style="margin-bottom:.4rem">We think you speak</p>
			<p class="headline" style="color:var(--primary);margin-bottom:1.4rem" dir="auto">
				{detected.nativeLabel}
			</p>
			<button class="btn btn-primary btn-lg btn-block" onclick={() => confirm(detected.code)}>
				Yes, that's right
			</button>
			<button
				class="btn btn-ghost btn-block"
				style="margin-top:.75rem"
				onclick={() => (showPicker = true)}
			>
				Choose a different language
			</button>
		</div>
	{/if}
</main>

<HelpOverlay text="This tells DocuAId which language to use when explaining your letters. You can pick the language you understand best." />
