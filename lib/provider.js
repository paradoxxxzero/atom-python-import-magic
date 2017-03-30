'use babel'
/* global atom */

import { call } from './proc'

export default {
  selector: '.source.python',

  suggestionPriority: 5,
  inclusionPriority: 2,
  excludeLowerPriority: false,

  getSuggestsFromCompletions(completions, prefix, fullPrefix) {
    fullPrefix = fullPrefix || ''
    return completions[1]
      .filter(comp => comp.trim() !== fullPrefix.trim())
      .map(comp => ({
        text: comp,
        displayText: fullPrefix && comp.startsWith(fullPrefix)
          ? comp.slice(fullPrefix.length - prefix.length)
          : comp,
        replacementPrefix: fullPrefix || prefix,
        type: fullPrefix ? 's' : 'w',
        rightLabel: fullPrefix ? comp.startsWith(fullPrefix) ? '+' : '*' : null,
        description: fullPrefix && comp.startsWith(fullPrefix) ? comp : null
      }))
  },

  getSuggestions({ editor, bufferPosition, prefix, activatedManually }) {
    return new Promise(resolve => {
      if (!activatedManually || !atom.config.get(
        'python-import-magic.autocompleteImports')) {
        return resolve([])
      }

      const regex = /[\w0-9_\.-]+$/
      const line = editor.getTextInRange(
        [[bufferPosition.row, 0], bufferPosition])
      const match = line.match(regex)
      prefix = match ? match[0] : ''

      return call({
        cmd: 'list_possible_imports',
        prefix,
        source: editor.getBuffer().getText()
      }, editor, out =>
        resolve(Array.from(out.imports || []).map(imp => ({
          text: imp,
          type: 'import'
        }))
        )
      )
    })
  },

  onDidInsertSuggestion({ editor, suggestion }) {
    editor.undo()
    call({
      cmd: 'add_import',
      source: editor.getBuffer().getText(),
      new_import: suggestion.text
    }, editor, out => editor.getBuffer().setTextViaDiff(out.file))
  }
}
