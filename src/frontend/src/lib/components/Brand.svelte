<script lang="ts">
	let { compact = false }: { compact?: boolean } = $props();
</script>

<div class="brand" class:brand--compact={compact}>
	<svg class="brand__mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
		<rect
			x="7"
			y="5"
			width="27"
			height="35"
			rx="7"
			fill="var(--primary-tint)"
			stroke="var(--primary)"
			stroke-width="2.5"
		/>
		<line x1="13" y1="15" x2="28" y2="15" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" />
		<line x1="13" y1="21" x2="28" y2="21" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" />
		<line x1="13" y1="27" x2="22" y2="27" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" />
		<circle cx="34" cy="34" r="10" fill="var(--accent)" />
		<path
			d="M30 34.2l2.8 2.8 5.2-5.6"
			stroke="#fff"
			stroke-width="2.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
	<span class="brand__name">Docu<span>AId</span></span>
</div>
