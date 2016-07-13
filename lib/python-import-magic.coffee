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

  update: ->
    out = err = ''
    editor = atom.workspace.getActiveTextEditor()

    proc = spawn("python", [ __dirname + '/import_magic_interface.py'])
    proc.on 'error', (err) ->
      console.error('Python Import Magic Invocation Error', err)

    proc.on 'exit', (code, signal) ->
      console.error('Python Import Magic Invocation Error', code, signal)

    proc.stdout.on 'data', (data) -> out += data
    proc.stderr.on 'data', (data) -> err += data

    proc.on 'close', (code) ->
      if out
        editor.getBuffer().setTextViaDiff(out)
      if err
        console.error('Python Import Magic Error', err)

    proc.stdin.setEncoding editor.getBuffer().getEncoding()
    proc.stdin.write editor.getBuffer().getText()
    proc.stdin.end()
