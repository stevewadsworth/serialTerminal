<script>
	import { fade } from 'svelte/transition';
	import Terminal from "./Terminal.svelte"
	import ConfigureTerminal from "./ConfigureTerminal.svelte"
	import StatusLine from './StatusLine.svelte'

	let config = null;
	let connected = false

	document.title = "Serial Terminal";

	$: {
		if (config) {
			connected = true
		}
	}
</script>

<main>
	{#if !connected}
		<div transition:fade>
			<ConfigureTerminal bind:config={config}/>
			<div id='welcome'>
				<h1>Serial Terminal</h1>
			</div>
		</div>
	{:else}
		<StatusLine {...config}/>
		<Terminal {...config}/>
	{/if}
</main>

<style>
	main {
		height: 100%;
		width: 100%;
	}

	#welcome {
 		text-align: center;
 		padding: 1em;
 		margin: auto auto;
 	}
 	h1 {
 		color: #ff9900;
 		text-transform: uppercase;
 		font-size: 4em;
 		font-weight: 100;
 	}
</style>
