import type { PageLoad } from './$types';
import { fetchPath } from '$lib/api/client';
import { userLocale } from '$lib/state/userLocale.svelte';
import type { PathNode } from '$lib/types';

export const load: PageLoad = async ({
	fetch
}): Promise<{ nodes: PathNode[]; connectionError: boolean }> => {
	try {
		// Pass the chosen language so the backend can seed the example path in it.
		const { nodes } = await fetchPath(fetch, userLocale.lang);
		return { nodes, connectionError: false };
	} catch {
		return { nodes: [], connectionError: true };
	}
};
