<script lang="ts">
	import { goto } from '$app/navigation';
	import { resetPath } from '$lib/api/client';
	import { pathState } from '$lib/state/pathState.svelte';
	import { userLocale } from '$lib/state/userLocale.svelte';

	let open = $state(false);
	let resetting = $state(false);

	async function confirmReset() {
		resetting = true;
		try {
			await resetPath();
		} catch {
			// Even if the wipe call fails, clear the local view so the demo can restart.
		}
		pathState.setNodes([]);
		userLocale.reset();
		goto('/onboarding');
	}
</script>

<button class="btn btn-ghost btn-block" onclick={() => (open = true)}>Reset demo</button>

{#if open}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="-1"
		aria-label="Close"
		onclick={(e) => e.target === e.currentTarget && (open = false)}
		onkeydown={(e) => e.key === 'Escape' && (open = false)}
	>
		<div class="modal" role="dialog" aria-modal="true">
			<div class="state__emoji" aria-hidden="true">♻️</div>
			<p style="font-size:1.1rem">
				This deletes every letter and your language choice, and starts the demo over. This cannot be
				undone.
			</p>
			<button class="btn btn-primary btn-block" disabled={resetting} onclick={confirmReset}>
				{resetting ? 'Resetting…' : 'Yes, reset everything'}
			</button>
			<button class="btn btn-ghost btn-block" onclick={() => (open = false)}>Cancel</button>
		</div>
	</div>
{/if}
