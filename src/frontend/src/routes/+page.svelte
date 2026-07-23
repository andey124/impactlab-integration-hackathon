<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import Brand from '$lib/components/Brand.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';
	import ResetDemo from '$lib/components/ResetDemo.svelte';
</script>

<main class="app-shell">
	<Brand />

	<div class="card state">
		<div class="state__emoji" aria-hidden="true">📬</div>
		<h1 class="headline">{t('onboarding_welcome')}</h1>
		<p class="subtle">{t('onboarding_subtitle')}</p>
		<button class="btn btn-primary btn-lg btn-block" onclick={() => goto('/path')}>
			{t('home_welcome_view')}
		</button>
		<button class="btn btn-ghost btn-block" onclick={() => goto('/onboarding')}>
			{t('home_welcome_change')}
		</button>
	</div>

	<ResetDemo />
</main>

<HelpOverlay text={t('help_home_welcome')} />
