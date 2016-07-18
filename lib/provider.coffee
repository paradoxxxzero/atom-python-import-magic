{call} = require './proc'

module.exports =
  selector: '.source.python'

  suggestionPriority: 10
  inclusionPriority: 1
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
      call 'I' + prefix, 'utf-8', (out) ->
        resolve ({
          text: imp
          type: 'import'
        } for imp in out.split('\n'))

  onDidInsertSuggestion: ({editor, triggerPosition, suggestion}) ->
    editor.undo()
    in_ = 'F' + suggestion.text + '\n' + editor.getBuffer().getText()
    encoding = editor.getBuffer().getEncoding()

    call in_, encoding, (out) ->
      editor.getBuffer().setTextViaDiff(out)
