{call} = require './proc'

module.exports =
  selector: '.source.python'

  suggestionPriority: 5
  inclusionPriority: 2
  excludeLowerPriority: false

  getSuggestsFromCompletions: (completions, prefix, fullPrefix='') ->
    [term, completions] = completions

    for completion in completions
      if completion.trim() is fullPrefix.trim()
        continue
      text: completion
      displayText: if fullPrefix and completion.startsWith(fullPrefix) then completion.slice(fullPrefix.length - prefix.length) else completion
      replacementPrefix: fullPrefix or prefix
      type: if fullPrefix then 's' else 'w'
      rightLabel: if fullPrefix then (if completion.startsWith(fullPrefix) then '+' else '*') else null
      description: if fullPrefix and completion.startsWith(fullPrefix) then completion else null

  getSuggestions: ({editor, bufferPosition, scopeDescriptor, prefix, activatedManually}) ->
    new Promise (resolve) =>
      return resolve([]) unless activatedManually

      regex = /[\w0-9_\.-]+$/
      line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition])
      prefix = line.match(regex)?[0] or ''

      call
        cmd: 'list_possible_imports'
        prefix: prefix
        source: editor.getBuffer().getText()
      , editor.getBuffer().getEncoding(), (out) ->
        resolve ({
          text: imp
          type: 'import'
        } for imp in out.imports or [])

  onDidInsertSuggestion: ({editor, triggerPosition, suggestion}) ->
    editor.undo()
    call
      cmd: 'add_import'
      source: editor.getBuffer().getText()
      new_import: suggestion.text
    , editor.getBuffer().getEncoding(), (out) ->
      editor.getBuffer().setTextViaDiff(out.file)
