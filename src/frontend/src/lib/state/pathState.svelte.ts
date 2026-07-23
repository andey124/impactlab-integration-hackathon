import type { PathNode } from '$lib/types';

class PathState {
	nodes = $state<PathNode[]>([]);
	justAddedId = $state<string | null>(null);

	get hasActiveNode(): boolean {
		return this.nodes.some((node) => node.status === 'active');
	}

	setNodes(nodes: PathNode[]) {
		this.nodes = nodes;
	}

	addNode(node: PathNode) {
		this.nodes = [...this.nodes, node];
		this.justAddedId = node.id;
	}

	markDone(id: string) {
		this.nodes = this.nodes.map((node) =>
			node.id === id ? { ...node, status: 'done' as const } : node
		);
	}
}

export const pathState = new PathState();
