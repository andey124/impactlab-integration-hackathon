<script lang="ts">
	import { goto } from '$app/navigation';
	import Brand from '$lib/components/Brand.svelte';
	import UploadWizard from '$lib/components/UploadWizard.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';
</script>

<main class="app-shell">
	<Brand />
	<button class="btn btn-ghost" style="align-self:flex-start" onclick={() => goto('/')}>
		← Back
	</button>
	<div class="card">
		<UploadWizard />
	</div>
</main>

<HelpOverlay
	text="Take a photo of your letter. You can add more than one page if the letter is long. When you're done, tap 'Translate this letter'."
/>
