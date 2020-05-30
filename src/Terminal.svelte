<script>
  import { onMount, onDestroy, beforeUpdate, afterUpdate } from "svelte";
  import serial from "./modules/serial";

  export let config = {};
  export let localEcho = false;

  export let isConnected = false;

  let div;
  let autoscroll;
  let acc = [""];
  let rxData = acc;

  let port;

  const printToLine = (c) => {
    acc[acc.length -1] += c;
    if (c === 0x0a) {
      acc.push(new String());
    }
  }

  onMount(async function() {
    port = serial.openPort(config.path, config.baudRate, config.dataBits, config.parity, config.stopBits);

    port.on('error', err => {
      console.error('Error', err);
      isConnected = false;
    })

    port.on('close', err => {
      console.log('Closed', err)
      isConnected = false;
    })

    port.on("data", chunk => {
      for (const c of chunk) {
        printToLine(String.fromCharCode(c));
      }
      rxData = acc;
    });

    isConnected = true;

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
        printToLine(key);
        rxData = acc;
      }
    };
  });

  onDestroy(() => {
    port.close();
  })

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
    position: absolute;
    top: 0;
    height: 100%;
    width: 100%;
    overflow: scroll;
    padding: 1rem;
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
