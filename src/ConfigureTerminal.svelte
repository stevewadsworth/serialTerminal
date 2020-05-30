<script>
  import { onMount } from "svelte";
  import serial from "./modules/serial"
  import DropDown from './DropDown.svelte'

  export let config = {};

  const emptyPath = '--';

  let paths = []
  let baudRates = [300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 76800, 115200, 230400];
  let stopBitsList = [1, 2];
  let parityList = ['none', 'even', 'odd'];
  let dataBitsList = [7, 8];

  let path = emptyPath;
  let baudRate = 115200;
  let stopBits = 1;
  let parity = 'none';
  let dataBits = 8;

	function handleSubmit() {
    config = {
      path,
      baudRate,
      dataBits,
      parity,
      stopBits
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
  float: right;
}
</style>

<form on:submit|preventDefault={handleSubmit}>
  <DropDown bind:value={path} items={paths}/>
  <DropDown bind:value={baudRate} items={baudRates}/>
  <DropDown bind:value={dataBits} items={dataBitsList}/>
  <DropDown bind:value={parity} items={parityList}/>
  <DropDown bind:value={stopBits} items={stopBitsList}/>
	<button disabled={path === emptyPath} type=submit>
		Connect
	</button>
</form>
