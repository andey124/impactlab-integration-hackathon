<script lang="ts">
	let { pages, onRemove }: { pages: string[]; onRemove: (index: number) => void } = $props();
</script>

{#if pages.length > 0}
	<ul class="thumbs">
		{#each pages as page, index}
			<li class="thumb">
				<img src={page} alt="Page {index + 1}" />
				<button class="thumb__remove" onclick={() => onRemove(index)} aria-label="Remove page {index + 1}">
					✕
				</button>
			</li>
		{/each}
	</ul>
{/if}
