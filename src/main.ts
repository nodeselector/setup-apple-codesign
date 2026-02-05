import * as core from '@actions/core'
import { prepareKeychainWithDeveloperCertificate } from './certificate'
import { provisioningProfile } from './provisioning-profile'
import {
  appStoreConnectApiKey,
  appStoreConfigFromSecretValue
} from './app-store-connect-api-key'
import { Keychain } from './keychain'

/**
 * Generate a random keychain password if none is provided.
 * @param providedPassword The password provided by the user (may be empty).
 * @returns A keychain password.
 */
function makeKeychainPassword(providedPassword: string): string {
  if (providedPassword) {
    return providedPassword
  }
  // this isn't cryptographically secure, but it's good enough for a temporary keychain
  return Math.random().toString(36).slice(-8)
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  // if we're not on macos, fail the action
  if (process.platform !== 'darwin') {
    core.setFailed('This action is only supported on macOS')
    return
  }
  try {
    const assetType: string = core.getInput('asset-type')
    const secretValue: string = core.getInput('secret-value')
    if (secretValue) {
      core.setSecret(secretValue)
    }
    switch (assetType) {
      case '': {
        // Default case: set up both API key and certificate
        const keyId: string = core.getInput('app-store-connect-api-key-key-id')
        const issuerId: string = core.getInput(
          'app-store-connect-api-key-issuer-id'
        )
        const apiPrivateKey: string = core.getInput(
          'app-store-connect-api-key-base64-private-key'
        )

        if (!keyId || !issuerId || !apiPrivateKey) {
          throw new Error(
            'Missing required inputs: app-store-connect-api-key-key-id, app-store-connect-api-key-issuer-id, app-store-connect-api-key-base64-private-key'
          )
        }

        const certificateValue: string = core.getInput('secret-value')
        if (!certificateValue) {
          throw new Error('Missing required input: secret-value (certificate)')
        }

        await appStoreConnectApiKey({
          keyId,
          issuerId,
          privateKey: apiPrivateKey
        })

        core.setSecret(certificateValue)
        const keychainName: string = core.getInput('keychain-name')
        const keychainPassword: string = makeKeychainPassword(
          core.getInput('keychain-password')
        )
        core.setSecret(keychainPassword)
        const keychain = new Keychain(keychainName, keychainPassword)
        const certificatePassword: string = core.getInput(
          'certificate-password'
        )
        if (certificatePassword) {
          core.setSecret(certificatePassword)
        }
        await prepareKeychainWithDeveloperCertificate(
          certificateValue,
          keychain,
          {
            password: certificatePassword || undefined
          }
        )
        break
      }
      case 'certificate': {
        const keychainName: string = core.getInput('keychain-name')
        const keychainPassword: string = makeKeychainPassword(
          core.getInput('keychain-password')
        )
        core.setSecret(keychainPassword)
        const keychain = new Keychain(keychainName, keychainPassword)
        const certificatePassword: string = core.getInput(
          'certificate-password'
        )
        if (certificatePassword) {
          core.setSecret(certificatePassword)
        }
        await prepareKeychainWithDeveloperCertificate(secretValue, keychain, {
          password: certificatePassword || undefined
        })
        break
      }
      case 'provisioning-profile':
        await provisioningProfile(secretValue)
        break
      case 'app-store-connect-api-key': {
        if (secretValue) {
          await appStoreConnectApiKey(
            appStoreConfigFromSecretValue(secretValue)
          )
          break
        }

        const keyId: string = core.getInput('app-store-connect-api-key-key-id')
        const issuerId: string = core.getInput(
          'app-store-connect-api-key-issuer-id'
        )
        const privateKey: string = core.getInput(
          'app-store-connect-api-key-base64-private-key'
        )

        if (!keyId || !issuerId || !privateKey) {
          throw new Error(
            'Missing required input for app-store-connect-api-key asset type'
          )
        }

        await appStoreConnectApiKey({
          keyId,
          issuerId,
          privateKey
        })
        break
      }
      default:
        throw new Error(`Invalid asset type: ${assetType}`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
