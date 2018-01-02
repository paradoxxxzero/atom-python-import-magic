/** @babel */

import SelectListView from 'atom-select-list'

export default class ImportListView {
  constructor() {
    this.view = new SelectListView({
      items: [],
      elementForItem: this.elementForItem.bind(this),
      didCancelSelection: this.cancel.bind(this),
      didConfirmSelection: this.confirm.bind(this),
    })
    this.view.element.classList.add('import-list')
  }

  elementForItem(imp) {
    const li = document.createElement('li')
    li.classList.add('event', 'two-lines')
    const primary = document.createElement('div')
    primary.classList.add('primary-line')
    imp.split(' ').forEach(part => {
      const span = document.createElement('span')
      span.classList.add(['from', 'import'].includes(part) ? 'keyword' : 'name')
      span.appendChild(document.createTextNode(part + ' '))
      primary.appendChild(span)
    })
    li.appendChild(primary)
    return li
  }

  pick(imports) {
    if (this.pickPromise) {
      this.pickPromise.reject('Panel is already shown')
      return
    }
    return new Promise((resolve, reject) => {
      this.pickPromise = { resolve, reject }
      this.show(imports)
    })
  }

  show(imports) {
    if (!this.panel) {
      this.panel = atom.workspace.addModalPanel({
        item: this.view,
      })
    }
    this.view.update({ items: imports })
    this.lastFocus = document.activeElement
    this.panel.show()
    this.view.focus()
  }

  confirm(item) {
    this.pickPromise && this.pickPromise.resolve(item)
    delete this.pickPromise
    this.hide()
  }

  cancel() {
    this.pickPromise && this.pickPromise.reject(new Error('aborted'))
    delete this.pickPromise
    this.hide()
  }

  hide() {
    this.view.reset()
    this.panel.hide()
    if (this.lastFocus) {
      this.lastFocus.focus()
      this.lastFocus = null
    }
  }

  destroy() {
    this.panel && this.panel.destroy()
    this.view.destroy()
  }
}
