{CompositeDisposable} = require 'atom'
{call} = require './proc'
provider = require './provider'

module.exports =
  activate: (state) ->
    @subscriptions = new CompositeDisposable()
    @subscriptions.add(atom.commands.add 'atom-workspace',
      'python-import-magic:update': => @update()
      'python-import-magic:reindex': => @reindex()
    )
    call 'O', 'utf-8', (out) ->
      console.log 'Import magic indexing done', out

  deactivate: ->
    @subscriptions.dispose()

  update: ->
    editor = atom.workspace.getActiveTextEditor()
    in_ = 'F' + editor.getBuffer().getText()
    encoding = editor.getBuffer().getEncoding()

    call in_, encoding, (out) ->
      editor.getBuffer().setTextViaDiff(out)

  reindex: ->
    call 'R', 'utf-8', (out) ->
      console.log 'Import magic reindexing done', out

  provide: -> provider
