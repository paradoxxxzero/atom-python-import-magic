/** @babel */

import { X_OK, accessSync } from 'fs'

import { homedir } from 'os'
import { spawn } from 'child_process'

const python = project => {
  if (!project) {
    return 'python'
  }
  const projectName = project.getBaseName()
  const cwd = project.getPath()
  return (
    atom.config
      .get('python-import-magic.pythonPaths')
      .split(';')
      .map(pth => {
        try {
          pth = pth
            .replace(/\~/i, homedir())
            .replace(/\$PROJECT_NAME/i, projectName)
            .replace(/\$PROJECT/i, cwd)
          accessSync(pth, X_OK)
          return pth
        } catch (error) {
          return false
        }
      })
      .find(pth => pth) || 'python'
  )
}

export default (in_, editor, silent) => {
  return new Promise((resolve, reject) => {
    let err
    const encoding = editor.getBuffer().getEncoding()
    const filePath = editor.getBuffer().getPath()
    const project = atom.project
      .getDirectories()
      .find(dir => dir.contains(filePath))
    if (project) {
      in_.cwd = project.getPath()
    }

    let out = (err = '')
    const proc = spawn(python(project), [
      `${__dirname}/import_magic_interface.py`,
    ])

    proc.stdout.on('data', data => (out += data))
    proc.stderr.on('data', data => (err += data))

    proc.on('error', error => {
      atom.notifications.addError('Python Import Magic Invocation Error', {
        detail: out + err + error,
      })
      reject(error)
    })

    proc.on('close', function(code) {
      if (code === 0) {
        let o
        try {
          o = JSON.parse(out)
        } catch (error) {
          atom.notifications.addError('Python Import Magic Invocation Error', {
            detail: out + err + error,
          })
          reject(error)
          return
        }
        if (o.notification) {
          const addNotification = `add${o.notification[0].toUpperCase()}${o.notification.slice(
            1
          )}`
          if (!silent) {
            atom.notifications[addNotification](
              `[python-import-magic] ${o.message}`,
              { detail: o.detail }
            )
          }
        }
        resolve(o)
      } else {
        atom.notifications.addError('Python Import Magic Invocation Error', {
          detail: out + err,
        })
        reject(new Error(`Errno ${code}: ${out} ${err}`))
      }
    })
    proc.stdin.setEncoding(encoding)
    proc.stdin.write(JSON.stringify(in_))
    proc.stdin.end()
  })
}
