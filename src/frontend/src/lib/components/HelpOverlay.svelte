<script lang="ts">
	let { text }: { text: string } = $props();

	let open = $state(false);
</script>

<button
	class="btn-icon preset-tonal-surface fixed bottom-4 right-4 h-14 w-14 text-2xl"
	onclick={() => (open = true)}
	aria-label="Help"
>
	?
</button>

{#if open}
	<div class="fixed inset-0 flex items-center justify-center bg-black/50 p-6">
		<div class="card preset-filled-surface-50-950 max-w-sm p-6 text-lg">
			<p>{text}</p>
			<button
				class="btn preset-filled-primary-500 mt-4 w-full p-4 text-lg"
				onclick={() => (open = false)}
			>
				Got it
			</button>
		</div>
	</div>
{/if}
