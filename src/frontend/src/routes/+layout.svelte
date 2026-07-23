<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { userLocale } from '$lib/state/userLocale.svelte';

	let { children } = $props();

	$effect(() => {
		if (!browser) return;
		const onOnboarding = page.url.pathname === '/onboarding';
		if (!userLocale.confirmed && !onOnboarding) {
			goto('/onboarding');
		} else if (userLocale.confirmed && onOnboarding) {
			goto('/');
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
