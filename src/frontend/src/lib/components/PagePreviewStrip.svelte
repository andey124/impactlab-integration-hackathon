<script lang="ts">
	let { pages, onRemove }: { pages: string[]; onRemove: (index: number) => void } = $props();
</script>

{#if pages.length > 0}
	<ul class="flex flex-wrap justify-center gap-3">
		{#each pages as page, index}
			<li class="relative">
				<img src={page} alt="Page {index + 1}" class="h-24 w-24 rounded-lg object-cover" />
				<button
					class="btn-icon preset-filled-error-500 absolute -right-2 -top-2 h-8 w-8 text-sm"
					onclick={() => onRemove(index)}
					aria-label="Remove page {index + 1}"
				>
					✕
				</button>
			</li>
		{/each}
	</ul>
{/if}
