<script lang="ts">
	import type { PathNode } from '$lib/types';

	let { node, onTap }: { node: PathNode; onTap: () => void } = $props();

	const statusClass: Record<PathNode['status'], string> = {
		locked: 'preset-tonal-surface opacity-40',
		active: 'preset-filled-primary-500',
		done: 'preset-filled-success-500'
	};
</script>

<button
	class="btn-icon h-20 w-20 rounded-full text-sm {statusClass[node.status]}"
	disabled={node.status === 'locked'}
	onclick={onTap}
>
	{node.title}
</button>
