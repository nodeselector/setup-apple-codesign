import fs from 'node:fs'
import path from 'node:path'
import { spawn } from './spawn'
import core from '@actions/core'

type AppStoreAuthConfig = {
  keyId: string
  issuerId: string
  privateKey: string
}

export async function appStoreConnectApiKey(
  secretValue: string,
  destinationDir: string = process.env.RUNNER_TEMP || ''
): Promise<void> {
  if (!destinationDir) {
    throw new Error('RUNNER_TEMP not set')
  }
  const decodedSecret = Buffer.from(secretValue, 'base64').toString('utf-8')
  const appStoreAuthConfig: AppStoreAuthConfig = JSON.parse(decodedSecret)
  const apiKeyPath = path.join(
    destinationDir,
    '.app-store-connect-api-key.json'
  )
  fs.writeFileSync(apiKeyPath, decodedSecret)
  const decodedPrivateKey = Buffer.from(
    appStoreAuthConfig.privateKey,
    'base64'
  ).toString('utf-8')
  const privateKeyPath = path.join(
    destinationDir,
    '.app-store-connect-api-key.p8'
  )
  fs.writeFileSync(privateKeyPath, decodedPrivateKey)

  core.setOutput('app-store-connect-api-private-key-path', privateKeyPath)
  core.setOutput('app-store-connect-api-key-id', appStoreAuthConfig.keyId)
  core.setOutput('app-store-connect-api-issuer-id', appStoreAuthConfig.issuerId)  

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
