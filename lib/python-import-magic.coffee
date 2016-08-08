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
    call
      cmd: 'init', 'utf-8', (out) ->
        console.log 'Import magic', out.message

  deactivate: ->
    @subscriptions.dispose()

  update: ->
    editor = atom.workspace.getActiveTextEditor()

    call
      cmd: 'file_import_magic'
      source: editor.getBuffer().getText()
    , editor.getBuffer().getEncoding(), (out) ->
      editor.getBuffer().setTextViaDiff(out.file)

  reindex: ->
    console.log 'Import magic', 'Reindexing...'
    call
      cmd: 'reindex', 'utf-8', (out) ->
        console.log 'Import magic', out.message
  provide: -> provider
