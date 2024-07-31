import {
  appStoreConnectApiKey,
  buildAppStoreConnectApiKeyObject,
  generateTestKey
} from '../src/app-store-connect-api-key'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

describe('certificate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create and populate a keychain', async () => {
    const now = new Date().getTime().toString()
    const testDir = path.join(os.tmpdir(), `app-store-connect-api-key-${now}`)
    fs.mkdirSync(testDir)
    const keyPath = path.join(testDir, 'app-store-connect-api-test.p8')
    await generateTestKey(keyPath)

    const appStoreConnectConfig = await buildAppStoreConnectApiKeyObject(
      'keyId',
      'issuedId',
      keyPath
    )
    const base64ApiKey = Buffer.from(
      JSON.stringify(appStoreConnectConfig)
    ).toString('base64')

    await appStoreConnectApiKey(base64ApiKey, testDir)

    const gotAppStoreAuthObjPath = path.join(
      testDir,
      '.app-store-connect-api-key.json'
    )
    const gotAppStoreAuthObj = JSON.parse(
      fs.readFileSync(gotAppStoreAuthObjPath, 'utf-8')
    )
    expect(gotAppStoreAuthObj).toEqual(appStoreConnectConfig)

    const privateKeyPath = path.join(testDir, '.app-store-connect-api-key.p8')
    const gotPrivateKey = fs.readFileSync(privateKeyPath, 'utf-8')
    expect(gotPrivateKey).toEqual(
      Buffer.from(appStoreConnectConfig.privateKey, 'base64').toString('utf-8')
    )
  })
})
