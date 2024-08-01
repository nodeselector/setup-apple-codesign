import fs from 'node:fs'
import path from 'node:path'
import { spawn } from './spawn'
import * as core from '@actions/core'

type AppStoreAuthConfig = {
  keyId: string
  issuerId: string
  privateKey: string
}

export async function appStoreConnectApiKey(
  secretValue: string,
  destinationDir: string = ''
): Promise<void> {
  if (!destinationDir) {
    // see man altool for path expectations. most of the xcode tools allow you to specify a path
    // but notably, not altool.
    destinationDir = path.join(process.env.HOME as string, '.appstoreconnect/private_keys')
    fs.mkdirSync(destinationDir, { recursive: true })
  }
  const decodedSecret = Buffer.from(secretValue, 'base64').toString('utf-8')
  const appStoreAuthConfig: AppStoreAuthConfig = JSON.parse(decodedSecret)
  const apiKeyPath = path.join(
    destinationDir,
    'keyinfo.json'
  )
  fs.writeFileSync(apiKeyPath, decodedSecret)
  const decodedPrivateKey = Buffer.from(
    appStoreAuthConfig.privateKey,
    'base64'
  ).toString('utf-8')
  const privateKeyPath = path.join(
    destinationDir,
    `AuthKey_${appStoreAuthConfig.keyId}.p8` // altool expects this naming convention
  )
  fs.writeFileSync(privateKeyPath, decodedPrivateKey)

  core.setOutput('app-store-connect-api-key-key-path', privateKeyPath)
  core.setOutput('app-store-connect-api-key-key-id', appStoreAuthConfig.keyId)
  core.setOutput('app-store-connect-api-key-issuer-id', appStoreAuthConfig.issuerId)  

}

export async function buildAppStoreConnectApiKeyObject(
  keyId: string,
  issuerId: string,
  privateKeyPath: string
): Promise<AppStoreAuthConfig> {
  const secretValue = fs.readFileSync(privateKeyPath, 'utf-8')
  return {
    keyId,
    issuerId,
    privateKey: Buffer.from(secretValue).toString('base64')
  }
}

export async function generateTestKey(keyPath: string): Promise<void> {
  await spawn('openssl', [
    'ecparam',
    '-name',
    'prime256v1',
    '-genkey',
    '-noout',
    '-out',
    keyPath
  ])
}
