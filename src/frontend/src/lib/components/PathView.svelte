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

	const expandedNode = $derived(pathState.nodes.find((n) => n.id === expandedId) ?? null);
</script>

<div class="path">
	{#each pathState.nodes as node, i (node.id)}
		<div class="path-row" data-side={i % 2 === 0 ? 'left' : 'right'}>
			{#if i > 0}
				<span class="path-connector"></span>
			{/if}
			<PathNodeCircle {node} onTap={() => toggle(node.id)} />
		</div>
	{/each}
</div>

{#if expandedNode}
	<NodeDetailSheet node={expandedNode} onClose={() => (expandedId = null)} />
{/if}
