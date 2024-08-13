import { spawn, spawnResult } from './spawn'
import fs from 'node:fs'
import path from 'node:path'

export type CertificateImportOptions = {
  ForCodeSigning: boolean
}

export class Keychain {
  keychainName: string
  keychainPassword: string
  keychainDir: string

  constructor(
    keychainName: string,
    keychainPassword: string,
    keychainDir = `${process.env.HOME}/Library/Keychains/`
  ) {
    this.keychainName = keychainName
    this.keychainPassword = keychainPassword
    this.keychainDir = keychainDir
  }

  async runCommand(command: string, args: string[]): Promise<spawnResult> {
    return spawn(command, args)
  }

  /**
   * Create a keychain if it does not exist.
   * @returns {Promise<void>} A promise that resolves when the keychain has been created.
   */
  async createKeychain(): Promise<void> {
    if (this.exists()) {
      return
    }
    const createKeychainResult = await this.runCommand('security', [
      'create-keychain',
      '-p',
      this.keychainPassword,
      this.keychainNameWithFileExtension()
    ])

    if (createKeychainResult.Code !== 0) {
      throw new Error(
        `Failed to create keychain: ${createKeychainResult.Stderr}`
      )
    }
  }

  /**
   * Check if a keychain exists.
   * @returns {boolean} True if the keychain exists, false otherwise.
   */
  exists(): boolean {
    const keychainPath = this.keychainNameToPath()
    return fs.existsSync(keychainPath)
  }

  /**
   * Convert a keychain name to a path.
   * @param keychainName The name of the keychain.
   * @returns {string} The path to the keychain.
   * @example
   * keychainNameToPath('test-keychain')
   * // => '/Users/runner/Library/Keychains/test-keychain.keychain-db'
   */
  keychainNameToPath(): string {
    return path.join(this.keychainDir, this.keychainNameWithFileExtension())
  }

  /**
   * Add the file extension to a keychain name.
   * @param keychainName The name of the keychain.
   * @returns {string} The keychain name with the file extension.
   * @example
   * keychainNameWithFileExtension('test-keychain')
   * // => 'test-keychain.keychain-db'
   */
  keychainNameWithFileExtension(): string {
    const extension = '.keychain-db'
    return this.keychainName.endsWith(extension)
      ? this.keychainName
      : `${this.keychainName}${extension}`
  }

  /**
   * Import intermediate certificates into the keychain.
   * @returns {Promise<void>} A promise that resolves when the intermediate certificates have been imported.
   */
  async importCertificate(
    certificatePath: string,
    options?: CertificateImportOptions
  ): Promise<void> {
    let importArgs = [
      'import',
      certificatePath,
      '-k',
      this.keychainNameToPath()
    ]

    if (options?.ForCodeSigning) {
      importArgs = importArgs.concat([
        '-T',
        '/usr/bin/codesign',
        '-T',
        '/usr/bin/security'
      ])
    }

    const importCertResult = await this.runCommand('security', importArgs)
    if (importCertResult.Code !== 0) {
      throw new Error(
        `Failed to import certificate: ${importCertResult.Stderr}`
      )
    }

    if (options?.ForCodeSigning) {
      const setAcl = await this.runCommand('security', [
        'set-key-partition-list',
        '-S',
        'apple-tool:,apple:',
        '-k',
        this.keychainPassword,
        this.keychainNameWithFileExtension()
      ])

      if (setAcl.Code !== 0) {
        throw new Error(`Failed to set key partition list: ${setAcl.Stderr}`)
      }
    }
  }

  /**
   * Import a certificate from a string.
   */
  async importCertificateFromString(
    certificateString: string,
    options?: CertificateImportOptions
  ): Promise<void> {
    const tmpDir = fs.mkdtempSync('certificate-')
    const certificatePath = path.join(tmpDir, 'certificate.pem')
    try {
      fs.writeFileSync(certificatePath, certificateString)
      await this.importCertificate(certificatePath, options)
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  }

  /**
   * Import a certificate from an ArrayBuffer.
   * @param certificateBuffer The ArrayBuffer containing the certificate.
   * @param options The options for importing the certificate.
   */
  async importCertificateFromArrayBuffer(
    certificateBuffer: ArrayBuffer,
    options?: CertificateImportOptions
  ): Promise<void> {
    const tmpDir = fs.mkdtempSync('certificate-')
    const certificatePath = path.join(tmpDir, 'certificate.cer')
    fs.writeFileSync(certificatePath, Buffer.from(certificateBuffer))
    await this.importCertificate(certificatePath, options)
    fs.rmSync(tmpDir, { recursive: true })
  }

  /**
   * Add the keychain to the search list.
   */
  async addToSearchList(): Promise<spawnResult> {
    let args = ['list-keychains', '-s', 'user']
    args = args.concat(await this.getSearchList())
    args.push(this.keychainNameToPath())
    return this.runCommand('security', args)
  }

  /**
   * Unlock the keychain.
   */
  async unlock(): Promise<spawnResult> {
    await this.runCommand('security', [
      'unlock-keychain',
      '-p',
      this.keychainPassword,
      this.keychainNameToPath()
    ])

    return this.runCommand('security', [
      'set-keychain-settings',
      this.keychainNameToPath()
    ])
  }

  async findCertificate(name: string): Promise<spawnResult> {
    return this.runCommand('security', [
      'find-certificate',
      '-c',
      name,
      '-a',
      '-Z',
      this.keychainNameToPath()
    ])
  }

  // returns a list of string
  async getSearchList(): Promise<string[]> {
    const searchList = await this.runCommand('security', ['list-keychains'])
    if (searchList.Code !== 0) {
      throw new Error(`Failed to get search list: ${searchList.Stderr}`)
    }
    const out = searchList.Stdout.split('\n').filter(Boolean)
    return out.map(line => line.replace(/"/g, '').trim())
  }

  async deleteKeychain(): Promise<void> {
    const deleteKeychainResult = await this.runCommand('security', [
      'delete-keychain',
      this.keychainNameToPath()
    ])

    if (deleteKeychainResult.Code !== 0) {
      throw new Error(
        `Failed to delete keychain: ${deleteKeychainResult.Stderr}`
      )
    }
  }
}
