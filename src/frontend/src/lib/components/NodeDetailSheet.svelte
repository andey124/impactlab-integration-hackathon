<script lang="ts">
	import type { NextStep, PathNode } from '$lib/types';
	import { pathState } from '$lib/state/pathState.svelte';
	import { markNodeDone, updateNode } from '$lib/api/client';

	let { node, onClose }: { node: PathNode; onClose: () => void } = $props();

	let marking = $state(false);

	let editing = $state(false);
	let saving = $state(false);
	let editTitle = $state('');
	let editTranslation = $state('');
	// Editable copies of the steps; dueDate/formLinks are carried through untouched.
	let editSteps = $state<NextStep[]>([]);

	function startEdit() {
		editTitle = node.title;
		editTranslation = node.translation;
		editSteps = node.nextSteps.map((s) => ({ ...s }));
		editing = true;
	}

	function addStep() {
		editSteps = [...editSteps, { text: '' }];
	}

	function removeStep(i: number) {
		editSteps = editSteps.filter((_, idx) => idx !== i);
	}

	async function saveEdit() {
		saving = true;
		try {
			const { node: updated } = await updateNode(node.id, {
				title: editTitle,
				translation: editTranslation,
				nextSteps: editSteps
			});
			pathState.updateNode(updated);
			editing = false;
		} finally {
			saving = false;
		}
	}

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

		{#if editing}
			<p class="eyebrow">Edit letter</p>
			<label class="field">
				<span class="field__label">Title</span>
				<input class="field__input" bind:value={editTitle} />
			</label>
			<label class="field">
				<span class="field__label">What this letter says</span>
				<textarea class="field__input" rows="5" dir="auto" bind:value={editTranslation}></textarea>
			</label>

			<span class="field__label">Next steps</span>
			<ol class="steps">
				{#each editSteps as step, i (i)}
					<li class="step">
						<span class="step__num">{i + 1}</span>
						<div class="step__body" style="flex:1">
							<textarea class="field__input" rows="2" dir="auto" bind:value={step.text}></textarea>
						</div>
						<button
							class="thumb__remove"
							style="position:static"
							aria-label="Remove step"
							onclick={() => removeStep(i)}>×</button
						>
					</li>
				{/each}
			</ol>
			<button class="btn btn-ghost btn-block" style="margin-top:.6rem" onclick={addStep}>
				+ Add a step
			</button>

			<button
				class="btn btn-primary btn-lg btn-block"
				style="margin-top:1.2rem"
				disabled={saving}
				onclick={saveEdit}
			>
				{saving ? 'Saving…' : 'Save changes'}
			</button>
			<button
				class="btn btn-ghost btn-block"
				style="margin-top:.6rem"
				disabled={saving}
				onclick={() => (editing = false)}
			>
				Cancel
			</button>
		{:else}
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
			<button class="btn btn-ghost btn-block" style="margin-top:.6rem" onclick={startEdit}>Edit</button>
			<button class="btn btn-ghost btn-block" style="margin-top:.6rem" onclick={onClose}>Close</button>
		{/if}
	</div>
</div>
