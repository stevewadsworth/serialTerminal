<script>
  const { remote } = require('electron')
  const { Menu, MenuItem } = remote

  import { onMount, onDestroy, beforeUpdate, afterUpdate } from "svelte";
  import serial from "./modules/serial";

  export let path;
  export let baudRate;
  export let dataBits;
  export let parity;
  export let stopBits;
  export let localEcho;

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

  const keyPressed = (e) => {
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

  onMount(async function() {
    port = serial.openPort(path, baudRate, dataBits, parity, stopBits);

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

    document.onkeypress = keyPressed;
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

  const menu = new Menu()
  menu.append(new MenuItem({ label: 'Local Echo', type: 'checkbox', checked: localEcho, click() {localEcho = !localEcho} }))
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(new MenuItem({ label: 'Disconnect', click() { console.log('Disconnecting'); isConnected = false; } }))
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(new MenuItem({ role: 'selectAll' }))
  menu.append(new MenuItem({ role: 'copy' }))
 // menu.append(new MenuItem({ role: 'paste' })) Paste isn't woring for some reason

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    menu.popup({ window: remote.getCurrentWindow() })
  }, false);

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
