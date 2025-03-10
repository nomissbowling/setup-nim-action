import * as core from '@actions/core'
import * as fs from 'fs'
import * as process from 'process'
import * as proc from 'child_process'
import * as util from './util'
const request = require('request-promise')

export async function getNim(version: string, noColor: boolean, yes: boolean) {
  setNimbleBinPath()
  await installNim(version, noColor, yes)
}

function setNimbleBinPath() {
  const newPath = util.getNewPathAppenedNimbleBinPath(process.platform)
  core.exportVariable('PATH', newPath)
}

async function installNim(version: string, noColor: boolean, yes: boolean) {
  const body = await request({
    url: 'https://nim-lang.org/choosenim/init.sh',
    method: 'GET',
  })
  fs.writeFileSync('init.sh', body)
  process.env.CHOOSENIM_NO_ANALYTICS = '1'

  // #38
  if (util.isGlobPatchVersion(version) || util.isGlobMinorVersion(version)) {
    core.info(`Fetch a latest versions with ${version}`)
    version = await util.getLatestVersion(version)
  }

  // #21
  if (process.platform === 'win32') {
    process.env.CHOOSENIM_CHOOSE_VERSION = version
    proc.execFile(
      'bash',
      ['init.sh', '-y'],
      (err: any, stdout: string, stderr: string) => {
        if (err) {
          core.error(err)
          throw err
        }
        core.info(stdout)

        // #41
        // WindowsのみなぜかZIPファイルが展開されないので一度別バージョンにスイッチ
        // してから戻すと展開される
        proc.execFile(
          'choosenim.exe',
          ['1.4.0'],
          (err: any, stdout: string, stderr: string) => {
            if (err) {
              core.error(err)
              throw err
            }
            core.info(stdout)
            proc.execFile(
              'choosenim.exe',
              [version],
              (err: any, stdout: string, stderr: string) => {
                if (err) {
                  core.error(err)
                  throw err
                }
                core.info(stdout)
              }
            )
          }
        )
      }
    )
    return
  }

  proc.execFile(
    'bash',
    ['init.sh', '-y'],
    (err: any, stdout: string, stderr: string) => {
      if (err) {
        core.error(err)
        throw err
      }
      core.info(stdout)

      // Build optional parameters of choosenim.
      let args: string[] = [version]
      if (noColor) args.push('--noColor')
      if (yes) args.push('--yes')

      proc.execFile(
        'choosenim',
        args,
        (err: any, stdout: string, stderr: string) => {
          if (err) {
            core.error(err)
            throw err
          }
          core.info(stdout)
        }
      )
    }
  )
}
