<script lang="ts">
	import { goto } from '$app/navigation';
	import Brand from '$lib/components/Brand.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';
	import ResetDemo from '$lib/components/ResetDemo.svelte';
</script>

<main class="app-shell">
	<Brand />

	<div class="card state">
		<div class="state__emoji" aria-hidden="true">📬</div>
		<h1 class="headline">Welcome to DocuAId</h1>
		<p class="subtle">
			Understand letters from German offices and see exactly what to do next — in your language.
		</p>
		<button class="btn btn-primary btn-lg btn-block" onclick={() => goto('/path')}>
			View my path
		</button>
		<button
			class="btn btn-ghost btn-block"
			onclick={() => goto('/onboarding')}
		>
			Change my language
		</button>
	</div>

	<ResetDemo />
</main>

<HelpOverlay
	text="This is your home screen. Tap “View my path” to see your steps, “Add a letter” to translate a new document, or “Reset demo” to start over."
/>
