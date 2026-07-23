<script lang="ts">
	import { goto } from '$app/navigation';
	import { uploadDraft } from '$lib/state/uploadDraft.svelte';
	import { userLocale } from '$lib/state/userLocale.svelte';
	import { pathState } from '$lib/state/pathState.svelte';
	import { analyzeDocument, createNode } from '$lib/api/client';
	import CameraCapture from './CameraCapture.svelte';
	import PagePreviewStrip from './PagePreviewStrip.svelte';

	let error = $state<string | null>(null);

	async function submit() {
		error = null;
		uploadDraft.status = 'submitting';
		try {
			const { translation, nextSteps } = await analyzeDocument(uploadDraft.pages, userLocale.lang);
			const title = `Letter ${pathState.nodes.length + 1}`;
			const { node } = await createNode(title, translation, nextSteps);
			pathState.addNode(node);
			uploadDraft.reset();
			goto('/');
		} catch {
			error = "That didn't work — let's try again.";
			uploadDraft.status = 'capturing';
		}
	}
</script>

{#if uploadDraft.status === 'submitting'}
	<div class="loading">
		<div class="spinner"></div>
		<p class="headline" style="font-size:1.3rem">Reading your letter…</p>
		<p class="subtle">Translating it and finding your next steps.</p>
	</div>
{:else}
	<div style="text-align:center">
		<p class="eyebrow">New letter</p>
		<h1 class="headline" style="margin-top:.25rem">Add your letter</h1>
	</div>

	<CameraCapture onCapture={(page) => uploadDraft.addPage(page)} hasPages={uploadDraft.pages.length > 0} />
	<PagePreviewStrip pages={uploadDraft.pages} onRemove={(i) => uploadDraft.removePage(i)} />

	{#if error}
		<p class="error-text" style="text-align:center">{error}</p>
	{/if}

	{#if uploadDraft.pages.length > 0}
		<button class="btn btn-primary btn-lg btn-block" onclick={submit}>
			Translate this letter
		</button>
	{/if}
{/if}
