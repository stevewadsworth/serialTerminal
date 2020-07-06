<script>
  const { remote } = require('electron')
  const { Menu, MenuItem, clipboard } = remote

  import { onMount, onDestroy, beforeUpdate, afterUpdate } from "svelte";
  import serial from "./modules/serial";

  export let path;
  export let baudRate;
  export let dataBits;
  export let parity;
  export let stopBits;
  export let localEcho;

  export let isConnected = false;

  export let scrollBack = 100000; // Default to 100,000 lines of history

  let div;
  let autoscroll;
  let rxData = [""];

  let port;

  const printToLine = (c, acc) => {
    let str = acc[acc.length -1]

    if (c === '\b') {
      str = str.slice(0, -1)
    } else {
      str += c;
    }

    acc[acc.length -1] = str

    if (c === '\n') {
      acc.push(new String());
      if (acc.length > scrollBack) {
        acc.shift(); // Discard the first line
      }
    }

    return acc;
  }

  const normaliseKey = (key) => {
    if (key.length > 1) {
      switch (key) {
        case 'Enter':
          key = '\n'
          break
        case 'Backspace':
          key = '\b'
          break;
        default:
          console.log(key)
          key = ""
          break
      }
    }
    return key
  }

  const keyPressed = (key) => {
    key = normaliseKey(key)
    port.write(key, 'utf8');

    if (localEcho) {
      rxData = printToLine(key, rxData);
    }
    // Auto scroll to the bottom on keypress
    div.scrollTo(0, div.scrollHeight);
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
        rxData = printToLine(String.fromCharCode(c), rxData);
      }
    });

    isConnected = true;

    document.onkeydown = (e) => {
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key != "Shift") {
        keyPressed(e.key)
        e.preventDefault()
      }
    };

    // Handle Paste events. We get Copy for free, but Paste needs a bit of work.
    div.addEventListener('paste', (event) => {
      event.preventDefault()
      const text = clipboard.readText();
      for (const c of text) {
        keyPressed(c)
      }
      event.preventDefault();
    });
  });

  onDestroy(() => {
    port.close();
  })

  beforeUpdate(() => {
    // Only scroll if we are at the bottom already
    autoscroll = div && div.offsetHeight + div.scrollTop > div.scrollHeight - 20;
  });

  afterUpdate(() => {
    if (autoscroll) {
      div.scrollTo(0, div.scrollHeight);
    }
  });

  // Add a right click context menu
  const menu = new Menu()
  menu.append(new MenuItem({ label: 'Clear', click() {rxData = [""]}}))
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(new MenuItem({ label: 'Local Echo', type: 'checkbox', checked: localEcho, click() {localEcho = !localEcho} }))
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(new MenuItem({ role: 'selectAll' }))
  menu.append(new MenuItem({ role: 'copy' }))
  menu.append(new MenuItem({ role: 'paste' }))

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    menu.popup({ window: remote.getCurrentWindow() })
  }, false);

</script>

<style>
  div {
    box-sizing: border-box;
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    overflow: scroll;
    border: 10px;
    border-style: solid;
    border-color: white;
  }

  div > pre {
    text-align: left;
    margin: 0;
    font-family: Menlo, "Courier New", Courier, monospace;
    font-size: 14px;
  }
</style>

<div bind:this={div}>
  {#each rxData as line}
    <pre>{line}</pre>
  {/each}
</div>
