<script lang="ts">
	let { pages, onRemove }: { pages: string[]; onRemove: (index: number) => void } = $props();

	const isPdf = (page: string) => page.startsWith('data:application/pdf');
</script>

{#if pages.length > 0}
	<ul class="thumbs">
		{#each pages as page, index}
			<li class="thumb">
				{#if isPdf(page)}
					<div class="thumb__file">
						<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path
								d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
								stroke="currentColor"
								stroke-width="2"
								stroke-linejoin="round"
							/>
							<path d="M14 3v4h4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
						</svg>
						<span>PDF</span>
					</div>
				{:else}
					<img src={page} alt="Page {index + 1}" />
				{/if}
				<button class="thumb__remove" onclick={() => onRemove(index)} aria-label="Remove page {index + 1}">
					✕
				</button>
			</li>
		{/each}
	</ul>
{/if}
