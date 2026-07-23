<script lang="ts">
	import { goto } from '$app/navigation';
	import { uploadDraft } from '$lib/state/uploadDraft.svelte';
	import { userLocale } from '$lib/state/userLocale.svelte';
	import { pathState } from '$lib/state/pathState.svelte';
	import { t } from '$lib/i18n';
	import { analyzeDocument, createNode } from '$lib/api/client';
	import CameraCapture from './CameraCapture.svelte';
	import PagePreviewStrip from './PagePreviewStrip.svelte';

	let error = $state<string | null>(null);

	// Mock progress phases shown while the single analyze call is in flight.
	const phaseKeys = [
		'wizard_phase_understanding',
		'wizard_phase_translating',
		'wizard_phase_suggesting'
	] as const;
	let phase = $state(0);

	$effect(() => {
		if (uploadDraft.status !== 'submitting') {
			phase = 0;
			return;
		}
		phase = 0;
		const id = setInterval(() => {
			// Advance, but hold on the last phase until the real response arrives.
			if (phase < phaseKeys.length - 1) phase += 1;
		}, 2500);
		return () => clearInterval(id);
	});

	async function submit() {
		error = null;
		uploadDraft.status = 'submitting';
		try {
			const { translation, nextSteps } = await analyzeDocument(uploadDraft.pages, userLocale.lang);
			const title = `Letter ${pathState.nodes.length + 1}`;
			const { node } = await createNode(title, translation, nextSteps);
			pathState.addNode(node);
			uploadDraft.reset();
			goto('/path');
		} catch {
			error = t('wizard_error');
			uploadDraft.status = 'capturing';
		}
	}
</script>

{#if uploadDraft.status === 'submitting'}
	<div class="loading">
		<div class="spinner"></div>
		<p class="headline" style="font-size:1.3rem">{t('wizard_loading_heading')}</p>
		<ul class="phases" aria-live="polite">
			{#each phaseKeys as key, i}
				<li class="phase" class:phase--active={i === phase} class:phase--done={i < phase}>
					<span class="phase__icon">
						{#if i < phase}✓{:else if i === phase}…{:else}○{/if}
					</span>
					{t(key)}
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<div style="text-align:center">
		<p class="eyebrow">{t('wizard_eyebrow')}</p>
		<h1 class="headline" style="margin-top:.25rem">{t('wizard_heading')}</h1>
	</div>

	<CameraCapture onCapture={(page) => uploadDraft.addPage(page)} hasPages={uploadDraft.pages.length > 0} />
	<PagePreviewStrip pages={uploadDraft.pages} onRemove={(i) => uploadDraft.removePage(i)} />

	{#if error}
		<p class="error-text" style="text-align:center">{error}</p>
	{/if}

	{#if uploadDraft.pages.length > 0}
		<button class="btn btn-primary btn-lg btn-block" onclick={submit}>
			{t('wizard_submit')}
		</button>
	{/if}
{/if}
