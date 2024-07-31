import * as core from '@actions/core'
import { prepareKeychainWithDeveloperCertificate } from './certificate'
import { provisioningProfile } from './provisioning-profile'
import { appStoreConnectApiKey } from './app-store-connect-api-key'
import { Keychain } from './keychain'

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
    core.setSecret(secretValue)
    switch (assetType) {
      case 'certificate': {
        const keychainName: string = core.getInput('keychain-name')
        let keychainPassword: string = core.getInput('keychain-password')
        if (!keychainPassword) {
          // this isn't cryptographically secure, but it's good enough for a temporary keychain
          keychainPassword = Math.random().toString(36).slice(-8)
        }
        core.setSecret(keychainPassword)
        const keychain = new Keychain(keychainName, keychainPassword)
        await prepareKeychainWithDeveloperCertificate(secretValue, keychain)
        break
      }
      case 'provisioning-profile':
        await provisioningProfile(secretValue)
        break
      case 'app-store-connect-api-key': {
        await appStoreConnectApiKey(secretValue)
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
