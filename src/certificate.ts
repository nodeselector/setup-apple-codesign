import { Keychain } from './keychain'
import { spawn } from './spawn'
import fs from 'node:fs'
import * as forge from 'node-forge'
import os from 'node:os'
import path from 'node:path'

const appleCertificateAuthority =
  'https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer'

export const testCommonName =
  'Apple Development: Created via API (DEADBEEFACID)'

export type CertificateFormat = 'pem' | 'p12'

/**
 * Detect the format of certificate data.
 * @param data The raw certificate data as a Buffer.
 * @returns The detected certificate format.
 */
export function detectCertificateFormat(data: Buffer): CertificateFormat {
  // Check for PEM format
  const pemHeader = '-----BEGIN'
  // Search a larger window to account for OpenSSL bag attributes that may precede the PEM header
  const head = data.toString('utf-8', 0, Math.min(data.length, 500))
  if (head.includes(pemHeader)) {
    return 'pem'
  }

  // Check for P12 (PKCS#12)
  // First check if it starts with ASN.1 SEQUENCE tag (0x30)
  if (data.length > 0 && data[0] === 0x30) {
    try {
      // Try to parse for deeper validation
      const binaryString = data.toString('binary')
      const asn1 = forge.asn1.fromDer(binaryString)

      /**
       * A PFX structure is a SEQUENCE where:
       * - The first element is an INTEGER (version, usually 3)
       * - The second element is a SEQUENCE (ContentInfo)
       */
      const isSequence =
        asn1.tagClass === forge.asn1.Class.UNIVERSAL &&
        asn1.type === forge.asn1.Type.SEQUENCE

      if (isSequence && Array.isArray(asn1.value) && asn1.value.length >= 2) {
        const version = asn1.value[0]
        const contentInfo = asn1.value[1]

        const hasValidVersion = version.type === forge.asn1.Type.INTEGER
        const hasContentInfo = contentInfo.type === forge.asn1.Type.SEQUENCE

        if (hasValidVersion && hasContentInfo) {
          return 'p12'
        }
      }

      // If it parsed as a SEQUENCE but doesn't match PKCS#12 structure,
      // it might still be some other ASN.1 binary format - default to p12
      if (isSequence) {
        return 'p12'
      }
    } catch (e) {
      // Swallow error, will fall through to unsupported format
    }
  }

  throw new Error(
    'Unsupported certificate format: Data is neither a valid PEM nor a PKCS#12 archive.'
  )
}

/**
 * Check if a string is a base64-encoded certificate.
 * @param data The string to check.
 * @returns True if the string appears to be base64 encoded.
 */
export function isBase64Encoded(data: string): boolean {
  const cleanStr = data.replace(/\s/g, '')

  // If it has PEM headers, it's PEM (which is B64 internally,
  // but we usually treat 'PEM' as its own format).
  if (cleanStr.includes('-----BEGIN')) return false

  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/
  if (!base64Regex.test(cleanStr)) return false

  // modulo check: Base64 strings must be multiples of 4
  if (cleanStr.length % 4 !== 0) return false

  return true
}

/**
 * Decode certificate input, handling both base64 and raw formats.
 * @param input The certificate input (may be base64 encoded or raw).
 * @returns A Buffer containing the raw certificate data.
 */
export function decodeCertificateInput(input: string | Buffer): Buffer {
  if (Buffer.isBuffer(input)) {
    return input
  }

  // Check if the input is base64 encoded
  if (isBase64Encoded(input)) {
    return Buffer.from(input, 'base64')
  }

  // Return as-is (raw PEM or binary string)
  return Buffer.from(input, 'utf-8')
}

export type CertificateOptions = {
  /** Password for encrypted certificates (PEM with encrypted private key or P12). */
  password?: string
}

/**
 * Decrypt an encrypted PEM private key.
 * @param encryptedPem The encrypted PEM private key.
 * @param password The password for the encrypted key.
 * @returns The decrypted PEM private key.
 */
export async function decryptPrivateKey(
  encryptedPem: string,
  password: string
): Promise<string> {
  try {
    // Parse the encrypted PEM
    const encryptedPrivateKeyInfo = forge.pki.decryptRsaPrivateKey(
      encryptedPem,
      password
    )

    if (!encryptedPrivateKeyInfo) {
      throw new Error('Failed to decrypt private key with provided password')
    }

    // Convert to PEM
    const decryptedPem = forge.pki.privateKeyToPem(encryptedPrivateKeyInfo)
    return decryptedPem
  } catch (error) {
    throw new Error(
      `Failed to decrypt private key: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Process PEM content to decrypt any encrypted private keys.
 * @param pemContent The PEM content (may contain encrypted private keys).
 * @param password The password for the encrypted keys (if any).
 * @returns The PEM content with all private keys decrypted.
 */
export async function decryptPemIfNeeded(
  pemContent: string,
  password?: string
): Promise<string> {
  // Check if there's an encrypted private key
  if (!pemContent.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----')) {
    return pemContent
  }

  // If there's an encrypted key but no password, return as-is and let it fail
  if (!password) {
    return pemContent
  }

  // Split into blocks
  const blocks: string[] = []
  const pemRegex = /-----BEGIN [A-Z0-9 ]+-----[\s\S]*?-----END [A-Z0-9 ]+-----/g
  let match
  while ((match = pemRegex.exec(pemContent)) !== null) {
    blocks.push(match[0].trim())
  }

  const processedBlocks: string[] = []
  for (const block of blocks) {
    if (block.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----')) {
      const decrypted = await decryptPrivateKey(block, password)
      processedBlocks.push(decrypted)
    } else {
      processedBlocks.push(block)
    }
  }

  return processedBlocks.join('\n')
}

/**
 * Detect OpenSSL version and determine if it's version 3.x or higher.
 * @returns True if OpenSSL 3.x or higher, false otherwise.
 */
export async function isOpenSSL3OrHigher(): Promise<boolean> {
  try {
    const result = await spawn('openssl', ['version'])
    if (result.Code !== 0) {
      return false
    }
    const version = result.Stdout.trim()
    // Check if version starts with "OpenSSL 3." or higher
    const match = version.match(/OpenSSL (\d+)\./)
    if (match) {
      const majorVersion = parseInt(match[1], 10)
      return majorVersion >= 3
    }
    return false
  } catch (error) {
    // If openssl command fails, assume older version
    return false
  }
}

/**
 * Convert P12 format to PEM format using OpenSSL.
 * This is necessary because importing P12 directly into macOS keychain
 * can trigger interactive prompts, while PEM import is non-interactive.
 * Detects OpenSSL version and adds -legacy flag for OpenSSL 3.x to support
 * RC2-40-CBC and other legacy algorithms commonly found in Apple certificates.
 * @param p12Data The P12 certificate data as a Buffer.
 * @param password The password for the P12 file (empty string if no password).
 * @returns A string containing the PEM format certificate and private key.
 */
export async function convertP12ToPem(
  p12Data: Buffer,
  password = ''
): Promise<string> {
  const tempDir = os.tmpdir()
  const p12Path = path.join(
    tempDir,
    `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.p12`
  )
  const pemPath = path.join(
    tempDir,
    `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.pem`
  )

  try {
    fs.writeFileSync(p12Path, p12Data as Uint8Array)

    const args = [
      'pkcs12',
      '-in',
      p12Path,
      '-out',
      pemPath,
      '-nodes',
      '-passin',
      `pass:${password}`
    ]

    // Add -legacy flag for OpenSSL 3.x to support RC2 and other legacy algorithms
    const useOpenSSL3 = await isOpenSSL3OrHigher()
    if (useOpenSSL3) {
      args.push('-legacy')
    }

    const result = await spawn('openssl', args)
    if (result.Code !== 0) {
      throw new Error(
        `OpenSSL pkcs12 command failed with code ${result.Code}: ${result.Stderr}`
      )
    }

    const pemData = fs.readFileSync(pemPath, 'utf-8')
    return pemData
  } catch (error) {
    throw new Error(
      `Failed to convert P12 to PEM: ${error instanceof Error ? error.message : String(error)}`
    )
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(p12Path)) {
        fs.unlinkSync(p12Path)
      }
      if (fs.existsSync(pemPath)) {
        fs.unlinkSync(pemPath)
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Import the provided secret value into a keychain.
 * Supports both PEM and P12 formats, with or without base64 encoding.
 *
 * Note: P12 files are converted to PEM format before importing to avoid interactive
 * keychain prompts in CI environments. Direct P12 import via macOS security command
 * can trigger user prompts, while importing decrypted PEM gives us full control over
 * credential handling without user interaction.
 *
 * @param secretValue The secret value to import (PEM or P12, optionally base64 encoded).
 * @param keychain The keychain to import the certificate into.
 * @param options Optional settings including P12 password.
 */
export async function prepareKeychainWithDeveloperCertificate(
  secretValue: string,
  keychain: Keychain,
  options?: CertificateOptions
): Promise<void> {
  const certData = decodeCertificateInput(secretValue)

  const format = detectCertificateFormat(certData)

  await keychain.createKeychain()
  await keychain.addToSearchList()
  await keychain.unlock()

  // Convert P12 to PEM to avoid interactive keychain prompts in CI
  let pemData: string
  if (format === 'pem') {
    pemData = certData.toString('utf-8')
  } else {
    pemData = await convertP12ToPem(certData, options?.password ?? '')
  }

  // Decrypt any encrypted private keys in the PEM
  // macOS security import doesn't handle PKCS#8 encrypted private keys well
  pemData = await decryptPemIfNeeded(pemData, options?.password)

  // Import the PEM certificate (password no longer needed since we decrypted)
  await keychain.importCertificateFromString(pemData, {
    ForCodeSigning: true
  })

  const intermediateCertificates = await fetchCertificate(
    appleCertificateAuthority
  )
  await keychain.importCertificateFromArrayBuffer(intermediateCertificates, {
    ForCodeSigning: true
  })
}

async function fetchCertificate(url: string): Promise<ArrayBuffer> {
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`Failed to fetch intermediate certificates: ${resp}`)
  }

  return await resp.arrayBuffer()
}

export function combinePemCrtAndKey(
  certificate: string,
  privateKey: string
): string {
  return `${certificate}\n${privateKey}`
}

export async function generateTestCertificate(
  testKeyPath: string,
  testCrtPath: string
): Promise<string> {
  let base64Secret: string
  try {
    const generateKeyResult = await spawn('openssl', [
      'genrsa',
      '-out',
      testKeyPath,
      '2048'
    ])
    if (generateKeyResult.Code !== 0) {
      throw new Error(
        `Failed to generate key: ${JSON.stringify(generateKeyResult)}`
      )
    }
    const generateCertResult = await spawn('openssl', [
      'req',
      '-new',
      '-x509',
      '-key',
      testKeyPath,
      '-out',
      testCrtPath,
      '-days',
      '365',
      '-sha256',
      '-subj',
      `/UID=DEADBEEFACID/CN=${testCommonName}/OU=DEADBEEFSQUAD/O=Angus Hofmann/C=US`
    ])
    if (generateCertResult.Code !== 0) {
      throw new Error(
        `Failed to generate certificate: ${JSON.stringify(generateCertResult)}`
      )
    }
    const secret = combinePemCrtAndKey(
      fs.readFileSync(testCrtPath, 'utf-8'),
      fs.readFileSync(testKeyPath, 'utf-8')
    )

    base64Secret = Buffer.from(secret).toString('base64')
  } finally {
    fs.unlinkSync(testKeyPath)
    fs.unlinkSync(testCrtPath)
  }

  return base64Secret
}
