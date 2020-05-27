<script>
    import { onMount } from "svelte";
	import serial from "./modules/serial"

    export let path = ""
    export let baudRate = 115200
    export let dataBits = 8
    export let parity = "none"
    export let stopBits = 1
    export let localEcho = true

    let rxData = []
    let acc = []
    let line = ""

    onMount(async function() {
		const port = serial.openPort(path, baudRate, dataBits, parity, stopBits)
        const parser = serial.addReadlineParser(port)
		parser.on('data', (chunk) => {
            acc.push(chunk)
            rxData = acc
        } )

        document.onkeypress = (e) => {
            console.log(e)
            let key = e.key
            if (e.keyCode === 13) {
                key = '\n'
            }
            port.write(key)
            port.drain( (e) => {
                if (e) {
                    console.log(e);
                }
            });

            if (localEcho) {
                acc.push(key)
                rxData = acc
            }
        }
})
</script>

<style>
div {
    height: 100%;
    width: max-content;
    overflow-y: scroll;
}

div > pre {
    text-align: left;
    margin: 0;
    font-family: 'Courier New', Courier, monospace;
}

</style>

<div id="terminal-container">
    {#each rxData as line}
        <pre>{line}</pre>
    {/each}
</div>
