import { Keychain } from './keychain'
import { pki } from 'node-forge'
import { spawn } from './spawn'
import fs from 'node:fs'

const appleCertificateAuthority =
  'https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer'

export const testCommonName =
  'Apple Development: Created via API (DEADBEEFACID)'

/**
 * Import the provided secret value into a keychain.
 * @param secretValue The secret value to import.
 * @param keychainName The name of the keychain to import the secret into.
 */
export async function prepareKeychainWithDeveloperCertificate(
  secretValue: string,
  keychain: Keychain
): Promise<void> {
  const decodedCert = Buffer.from(secretValue, 'base64').toString('utf-8')
  // // TODO this won't work for all certificate encodings (e.g. DER)
  // try {
  //   pki.certificateFromPem(decodedCert)
  // } catch (e) {
  //   throw new Error(
  //     `Failed to parse certificate (PEM support only right now): ${e}`
  //   )
  // }

  await keychain.createKeychain()
  await keychain.addToSearchList()
  await keychain.unlock()
  await keychain.importCertificateFromString(decodedCert, {
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
