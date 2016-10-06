{CompositeDisposable} = require 'atom'
{call} = require './proc'
provider = require './provider'

module.exports =
  config:
    pythonPaths:
      type: 'string'
      default: ''
      title: 'Python Executable Paths'
      description: '
        Paths to python executable, must be semicolon separated.
        First takes precedence.
        $PROJECT_NAME is the current project name
        $PROJECT is the current project full path'
    autocompleteImports:
      type: 'boolean'
      default: true
      title: 'Use autocomplete to show a list of possible imports and
      add the chosen import at completion.'
    reindexOnSave:
      type: 'boolean'
      default: false
      title: 'Run a reindexation of imports on file save'

  activate: (state) ->
    @subscriptions = new CompositeDisposable()
    @subscriptions.add(atom.commands.add 'atom-workspace',
      'python-import-magic:update': => @update()
      'python-import-magic:reindex': => @reindex()
    )
    @subscriptions.add atom.workspace.observeTextEditors((editor) =>
      return unless editor.getFileName()?.endsWith('.py')
      @subscriptions.add editor.onDidSave =>
        return if @reindexing
        return unless atom.config.get('python-import-magic.reindexOnSave')
        @reindexing = true
        call
          cmd: 'reindex', 'utf-8', =>
            @reindexing = false
          , true
    )
    @reindexing = false
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
    call cmd: 'reindex', 'utf-8'
  provide: -> provider
