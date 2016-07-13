{CompositeDisposable} = require 'atom'
{spawn} = require 'child_process'

module.exports =
  activate: (state) ->
    @subscriptions = new CompositeDisposable()
    @subscriptions.add(atom.commands.add 'atom-workspace',
      'python-import-magic:update': => @update()
    )

  deactivate: ->
    @subscriptions.dispose()

  call: (in_, encoding, callback) ->
    out = err = ''

    proc = spawn("python", [ __dirname + '/import_magic_interface.py'])
    proc.on 'error', (err) ->
      console.error('Python Import Magic Invocation Error', err)

    proc.on 'exit', (code, signal) ->
      if code
        console.error('Python Import Magic Invocation Error', code, signal)

    proc.stdout.on 'data', (data) -> out += data
    proc.stderr.on 'data', (data) -> err += data

    proc.on 'close', (code) ->
      if out
        callback out
      if err
        console.error('Python Import Magic Error', err)

    proc.stdin.setEncoding encoding
    proc.stdin.write in_
    proc.stdin.end()

  update: ->
    editor = atom.workspace.getActiveTextEditor()
    in_ = editor.getBuffer().getText()
    encoding = editor.getBuffer().getEncoding()

    @call in_, encoding, (out) ->
      editor.getBuffer().setTextViaDiff(out)
