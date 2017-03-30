'use babel'
/* global atom */

import { spawn } from 'child_process'
import { accessSync, X_OK } from 'fs'
import { homedir } from 'os'

const python = project => {
  if (!project) {
    return 'python'
  }
  const projectName = project.getBaseName()
  const cwd = project.getPath()
  return atom.config.get('python-import-magic.pythonPaths')
    .split(';')
    .find(pth => {
      try {
        accessSync(
          pth.replace(/\~/i, homedir())
          .replace(/\$PROJECT_NAME/i, projectName)
          .replace(/\$PROJECT/i, cwd), X_OK)
        return pth
      } catch (error) {
        return false
      }
    }) || 'python'
}

export default {
  call(in_, editor, callback, silent) {
    let err
    const encoding = editor.getBuffer().getEncoding()
    const filePath = editor.getBuffer().getPath()
    const project = atom.project.getDirectories().find(dir =>
      dir.contains(filePath)
    )
    if (project) {
      in_.cwd = project.getPath()
    }

    let out = err = ''
    const proc = spawn(
      python(project), [`${ __dirname }/import_magic_interface.py`])

    proc.stdout.on('data', data => out += data)
    proc.stderr.on('data', data => err += data)

    proc.on('error', error => {
      atom.notifications.addError(
        'Python Import Magic Invocation Error', { detail: out + err + error })
      console.error('Python Import Magic Invocation Error', out, err, error)
    })

    proc.on('close', function(code) {
      if (code === 0) {
        let o
        try {
          o = JSON.parse(out)
        } catch (error) {
          atom.notifications.addError(
            'Python Import Magic Invocation Erruor',
            { detail: out + err + error })
          console.error('Python Import Magic Error', error, out, err)
          return
        }
        if (o.notification) {
          const addNotification =
            `add${ o.notification[0].toUpperCase() }${
              o.notification.slice(1) }`
          if (!silent) {
            atom.notifications[addNotification](
              `[python-import-magic] ${ o.message }`, { detail: o.detail })
          }
        }
        callback && callback(o)
      } else {
        atom.notifications.addError(
            'Python Import Magic Invocation Error', { detail: out + err })
        console.error('Python Import Magic Error', code, out, err)
      }

    })
    proc.stdin.setEncoding(encoding)
    proc.stdin.write(JSON.stringify(in_))
    proc.stdin.end()
  }
}
