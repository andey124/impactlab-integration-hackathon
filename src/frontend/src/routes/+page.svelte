<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { pathState } from '$lib/state/pathState.svelte';
	import { t, tFn } from '$lib/i18n';
	import Brand from '$lib/components/Brand.svelte';
	import PathView from '$lib/components/PathView.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		if (!data.connectionError) {
			pathState.setNodes(data.nodes);
		}
	});

	const doneCount = $derived(pathState.nodes.filter((n) => n.status === 'done').length);
</script>

<main class="app-shell">
	<Brand />

	{#if data.connectionError}
		<div class="card state">
			<div class="state__emoji" aria-hidden="true">🔌</div>
			<h1 class="headline">{t('home_error_heading')}</h1>
			<p class="subtle">{t('home_error_subtitle')}</p>
			<button class="btn btn-primary btn-lg btn-block" onclick={() => location.reload()}>
				{t('home_error_retry')}
			</button>
		</div>
	{:else if pathState.nodes.length === 0}
		<div class="card state">
			<div class="state__emoji" aria-hidden="true">✉️</div>
			<h1 class="headline">{t('home_empty_heading')}</h1>
			<p class="subtle">{t('home_empty_subtitle')}</p>
			<button class="btn btn-primary btn-lg btn-block" onclick={() => goto('/upload')}>
				{t('home_add')}
			</button>
		</div>
	{:else}
		<div style="text-align:center">
			<p class="eyebrow">{t('home_eyebrow')}</p>
			<h1 class="headline" style="margin-top:.25rem">{t('home_heading')}</h1>
			<p class="subtle" style="margin-top:.35rem">
				{tFn('home_progress')(doneCount, pathState.nodes.length)}
			</p>
		</div>

		<PathView />

		<button
			class="btn btn-primary btn-lg btn-block"
			disabled={pathState.hasActiveNode}
			onclick={() => goto('/upload')}
		>
			{t('home_add')}
		</button>
		{#if pathState.hasActiveNode}
			<p class="subtle" style="text-align:center;margin-top:-.5rem;font-size:.9rem">
				{t('home_active_block')}
			</p>
		{/if}
	{/if}
</main>

<HelpOverlay text={t('help_home')} />
