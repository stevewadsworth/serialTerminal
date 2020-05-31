<script>
	import { fade } from 'svelte/transition';
	import Terminal from "./Terminal.svelte"
	import ConfigureTerminal from "./ConfigureTerminal.svelte"
	import StatusLine from './StatusLine.svelte'

	let config = null;

	document.title = "Serial Terminal";

</script>

<main>
	{#if !config}
		<div transition:fade>
			<ConfigureTerminal bind:config={config}/>
			<div id='welcome'>
				<h1>Serial Terminal</h1>
			</div>
		</div>
	{:else}
		<div>
			<StatusLine path={config.path} baudRate={config.baudRate} dataBits={config.dataBits} parity={config.parity} stopBits={config.stopBits}/>
			<Terminal path={config.path} baudRate={config.baudRate} dataBits={config.dataBits} parity={config.parity} stopBits={config.stopBits} localEcho={config.localEcho}/>
		</div>
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
