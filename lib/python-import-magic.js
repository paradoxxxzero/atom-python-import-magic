'use babel'
/* global atom */

import { CompositeDisposable } from 'atom'
import { call } from './proc'
import provider from './provider'

export default {
  config: {
    pythonPaths: {
      type: 'string',
      default: '',
      title: 'Python Executable Paths',
      description: '\
Paths to python executable, must be semicolon separated. \
First takes precedence. \
$PROJECT_NAME is the current project name \
$PROJECT is the current project full path'
    },
    autocompleteImports: {
      type: 'boolean',
      default: true,
      title: 'Use autocomplete to show a list of possible imports and \
add the chosen import at completion.'
    },
    reindexOnSave: {
      type: 'boolean',
      default: false,
      title: 'Run a reindexation of imports on file save'
    }
  },

  activate() {
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'python-import-magic:update': () => this.update(),
      'python-import-magic:reindex': () => this.reindex()
    }
    ))
    this.subscriptions.add(atom.workspace.observeTextEditors(editor => {
      if (!editor.getFileName() || editor.getFileName().endsWith('.py')) {
        return
      }
      if (!this.inited) {
        this.inited = true
        return call({ cmd: 'init' }, editor)
      }
      this.subscriptions.add(editor.onDidSave(() => {
        if (this.reindexing &&
            !atom.config.get('python-import-magic.reindexOnSave')) {
          return
        }
        this.reindexing = true
        call({ cmd: 'reindex' }, editor, () => {
          this.reindexing = false
        }, true)
      }))
      this.inited = false
      return this.reindexing = false
    }))
  },

  deactivate() {
    return this.subscriptions.dispose()
  },

  update() {
    const editor = atom.workspace.getActiveTextEditor()
    if (editor === null) {
      return
    }

    call({
      cmd: 'file_import_magic',
      source: editor.getBuffer().getText()
    }, editor, out => editor.getBuffer().setTextViaDiff(out.file))
  },

  reindex() {
    call({ cmd: 'reindex' }, atom.workspace.getActiveTextEditor())
  },
  provide() {
    return provider
  }
}
