{spawn} = require 'child_process'

module.exports =
  call: (in_, encoding, callback) ->
    cwd = atom.project.getDirectories()?[0]?.getPath()
    unless cwd
      console.log('No cwd')
      setTimeout ->
        console.warn('Retrying')
        module.exports.call(in_, encoding, callback)
      , 500
      return
    console.log('Cwd is ', cwd)
    in_.cwd = cwd

    out = err = ''
    proc = spawn("python", [ __dirname + '/import_magic_interface.py'])

    proc.stdout.on 'data', (data) -> out += data
    proc.stderr.on 'data', (data) -> err += data

    proc.on 'error', (err) ->
      atom.notifications.addError(
        "Python Import Magic Invocation Error", detail: out + err)
      console.error('Python Import Magic Invocation Error', out, err)

    proc.on 'close', (code) ->
      if code is 0
        o = JSON.parse(out)
        if o.notification
          addNotification = (
            'add' + o.notification[0].toUpperCase() + o.notification[1..-1])
          atom.notifications[addNotification](o.message, detail: o.detail)
        else if o.message
          console.log o
        callback o
      else
        atom.notifications.addError(
          "Python Import Magic Invocation Error", detail: out + err)
        console.error('Python Import Magic Error', code, out, err)

    proc.stdin.setEncoding encoding

    proc.stdin.write JSON.stringify(in_)
    proc.stdin.end()
