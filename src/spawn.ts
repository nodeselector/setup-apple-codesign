import { spawn as sp } from 'child_process'

export type spawnResult = {
  Code: number | null
  Stdout: string
  Stderr: string
  Command: string
  Args: string[]
}

/**
 * Run a command.
 * @param command The command to run.
 * @param args The arguments to pass to the command.
 * @returns {Promise<spawnResult>} The result of the command.
 */
export async function spawn(
  command: string,
  args: string[]
): Promise<spawnResult> {
  return new Promise((resolve, reject) => {
    const process = sp(command, args)
    let stdout = ''
    let stderr = ''
    process.stdout.on('data', data => {
      stdout += data
    })
    process.stderr.on('data', data => {
      stderr += data
    })
    process.on('close', code => {
      resolve({
        Code: code,
        Stdout: stdout,
        Stderr: stderr,
        Command: command,
        Args: args
      })
    })
    process.on('error', error => {
      reject(error)
    })
  })
}
