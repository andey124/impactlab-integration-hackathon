<script lang="ts">
	import { t } from '$lib/i18n';

	let { text }: { text: string } = $props();

	let open = $state(false);
</script>

<button class="help-fab" onclick={() => (open = true)} aria-label="Help">?</button>

{#if open}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="-1"
		aria-label="Close help"
		onclick={(e) => e.target === e.currentTarget && (open = false)}
		onkeydown={(e) => e.key === 'Escape' && (open = false)}
	>
		<div class="modal" role="dialog" aria-modal="true">
			<div class="state__emoji" aria-hidden="true">💡</div>
			<p style="font-size:1.1rem">{text}</p>
			<button class="btn btn-primary btn-block" onclick={() => (open = false)}>{t('help_close')}</button>
		</div>
	</div>
{/if}
