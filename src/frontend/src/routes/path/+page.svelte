<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { pathState } from '$lib/state/pathState.svelte';
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
	<button class="btn btn-ghost" style="align-self:flex-start" onclick={() => goto('/')}>
		← Home
	</button>

	{#if data.connectionError}
		<div class="card state">
			<div class="state__emoji" aria-hidden="true">🔌</div>
			<h1 class="headline">We're having trouble connecting</h1>
			<p class="subtle">Please check your internet and try again.</p>
			<button class="btn btn-primary btn-lg btn-block" onclick={() => location.reload()}>
				Try again
			</button>
		</div>
	{:else if pathState.nodes.length === 0}
		<div class="card state">
			<div class="state__emoji" aria-hidden="true">✉️</div>
			<h1 class="headline">Let's get started</h1>
			<p class="subtle">
				Add your first letter from a German office and we'll explain it in your language.
			</p>
			<button class="btn btn-primary btn-lg btn-block" onclick={() => goto('/upload')}>
				+ Add a letter
			</button>
		</div>
	{:else}
		<div style="text-align:center">
			<p class="eyebrow">Your path</p>
			<h1 class="headline" style="margin-top:.25rem">Your next steps</h1>
			<p class="subtle" style="margin-top:.35rem">
				{doneCount} of {pathState.nodes.length} done — tap a step to see the details.
			</p>
		</div>

		<PathView />

		<button
			class="btn btn-primary btn-lg btn-block"
			disabled={pathState.hasActiveNode}
			onclick={() => goto('/upload')}
		>
			+ Add a letter
		</button>
		{#if pathState.hasActiveNode}
			<p class="subtle" style="text-align:center;margin-top:-.5rem;font-size:.9rem">
				Finish your current step first.
			</p>
		{/if}
	{/if}
</main>

<HelpOverlay
	text="This is your path. Each circle is a letter you've added. Tap one to see what it says, edit it, and what to do next. Add a new letter with the button at the bottom."
/>
