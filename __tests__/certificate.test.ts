import fs from 'node:fs'
import { Keychain } from '../src/keychain'
import {
  prepareKeychainWithDeveloperCertificate,
  generateTestCertificate,
  testCommonName
} from '../src/certificate'
import path from 'node:path'
import os from 'node:os'

describe('certificate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.onMac('should create and populate a keychain', async () => {
    const now = new Date().getTime().toString()
    const testDir = path.join(os.tmpdir(), `app-store-connect-api-key-${now}`)
    fs.mkdirSync(testDir, { recursive: true })

    const testKey = path.join(testDir, 'test-apple-developer-key.pem')
    const testCrt = path.join(testDir, 'test-apple-developer-crt.pem')

    const testKeychain = new Keychain(`test-keychain-${now}`, 'test-password')
    let searchList = await testKeychain.getSearchList()
    expect(searchList).not.toContain(testKeychain.keychainName)
    expect(searchList).toContain(
      path.join(os.homedir(), 'Library', 'Keychains', 'login.keychain-db')
    )

    const base64Secret = await generateTestCertificate(testKey, testCrt)

    expect(testKeychain.exists()).toBe(false)
    await prepareKeychainWithDeveloperCertificate(base64Secret, testKeychain)
    expect(testKeychain.exists()).toBe(true)

    const certficiateLookup = await testKeychain.findCertificate(testCommonName)

    expect(certficiateLookup).toBeDefined()
    expect(certficiateLookup.Code).toBe(0)
    expect(certficiateLookup.Stdout).toContain(testCommonName)

    searchList = await testKeychain.getSearchList()
    expect(searchList).toContain(testKeychain.keychainNameToPath())

    await testKeychain.deleteKeychain()

    expect(testKeychain.exists()).toBe(false)
  })
})
