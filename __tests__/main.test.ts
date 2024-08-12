/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from '../src/main'
import * as certificate from '../src/certificate'
import * as provisioningProfile from '../src/provisioning-profile'
import * as appStoreConnectApiKey from '../src/app-store-connect-api-key'

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Other utilities
const keychainPasswordRegex = /^.{8}$/

// Mock the GitHub Actions core library
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setSecretMock: jest.SpiedFunction<typeof core.setSecret>
let certificateMock: jest.SpiedFunction<
  typeof certificate.prepareKeychainWithDeveloperCertificate
>
let provisioningProfileMock: jest.SpiedFunction<
  typeof provisioningProfile.provisioningProfile
>
let appStoreConnectApiKeyMock: jest.SpiedFunction<
  typeof appStoreConnectApiKey.appStoreConnectApiKey
>
let appStoreConfigFromSecretValueMock: jest.SpiedFunction<
  typeof appStoreConnectApiKey.appStoreConfigFromSecretValue
>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setSecretMock = jest.spyOn(core, 'setSecret').mockImplementation()
    certificateMock = jest
      .spyOn(certificate, 'prepareKeychainWithDeveloperCertificate')
      .mockImplementation()
    provisioningProfileMock = jest
      .spyOn(provisioningProfile, 'provisioningProfile')
      .mockImplementation()
    appStoreConnectApiKeyMock = jest
      .spyOn(appStoreConnectApiKey, 'appStoreConnectApiKey')
      .mockImplementation()
    appStoreConfigFromSecretValueMock = jest
      .spyOn(appStoreConnectApiKey, 'appStoreConfigFromSecretValue')
      .mockImplementation()
  })

  it('fails for invalid asset type', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'asset-type':
          return 'invalid'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenCalledWith('Invalid asset type: invalid')
  })

  it('calls certificate for certificate asset type', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'asset-type':
          return 'certificate'
        case 'secret-value':
          return 'test-secret-value'
        case 'keychain-name':
          return 'ci'
        case 'keychain-password':
          return 'goodpassword!'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(setSecretMock).toHaveBeenCalledWith('test-secret-value')
    expect(setSecretMock).toHaveBeenCalledWith('goodpassword!')
    expect(certificateMock).toHaveBeenCalledWith(
      'test-secret-value',
      expect.objectContaining({
        keychainName: 'ci',
        keychainPassword: 'goodpassword!'
      })
    )
  })

  it('generates password for default keychain password value certificate', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'asset-type':
          return 'certificate'
        case 'secret-value':
          return 'test-secret-value'
        case 'keychain-name':
          return 'ci'
        case 'keychain-password':
          return ''
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(setSecretMock).toHaveBeenCalledWith('test-secret-value')
    expect(setSecretMock).toHaveBeenCalledWith(
      expect.stringMatching(keychainPasswordRegex)
    )
    expect(provisioningProfileMock).not.toHaveBeenCalled()
    expect(appStoreConnectApiKeyMock).not.toHaveBeenCalled()
    expect(certificateMock).toHaveBeenCalledWith(
      'test-secret-value',
      expect.objectContaining({
        keychainName: 'ci',
        keychainPassword: expect.stringMatching(keychainPasswordRegex)
      })
    )
  })

  it('calls provisioningProfile for provisioning-profile asset type', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'asset-type':
          return 'provisioning-profile'
        case 'secret-value':
          return 'test-secret-value'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(setSecretMock).toHaveBeenCalledWith('test-secret-value')
    expect(certificateMock).not.toHaveBeenCalled()
    expect(appStoreConnectApiKeyMock).not.toHaveBeenCalled()
    expect(provisioningProfileMock).toHaveBeenCalledWith('test-secret-value')
  })

  it('calls appStoreConnectApiKey for app-store-connect-api-key asset type', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'asset-type':
          return 'app-store-connect-api-key'
        case 'secret-value':
          return 'test-secret-value'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(setSecretMock).toHaveBeenCalledWith('test-secret-value')
    expect(certificateMock).not.toHaveBeenCalled()
    expect(provisioningProfileMock).not.toHaveBeenCalled()
    expect(appStoreConfigFromSecretValueMock).toHaveBeenCalledWith(
      'test-secret-value'
    )
  })

  it('calls appStoreConnectApiKey for app-store-connect-api-key asset type with auth inputs', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'asset-type':
          return 'app-store-connect-api-key'
        case 'app-store-connect-api-key-key-id':
          return 'test-key-id'
        case 'app-store-connect-api-key-issuer-id':
          return 'test-issuer-id'
        case 'app-store-connect-api-key-base64-private-key':
          return 'test-base64-private-key'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(setSecretMock).toHaveBeenCalledWith('')
    expect(certificateMock).not.toHaveBeenCalled()
    expect(provisioningProfileMock).not.toHaveBeenCalled()
    expect(appStoreConnectApiKeyMock).toHaveBeenCalledWith({
      keyId: 'test-key-id',
      issuerId: 'test-issuer-id',
      privateKey: 'test-base64-private-key'
    })
  })
})
