/** @babel */

import { CompositeDisposable } from 'atom'
import ImportListView from './import-list-view'
import call from './proc'

export default {
  config: {
    isortConfigPath: {
        type: 'string',
        default: '',
        title: 'Isort Config Path',
        description:
          '\
        Path to isort config, eg. isort.cfg',
    },
    pythonPaths: {
      type: 'string',
      default: '',
      title: 'Python Executable Paths',
      description:
        '\
Paths to python executable, must be semicolon separated. \
First takes precedence. \
$PROJECT_NAME is the current project name \
$PROJECT is the current project full path',
    },
    useRelativeImports: {
      type: 'boolean',
      default: true,
      title: 'Prefer relative imports if possible.',
    },
    reindexOnSave: {
      type: 'boolean',
      default: false,
      title: 'Run a reindexation of imports on file save',
    },
    debug: {
      type: 'boolean',
      default: false,
      title: 'Enable console debug output',
    },
  },

  debug(...args) {
    atom.config.get('python-import-magic.debug') && console.debug(...args)
  },

  activate() {
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.commands.add('atom-text-editor[data-grammar~=python]', {
        'python-import-magic:reindex': () => this.reindex(),
        'python-import-magic:import-word': () =>
          atom.workspace.getActiveTextEditor() &&
          this.importWord(atom.workspace.getActiveTextEditor()),
        'python-import-magic:remove-unused-imports': () =>
          atom.workspace.getActiveTextEditor() &&
          this.cleanImports(atom.workspace.getActiveTextEditor()),
        'python-import-magic:update-imports': () =>
          atom.workspace.getActiveTextEditor() &&
          this.updateImports(atom.workspace.getActiveTextEditor()),
      })
    )
    this.debug('Debug is on')
    this.subscriptions.add(
      atom.workspace.observeTextEditors(async editor => {
        if (!editor.getFileName() || !editor.getFileName().endsWith('.py')) {
          return
        }
        if (!this.inited) {
          this.inited = true
          await call({ cmd: 'init' }, editor)
        }
        this.subscriptions.add(
          editor.onDidSave(async () => {
            if (
              this.reindexing &&
              !atom.config.get('python-import-magic.reindexOnSave')
            ) {
              return
            }
            this.reindexing = true
            await call({ cmd: 'reindex' }, editor, true)
            this.reindexing = false
          })
        )
        this.inited = false
        this.reindexing = false
      })
    )
    this.importListView = new ImportListView()
  },

  deactivate() {
    this.importListView.destroy()
    this.subscriptions.dispose()
  },

  async reindex() {
    try {
      await call({ cmd: 'reindex' }, atom.workspace.getActiveTextEditor())
    } catch (error) {
      console.error('Python Import Magic error:', error)
    }
  },

  async updateImports(editor) {
    const { unresolved } = await this.cleanImports(editor)
    for (let i = 0; i < unresolved.length; i++) {
      if (!await this.import(editor, unresolved[i])) {
        break
      }
    }
  },

  getCurrentWord(editor) {
    editor.selectWordsContainingCursors()
    const wordSelection = editor.getLastSelection()
    if (!wordSelection.getBufferRange().isSingleLine()) {
      this.debug(wordSelection, 'is not single line')
      return
    }
    const word = wordSelection.getText()
    if (
      new RegExp(
        `[ \t${atom.workspace
          .getActiveTextEditor()
          .getNonWordCharacters()
          .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`
      ).test(word)
    ) {
      this.debug(word, 'contains non word characters')
      return
    }
    return word
  },

  async cleanImports(editor) {
    try {
      const { file, unresolved } = await call(
        {
          cmd: 'clean_imports',
          source: editor.getBuffer().getText(),
        },
        editor
      )
      editor.getBuffer().setTextViaDiff(file)
      return { unresolved }
    } catch (error) {
      console.error('Python Import Magic error:', error)
      return
    }
  },

  async importWord(editor) {
    const prefix = this.getCurrentWord(editor)
    if (!prefix) {
      return
    }
    this.import(editor, prefix)
  },

  async import(editor, prefix) {
    let imports
    try {
      const out = await call(
        {
          cmd: 'list_possible_imports',
          prefix,
          source: editor.getBuffer().getText(),
          path: editor.getBuffer().getPath(),
          relative: atom.config.get('python-import-magic.useRelativeImports'),
        },
        editor
      )
      imports = out.imports
    } catch (error) {
      console.error('Python Import Magic error:', error)
      return false
    }
    if (!imports || !imports.length) {
      atom.notifications.addWarning(
        `Python Import Magic: No import found for \`${prefix}\``
      )
      return false
    }
    let item
    if (imports.length === 1) {
      item = imports[0]
    } else {
      try {
        item = await this.importListView.pick(imports)
      } catch (e) {
        return false
      }
    }
    try {
      const { file } = await call(
        {
          cmd: 'add_import',
          source: editor.getBuffer().getText(),
          new_import: item,
        },
        editor
      )
      editor.getBuffer().setTextViaDiff(file)
    } catch (error) {
      console.error('Python Import Magic error:', error)
    }

    if (imports.length === 1) {
      atom.notifications.addSuccess(`Python Import Magic: added \`${item}\``)
    }
    return true
  },
}
