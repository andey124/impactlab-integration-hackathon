<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { matchBrowserLanguage } from '$lib/languages';
	import { userLocale } from '$lib/state/userLocale.svelte';
	import { t } from '$lib/i18n';
	import Brand from '$lib/components/Brand.svelte';
	import LanguagePicker from '$lib/components/LanguagePicker.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';

	const detected = matchBrowserLanguage(browser ? navigator.language : 'en');
	// If already confirmed (returning to change language), skip straight to the picker
	// so the previously-detected browser language can't accidentally overwrite the choice.
	let showPicker = $state(userLocale.confirmed);

	function confirm(code: string) {
		userLocale.set(code);
		goto('/');
	}
</script>

<main class="app-shell">
	<Brand />

	{#if showPicker}
		<div class="card">
			<p class="eyebrow">{t('onboarding_pick_eyebrow')}</p>
			<h1 class="headline" style="margin:.4rem 0 1.1rem">{t('onboarding_pick_heading')}</h1>
			<LanguagePicker onSelect={confirm} />
		</div>
	{:else}
		<div class="card" style="text-align:center">
			<div class="state__emoji" aria-hidden="true">👋</div>
			<h1 class="headline" style="margin:.4rem 0 .5rem">{t('onboarding_welcome')}</h1>
			<p class="subtle" style="margin-bottom:1.4rem">{t('onboarding_subtitle')}</p>
			<p class="subtle" style="margin-bottom:.4rem">{t('onboarding_detected')}</p>
			<p class="headline" style="color:var(--primary);margin-bottom:1.4rem" dir="auto">
				{detected.nativeLabel}
			</p>
			<button class="btn btn-primary btn-lg btn-block" onclick={() => confirm(detected.code)}>
				{t('onboarding_confirm')}
			</button>
			<button
				class="btn btn-ghost btn-block"
				style="margin-top:.75rem"
				onclick={() => (showPicker = true)}
			>
				{t('onboarding_change')}
			</button>
		</div>
	{/if}
</main>

<HelpOverlay text={t('help_onboarding')} />
