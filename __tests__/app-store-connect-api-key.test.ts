import {
  appStoreConnectApiKey,
  appStoreConfigFromSecretValue,
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

  it('should get config from secret value', async () => {
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

    const gotAppStoreAuthObj = appStoreConfigFromSecretValue(base64ApiKey)
    expect(gotAppStoreAuthObj).toEqual(appStoreConnectConfig)
  })

  it('should create and populate a keychain', async () => {
    const now = new Date().getTime().toString()
    const testDir = path.join(os.tmpdir(), `app-store-connect-api-key-${now}`)
    fs.mkdirSync(testDir)
    const keyPath = path.join(testDir, 'app-store-connect-api-test.p8')
    await generateTestKey(keyPath)

    const keyValue = fs.readFileSync(keyPath, 'utf-8')
    const keyBase64 = Buffer.from(keyValue).toString('base64')

    await appStoreConnectApiKey(
      {
        keyId: 'keyId',
        issuerId: 'issuedId',
        privateKey: keyBase64
      },
      testDir
    )

    const gotAppStoreAuthObjPath = path.join(testDir, 'keyinfo.json')
    const gotAppStoreAuthObj = JSON.parse(
      fs.readFileSync(gotAppStoreAuthObjPath, 'utf-8')
    )
    expect(gotAppStoreAuthObj.privateKey).toEqual(keyBase64)

    const privateKeyPath = path.join(testDir, 'AuthKey_keyId.p8')
    const gotPrivateKey = fs.readFileSync(privateKeyPath, 'utf-8')
    expect(gotPrivateKey).toEqual(keyValue)
  })
})
