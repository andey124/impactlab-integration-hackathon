import type { PageLoad } from './$types';
import { fetchPath } from '$lib/api/client';
import type { PathNode } from '$lib/types';

export const load: PageLoad = async (): Promise<{ nodes: PathNode[]; connectionError: boolean }> => {
	try {
		const { nodes } = await fetchPath();
		return { nodes, connectionError: false };
	} catch {
		return { nodes: [], connectionError: true };
	}
};
