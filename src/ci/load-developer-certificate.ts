import fs from 'node:fs'
import path from 'node:path'
import * as core from '@actions/core'
import os from 'node:os'
import { generateTestCertificate } from '../certificate'
;(async () => {
  const now = new Date().getTime().toString()
  const testDir = path.join(os.tmpdir(), `app-store-connect-api-key-${now}`)
  fs.mkdirSync(testDir, { recursive: true })

  const testKey = path.join(testDir, 'test-apple-developer-key.pem')
  const testCrt = path.join(testDir, 'test-apple-developer-crt.pem')

  const base64Secret = await generateTestCertificate(testKey, testCrt)
  core.setSecret(base64Secret)
  core.exportVariable('DEVELOPER_CERTIFICATE', base64Secret)
})()
