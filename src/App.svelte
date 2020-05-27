<script>
	import Terminal from "./Terminal.svelte"
	import ConfigureTerminal from "./ConfigureTerminal.svelte"
	import StatusLine from './StatusLine.svelte'

	let config = null;

	document.title = "Serial Terminal";

</script>

{#if !config}
<ConfigureTerminal bind:config={config}/>
{:else}
<StatusLine config={config}/>
<Terminal config={config}/>
{/if}
<style>
</style>
