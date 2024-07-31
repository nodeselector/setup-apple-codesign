import {
  buildAppStoreConnectApiKeyObject,
  generateTestKey
} from '../app-store-connect-api-key'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import * as core from '@actions/core'
;(async () => {
  const now = new Date().getTime().toString()
  const testDir = path.join(os.tmpdir(), `app-store-connect-api-key-${now}`)
  const testKey = path.join(testDir, 'app-store-connect-api-key.p8')
  fs.mkdirSync(testDir)
  await generateTestKey(testKey)
  const obj = await buildAppStoreConnectApiKeyObject(
    'keyId',
    'issuedId',
    testKey
  )
  core.setSecret(obj.keyId)
  core.setSecret(obj.issuerId)
  core.setSecret(obj.privateKey)
  const encoded = Buffer.from(JSON.stringify(obj)).toString('base64')
  core.setSecret(encoded)
  core.exportVariable('APP_STORE_CONNECT_API_KEY', encoded)
})()
