<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import Brand from '$lib/components/Brand.svelte';
	import UploadWizard from '$lib/components/UploadWizard.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';
</script>

<main class="app-shell">
	<Brand />
	<button class="btn btn-ghost" style="align-self:flex-start" onclick={() => goto('/')}>
		{t('upload_back')}
	</button>
	<div class="card">
		<UploadWizard />
	</div>
</main>

<HelpOverlay text={t('help_upload')} />
