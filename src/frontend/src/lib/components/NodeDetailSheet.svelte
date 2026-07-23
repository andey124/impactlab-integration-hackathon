<script lang="ts">
	import type { PathNode } from '$lib/types';
	import { pathState } from '$lib/state/pathState.svelte';
	import { markNodeDone } from '$lib/api/client';

	let { node, onClose }: { node: PathNode; onClose: () => void } = $props();

	let marking = $state(false);

	async function handleMarkDone() {
		marking = true;
		try {
			await markNodeDone(node.id);
			pathState.markDone(node.id);
			onClose();
		} finally {
			marking = false;
		}
	}
</script>

<div
	class="sheet-backdrop"
	role="button"
	tabindex="-1"
	aria-label="Close"
	onclick={(e) => e.target === e.currentTarget && onClose()}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="sheet" role="dialog" aria-modal="true">
		<div class="sheet__grip"></div>
		<p class="eyebrow">{node.title}</p>
		<h2 class="headline" style="font-size:1.35rem;margin:.35rem 0 .9rem">What this letter says</h2>
		<p class="sheet__translation" dir="auto">{node.translation}</p>

		{#if node.nextSteps.length > 0}
			<h3 class="headline" style="font-size:1.15rem;margin:1.4rem 0 .2rem">What to do next</h3>
			<ol class="steps">
				{#each node.nextSteps as step, i}
					<li class="step">
						<span class="step__num">{i + 1}</span>
						<div class="step__body">
							<span class="step__text" dir="auto">{step.text}</span>
							{#if step.dueDate}
								<span class="pill">
									<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.2" />
										<path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
									</svg>
									Due {step.dueDate}
								</span>
							{/if}
							{#if step.formLinks && step.formLinks.length > 0}
								<div class="link-row">
									{#each step.formLinks as link}
										<a class="link-chip" href={link.url} target="_blank" rel="noopener noreferrer">
											{link.label}
										</a>
									{/each}
								</div>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
		{/if}

		{#if node.status === 'active'}
			<button
				class="btn btn-primary btn-lg btn-block"
				style="margin-top:1.5rem"
				disabled={marking}
				onclick={handleMarkDone}
			>
				{marking ? 'Saving…' : 'Mark this done'}
			</button>
		{/if}
		<button class="btn btn-ghost btn-block" style="margin-top:.6rem" onclick={onClose}>Close</button>
	</div>
</div>
