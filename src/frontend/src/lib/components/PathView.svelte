<script lang="ts">
	import { pathState } from '$lib/state/pathState.svelte';
	import PathNodeCircle from './PathNodeCircle.svelte';
	import NodeDetailSheet from './NodeDetailSheet.svelte';

	// Auto-expand the node just created by the upload flow, then clear the
	// flag so it doesn't re-trigger on a later remount.
	let expandedId = $state<string | null>(pathState.justAddedId);
	pathState.justAddedId = null;

	function toggle(id: string) {
		expandedId = expandedId === id ? null : id;
	}
</script>

<ol class="flex flex-col items-center gap-6">
	{#each pathState.nodes as node (node.id)}
		<li class="flex flex-col items-center gap-2">
			<PathNodeCircle {node} onTap={() => toggle(node.id)} />
			{#if expandedId === node.id}
				<NodeDetailSheet {node} onClose={() => (expandedId = null)} />
			{/if}
		</li>
	{/each}
</ol>
