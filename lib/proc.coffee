{spawn} = require 'child_process'

module.exports =
  call: (in_, encoding, callback) ->
    out = err = ''

    proc = spawn("python", [ __dirname + '/import_magic_interface.py'])

    proc.stdout.on 'data', (data) -> out += data
    proc.stderr.on 'data', (data) -> err += data

    proc.on 'error', (err) ->
      console.error('Python Import Magic Invocation Error', out, err)

    proc.on 'close', (code) ->
      if code is 0
        callback out
      else
        console.error('Python Import Magic Error', code, out, err)

    proc.stdin.setEncoding encoding
    proc.stdin.write in_
    proc.stdin.end()
