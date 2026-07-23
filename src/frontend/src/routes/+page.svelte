<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { pathState } from '$lib/state/pathState.svelte';
	import PathView from '$lib/components/PathView.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		if (!data.connectionError) {
			pathState.setNodes(data.nodes);
		}
	});
</script>

<main class="mx-auto flex max-w-md flex-col items-center gap-8 p-6">
	{#if data.connectionError}
		<p class="text-xl">We're having trouble connecting.</p>
		<button class="btn preset-filled-primary-500 p-6 text-xl" onclick={() => location.reload()}>
			Try again
		</button>
	{:else if pathState.nodes.length === 0}
		<p class="text-xl">Add your first letter to get started.</p>
		<button class="btn preset-filled-primary-500 p-6 text-xl" onclick={() => goto('/upload')}>
			+ Add a letter
		</button>
	{:else}
		<PathView />
		<button
			class="btn preset-filled-primary-500 p-6 text-xl disabled:opacity-40"
			disabled={pathState.hasActiveNode}
			onclick={() => goto('/upload')}
		>
			+ Add a letter
		</button>
	{/if}
</main>

<HelpOverlay
	text="This is your path. Each circle is a letter you've uploaded. Tap one to see what it says and what to do next."
/>
