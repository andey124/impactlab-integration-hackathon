<script lang="ts">
	import type { PathNode } from '$lib/types';
	import { pathState } from '$lib/state/pathState.svelte';
	import { markNodeDone } from '$lib/api/client';

	let { node, onClose }: { node: PathNode; onClose: () => void } = $props();

	let marking = $state(false);

	async function handleMarkDone() {
		marking = true;
		await markNodeDone(node.id);
		pathState.markDone(node.id);
		marking = false;
		onClose();
	}
</script>

<div class="card preset-tonal-surface w-full max-w-md p-6">
	<p class="text-lg">{node.translation}</p>
	<ul class="mt-4 flex flex-col gap-2">
		{#each node.nextSteps as step}
			<li class="text-lg">
				{step.text}
				{#if step.dueDate}
					<span class="block text-sm opacity-70">Due: {step.dueDate}</span>
				{/if}
			</li>
		{/each}
	</ul>
	{#if node.status === 'active'}
		<button
			class="btn preset-filled-success-500 mt-4 w-full p-4 text-xl"
			disabled={marking}
			onclick={handleMarkDone}
		>
			Mark done
		</button>
	{/if}
</div>
