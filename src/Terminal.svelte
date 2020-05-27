<script>
  import { onMount, beforeUpdate, afterUpdate } from "svelte";
  import serial from "./modules/serial";

  export let path = "";
  export let baudRate = 115200;
  export let dataBits = 8;
  export let parity = "none";
  export let stopBits = 1;
  export let localEcho = true;

  let div;
  let autoscroll;
  let rxData = [];
  let acc = [];
  let line = "";

  onMount(async function() {
    const port = serial.openPort(path, baudRate, dataBits, parity, stopBits);
    const parser = serial.addReadlineParser(port);
    parser.on("data", chunk => {
      acc.push(chunk);
      rxData = acc;
    });

    document.onkeypress = e => {
      console.log(e);
      // Auto scroll to the bottom on keypress
      div.scrollTo(0, div.scrollHeight);
      let key = e.key;
      if (e.keyCode === 13) {
        key = "\n";
      }
      port.write(key);

      if (localEcho) {
        acc.push(key);
        rxData = acc;
      }
    };
  });

  beforeUpdate(() => {
    // Only scroll if we are at the bottom already
    autoscroll =
      div && div.offsetHeight + div.scrollTop > div.scrollHeight - 20;
  });

  afterUpdate(() => {
    if (autoscroll) {
      div.scrollTo(0, div.scrollHeight);
    }
  });
</script>

<style>
  div {
    height: 100%;
    width: max-content;
    overflow: scroll;
  }

  div > pre {
    text-align: left;
    margin: 0;
    font-family: "Courier New", Courier, monospace;
  }
</style>

<div bind:this={div}>
  {#each rxData as line}
    <pre>{line}</pre>
  {/each}
</div>
