const SerialPort = require('@serialport/stream')
const Readline = require('@serialport/parser-readline')
SerialPort.Binding = require('@serialport/bindings')

export const listPorts = async () => {
    const ports = await SerialPort.list()
    for (const port of ports) {
      console.log(`${port.path}\t${port.pnpId || ''}\t${port.manufacturer || ''}`)
    }
    return ports
}

export const openPort = (path, baudRate, dataBits, parity, stopBits) => {
  const openOptions = {
    baudRate,
    dataBits,
    parity,
    stopBits,
  }

  const port = new SerialPort(path, openOptions)
  port.pipe(process.stdout)
  const parser = port.pipe(new Readline({ delimiter: '\n' })) // This works, but only returns data when a full line has been terminated with \n

  return parser
}

export default { listPorts, openPort }
