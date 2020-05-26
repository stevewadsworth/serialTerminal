<script>
    import { onMount } from "svelte";
	import serial from "./modules/serial"

    export let path = ""
    export let baudRate = 115200
    export let dataBits = 8
    export let parity = "none"
    export let stopBits = 1

    let rxData = []
    let acc = []
    let line = ""

    onMount(async function() {
		const port = serial.openPort(path, baudRate, dataBits, parity, stopBits)
		port.on('data', (chunk) => {
            acc.push(chunk)
            rxData = acc
        } )
    })
</script>

<style>
div {
    height: 100%;
    width: max-content;
    overflow-y: scroll;
}

div > p {
    text-align: left;
    margin: 0;
    font-family: 'Courier New', Courier, monospace;
}

</style>

<div>
    {#each rxData as line}
        <p>{line}</p>
    {/each}
</div>
