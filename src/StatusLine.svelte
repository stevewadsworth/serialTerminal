<script>
  export let config = {};
  document.title = `${config.path} : ${config.baudRate} / ${config.dataBits}-${config.parity==='none'?'N':config.parity==='odd'?'O':'E'}-${config.stopBits}`
</script>
