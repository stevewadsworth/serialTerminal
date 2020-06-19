<script>
  import { onMount } from "svelte";
  import serial from "./modules/serial"
  import DropDown from './DropDown.svelte'

  export let config = {};

  const emptyPath = '--';

  let paths = []
  let baudRates = [300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 76800, 115200, 230400];
  let stopBitsList = [1, 2];
  let parityList = ['none', 'even', 'odd', 'mark', 'space'];
  let dataBitsList = [7, 8];
  let localEchoList = ['no', 'yes'];

  let path = emptyPath;
  let baudRate = 115200;
  let stopBits = 1;
  let parity = 'none';
  let dataBits = 8;
  let localEcho = 'no';

	function handleSubmit() {
    config = {
      path,
      baudRate,
      dataBits,
      parity,
      stopBits,
      localEcho: localEcho === 'yes' ? true : false
    }
	}

  onMount(async function() {
    const ports = await serial.listPorts()
    paths = ports.map( item => item.path)
    paths.unshift(emptyPath);
    console.log(paths);
	})

</script>

<style>
button {
  flex-grow: 1;
  margin: 0.5rem;
}

form {
  display: flex;
  flex-direction: row;
}
</style>

<form on:submit|preventDefault={handleSubmit}>
  <DropDown label='Path' bind:value={path} items={paths}/>
  <DropDown label='Baud' bind:value={baudRate} items={baudRates}/>
  <DropDown label='Data Bits' bind:value={dataBits} items={dataBitsList}/>
  <DropDown label='Parity' bind:value={parity} items={parityList}/>
  <DropDown label='Stop Bits' bind:value={stopBits} items={stopBitsList}/>
  <DropDown label='Local Echo' bind:value={localEcho} items={localEchoList}/>
	<button disabled={path === emptyPath} type=submit>
		Connect
	</button>
</form>
