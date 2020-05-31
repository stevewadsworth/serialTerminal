<script>
  export let path;
  export let baudRate;
  export let dataBits;
  export let parity;
  export let stopBits;

document.title = `${path} : ${baudRate} / ${dataBits}-${parity==='none'?'N':parity==='odd'?'O':'E'}-${stopBits}`
</script>
