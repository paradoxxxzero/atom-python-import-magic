{spawn} = require 'child_process'
{accessSync, X_OK} = require 'fs'
{homedir} = require 'os'
path = require 'path'

python = ->
  paths = atom.config.get('python-import-magic.pythonPaths').split(';')
  for pth in paths
    unless pth
      continue
    for project in atom.project.getPaths()
      [..., projectName] = project.split(path.sep)
      pth = pth.replace(/\~/i, homedir())
      pth = pth.replace(/\$PROJECT_NAME/i, projectName)
      pth = pth.replace(/\$PROJECT/i, project)
      try
        accessSync pth, X_OK
        return pth
      catch
        continue

  'python'

module.exports =
  call: (in_, encoding, callback, silent) ->
    cwd = atom.project.getDirectories()?[0]?.getPath()
    unless cwd
      setTimeout ->
        module.exports.call(in_, encoding, callback)
      , 500
      return
    in_.cwd = cwd

    out = err = ''
    proc = spawn python(), [ __dirname + '/import_magic_interface.py']

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
          unless silent
            atom.notifications[addNotification](
              '[python-import-magic] ' + o.message, detail: o.detail)
        callback? o
      else
        atom.notifications.addError(
          "Python Import Magic Invocation Error", detail: out + err)
        console.error('Python Import Magic Error', code, out, err)

    proc.stdin.setEncoding encoding

    proc.stdin.write JSON.stringify(in_)
    proc.stdin.end()
