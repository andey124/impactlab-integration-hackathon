<script lang="ts">
	import type { PathNode } from '$lib/types';

	let { node, onTap }: { node: PathNode; onTap: () => void } = $props();
</script>

<button
	class="station station--{node.status}"
	disabled={node.status === 'locked'}
	onclick={onTap}
>
	<span class="station__dot">
		{#if node.status === 'done'}
			<svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M5 12.5l4.2 4.2L19 7"
					stroke="currentColor"
					stroke-width="2.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{:else if node.status === 'active'}
			<svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<rect x="4" y="3" width="16" height="18" rx="3" stroke="currentColor" stroke-width="2.2" />
				<line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
				<line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
				<line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
			</svg>
		{:else}
			<svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<rect x="5" y="11" width="14" height="9" rx="2.5" stroke="currentColor" stroke-width="2.2" />
				<path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
			</svg>
		{/if}
	</span>
	<span class="station__label">{node.title}</span>
</button>
