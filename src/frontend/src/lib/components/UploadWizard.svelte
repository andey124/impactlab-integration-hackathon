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

<div class="mx-auto flex max-w-md flex-col items-center gap-6 p-6">
	{#if uploadDraft.status === 'submitting'}
		<p class="text-xl">Reading your letter...</p>
	{:else}
		<CameraCapture onCapture={(page) => uploadDraft.addPage(page)} />
		<PagePreviewStrip pages={uploadDraft.pages} onRemove={(i) => uploadDraft.removePage(i)} />
		{#if error}
			<p class="text-xl text-error-500">{error}</p>
		{/if}
		{#if uploadDraft.pages.length > 0}
			<button class="btn preset-filled-primary-500 w-full p-4 text-xl" onclick={submit}>
				Submit
			</button>
		{/if}
	{/if}
</div>
