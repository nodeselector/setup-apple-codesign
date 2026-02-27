import fs from 'node:fs'
import { Keychain } from '../src/keychain'
import {
  prepareKeychainWithDeveloperCertificate,
  generateTestCertificate,
  testCommonName,
  detectCertificateFormat,
  isBase64Encoded,
  decodeCertificateInput
} from '../src/certificate'
import path from 'node:path'
import os from 'node:os'

describe('certificate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('detectCertificateFormat', () => {
    it('should detect PEM format', () => {
      const pemData = Buffer.from('-----BEGIN CERTIFICATE-----\nMIIC...')
      expect(detectCertificateFormat(pemData)).toBe('pem')
    })

    it('should detect P12 format using real P12 data', () => {
      // Real base64-encoded P12 certificate
      const base64P12 = `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`
      const p12Data = Buffer.from(base64P12, 'base64')
      expect(detectCertificateFormat(p12Data)).toBe('p12')
    })

    it('should throw error for unknown binary data', () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03])
      expect(() => detectCertificateFormat(binaryData)).toThrow(
        'Unsupported certificate format'
      )
    })
  })

  describe('isBase64Encoded', () => {
    it('should return true for valid base64 strings', () => {
      const base64 = Buffer.from('Hello World').toString('base64')
      expect(isBase64Encoded(base64)).toBe(true)
    })

    it('should return false for raw PEM content', () => {
      const pem = '-----BEGIN CERTIFICATE-----\nMIIC...'
      expect(isBase64Encoded(pem)).toBe(false)
    })

    it('should return false for non-base64 strings', () => {
      expect(isBase64Encoded('not-valid-base64!@#$')).toBe(false)
    })
  })

  describe('decodeCertificateInput', () => {
    it('should return Buffer input unchanged', () => {
      const input = Buffer.from('test data')
      const result = decodeCertificateInput(input)
      expect(result).toBe(input)
    })

    it('should decode base64 encoded strings', () => {
      const original = '-----BEGIN CERTIFICATE-----\ntest'
      const base64 = Buffer.from(original).toString('base64')
      const result = decodeCertificateInput(base64)
      expect(result.toString('utf-8')).toBe(original)
    })

    it('should return raw PEM strings as-is', () => {
      const pem = '-----BEGIN CERTIFICATE-----\nMIIC...'
      const result = decodeCertificateInput(pem)
      expect(result.toString('utf-8')).toBe(pem)
    })
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

  it.onMac(
    'should import raw PEM with RSA private key and certificate',
    async () => {
      const now = new Date().getTime().toString()

      // Raw PEM input with RSA private key first, then certificate
      const rawPem = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAqt+UW+UwfVwAa53Fl7687btTJBJ2fwKPpz8W9bzn9uh7Hxcv
xoRuuT88sbpqCf5uxxOCE/nWWHxwAczW0zk+jFo5xSxNzfbFMWr7kXkxSFBdI6bg
hjLXeiDeCijLBSiXzchqih4WPZunspUVZvwfSIx82hkFY7IW/kgHOLjcIUwYbwKJ
92IQz9KOgnZzUD/COWVQx7XR741xAa1jjSTATlf2eqBBqE1cHQkdCyhflHMVLa50
lGysBQ/DJ3vsraG3TPgIzHb7aq++BmxPkhDqu9mpac4Fee4WV2GrJhSTP/XBZIHY
aVUkx18B+kkVp26vpgdrV8wBAQJ8He6QiwNjlQIDAQABAoIBAAsV47ZdhVqQqi9R
JkVMuM2UilWMBBeD10WCrI7nQUZNuVUgSDdxFozamymtnh0FXnL4Y0c//WWytwKK
40IDU/k/jkFqOSb8VDk7R1ReADJAknZSaH0UVdHkyXrvwBIW2thdIPpSbt9y1nuZ
u/B5OV9Xy+7LUkPwRRkcm6lUpuVbAw1ONwVCfGW6ebcCZuABF8opbq7pQnKhjZBK
UPryxFgFHvQAXm1PH0UdjNNmsPU/ouc1gowcB0v+PLKdNYWwyYH//5tZE4xh00U9
Rm1IU21PYkM0u/bIQBoAfIeT9o3RyKPncdux2adTlBEkd3S0ZNt5EJJGcbCf0nsr
zpx2DykCgYEAx9bSSrZG9LmoWB5x3zQ0ss7+2RZzfqoqUNWCxWLl3FLNgOSdJQ44
FgUT9eAlL0/++yitQKwn8Qg14rILFJf5heQChSHjlAaxwb3kAC1p6yMiNL6v0At5
WG7ixQkQHkcjpMIuXqak5Fy6iypTgc5hgysKsoe4MXv3eGrCgaMaEy0CgYEA2uTZ
uFL5FNF8x48i+g00B+OXM8TzjF9K8H7IUqzbgrXVktNsKxY79Exht1Cc5j4BXIQs
rKMgkIm5/7eK4H1w99EAneHWh57qbEVeYOk0oYoggO5QKHw3XT12ZGqCPmd7fIXm
z1s7+q6i3/yeT8EoLKdtX4PlJktBWRvgOJ2Z8wkCgYA5hjP4f6nDLmIwI2th9dQp
mH4xnU3Xq0INDLjc+s/x8P/o12YI0aQBaqrJPyFVEjDyuU3N7QB+WH+yZs/buLeB
/BVhn1S0Oo0WmQO1rVzs66sgBbf0Kile9GRglXBHVvECr0bLxip29d5YyvFIz1Cw
gkZNB9ZUoDunNQwSZxHNbQKBgQCxyrXomERGG41dTa6cKYM8cShL3Unwlyn4QxIU
zOASv/y0IFO4f3u9BxlLWwfFn1FdwuHCa1E09RkFUiBUDK9oKfN1SY0FZReFT6bD
0kd0egvCjU7AQ3x4mEaEc1pMs6LCVsRNYg5Ko/QZOEeiAgLOmkMlFK1YOEHgzdqG
QcRceQKBgQChFsMnEkuRsGIH/fYShUl8gFLtW+BEv06/Za7o+anpfv9Qe4HLwOWY
oEvMGlItnOxo/ueFBHZJ0S9Nhmmo6amNl/xF5f9s1JFl0ej1xBzzXC9HJUhvY6d/
95pdPDepIiUjAuFLdiv6jlz3zwlecrhtHIITATysgnh76czD+/ZiGg==
-----END RSA PRIVATE KEY-----
-----BEGIN CERTIFICATE-----
MIIFzjCCBLagAwIBAgIQEEx/oVtsulHhBZA9u0mxVzANBgkqhkiG9w0BAQsFADB1
MUQwQgYDVQQDDDtBcHBsZSBXb3JsZHdpZGUgRGV2ZWxvcGVyIFJlbGF0aW9ucyBD
ZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTELMAkGA1UECwwCRzMxEzARBgNVBAoMCkFw
cGxlIEluYy4xCzAJBgNVBAYTAlVTMB4XDTI2MDIwNDE4MDAzMVoXDTI3MDIwNDE4
MDAzMFowgZQxGjAYBgoJkiaJk/IsZAEBDApOWVQ0MlRQSjhVMTgwNgYDVQQDDC9B
cHBsZSBEZXZlbG9wbWVudDogQ3JlYXRlZCB2aWEgQVBJIChOWVQ0MlRQSjhVKTET
MBEGA1UECwwKOExOQlM4UldIVzEaMBgGA1UECgwRTmljaG9sYXMgU2FrYWltYm8x
CzAJBgNVBAYTAlVTMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqt+U
W+UwfVwAa53Fl7687btTJBJ2fwKPpz8W9bzn9uh7HxcvxoRuuT88sbpqCf5uxxOC
E/nWWHxwAczW0zk+jFo5xSxNzfbFMWr7kXkxSFBdI6bghjLXeiDeCijLBSiXzchq
ih4WPZunspUVZvwfSIx82hkFY7IW/kgHOLjcIUwYbwKJ92IQz9KOgnZzUD/COWVQ
x7XR741xAa1jjSTATlf2eqBBqE1cHQkdCyhflHMVLa50lGysBQ/DJ3vsraG3TPgI
zHb7aq++BmxPkhDqu9mpac4Fee4WV2GrJhSTP/XBZIHYaVUkx18B+kkVp26vpgdr
V8wBAQJ8He6QiwNjlQIDAQABo4ICODCCAjQwDAYDVR0TAQH/BAIwADAfBgNVHSME
GDAWgBQJ/sAVkPmvZAqSErkmKGMMl+ynsjBwBggrBgEFBQcBAQRkMGIwLQYIKwYB
BQUHMAKGIWh0dHA6Ly9jZXJ0cy5hcHBsZS5jb20vd3dkcmczLmRlcjAxBggrBgEF
BQcwAYYlaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy13d2RyZzMwNDCCAR4G
A1UdIASCARUwggERMIIBDQYJKoZIhvdjZAUBMIH/MIHDBggrBgEFBQcCAjCBtgyB
s1JlbGlhbmNlIG9uIHRoaXMgY2VydGlmaWNhdGUgYnkgYW55IHBhcnR5IGFzc3Vt
ZXMgYWNjZXB0YW5jZSBvZiB0aGUgdGhlbiBhcHBsaWNhYmxlIHN0YW5kYXJkIHRl
cm1zIGFuZCBjb25kaXRpb25zIG9mIHVzZSwgY2VydGlmaWNhdGUgcG9saWN5IGFu
ZCBjZXJ0aWZpY2F0aW9uIHByYWN0aWNlIHN0YXRlbWVudHMuMDcGCCsGAQUFBwIB
FitodHRwczovL3d3dy5hcHBsZS5jb20vY2VydGlmaWNhdGVhdXRob3JpdHkvMBYG
A1UdJQEB/wQMMAoGCCsGAQUFBwMDMB0GA1UdDgQWBBTpJ2RS+5BVTZknFEUiJVhY
Z5xaKDAOBgNVHQ8BAf8EBAMCB4AwEwYKKoZIhvdjZAYBAgEB/wQCBQAwEwYKKoZI
hvdjZAYBDAEB/wQCBQAwDQYJKoZIhvcNAQELBQADggEBADs8HU+ReUnQQrbcGsxh
zjHQB/3xL6p4+NvJUBucfmXDQELRGjCNd2aMzBf0J6yCtHxFuTrh6OaiZUHVd8XR
c5bVoV5V7I4OblMkvlv0igyFP4xpNj7YLT83EATwkKIugb0R3pOz6k5e1u20dN9/
JEDerNCm/RYG24NchYGpW42QNK2I5pJoYtXZZLbZfJ2mDQ9MxOZvcYQ5kyfAidZB
7ff1ZXrOBw4a7hWcQmJdq20F+MCfMWNDUSBlRECEhXycur7Vt9IHcheRH+qhwWY+
1QTGR4Yw9L9vBZUTR4beq0Rtrts1pU7EwAENLLm/UlgtfjRb8XGWNYPqG26awFI6
gDI=
-----END CERTIFICATE-----`

      const expectedCommonName =
        'Apple Development: Created via API (NYT42TPJ8U)'

      const testKeychain = new Keychain(
        `test-keychain-raw-pem-${now}`,
        'test-password'
      )

      try {
        expect(testKeychain.exists()).toBe(false)
        await prepareKeychainWithDeveloperCertificate(rawPem, testKeychain)
        expect(testKeychain.exists()).toBe(true)

        const certficiateLookup =
          await testKeychain.findCertificate(expectedCommonName)

        expect(certficiateLookup).toBeDefined()
        expect(certficiateLookup.Code).toBe(0)
        expect(certficiateLookup.Stdout).toContain(expectedCommonName)
      } finally {
        if (testKeychain.exists()) {
          await testKeychain.deleteKeychain()
        }
      }
    }
  )

  it.onMac('should import base64-encoded P12 without password', async () => {
    const now = new Date().getTime().toString()

    // Base64-encoded P12 certificate (no password)
    const base64P12 = `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`

    const expectedCommonName = 'Apple Development: Created via API (NYT42TPJ8U)'

    const testKeychain = new Keychain(
      `test-keychain-p12-${now}`,
      'test-password'
    )

    try {
      expect(testKeychain.exists()).toBe(false)
      await prepareKeychainWithDeveloperCertificate(base64P12, testKeychain)
      expect(testKeychain.exists()).toBe(true)

      const certficiateLookup =
        await testKeychain.findCertificate(expectedCommonName)

      expect(certficiateLookup).toBeDefined()
      expect(certficiateLookup.Code).toBe(0)
      expect(certficiateLookup.Stdout).toContain(expectedCommonName)
    } finally {
      if (testKeychain.exists()) {
        await testKeychain.deleteKeychain()
      }
    }
  })

  it.onMac(
    'should import PEM with encrypted private key and password',
    async () => {
      const now = new Date().getTime().toString()

      const encryptedPem = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIIFLTBXBgkqhkiG9w0BBQ0wSjApBgkqhkiG9w0BBQwwHAQIIiapvyT6Lt0CAicQ
MAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAEqBBDuwrVDIR4+ZL3xkX4W3HSxBIIE
0JdzG8uQTenOtB+8TCGJB2PC8Y25YKnyEr4LR9+riP21ZlErdhmJ4Hpkkogv9sOz
8UzOPcCu9ijzMIs/ei8xkEsX5CX41eKIB5lC6DX61nK5YX3vawZpNqHrUyx/zMv6
SAwxwfDXS73ReQerxQat93Bg8hWEY8pn8toe5UXJtID7sOiQoVHE4JzsUqpvEruj
dql59PysF+8j1ST5FAkJK62Q6FnRvb2ElbXEU0KhfJ3tG+ydmOuupgOWkKobYAYS
wt++UJe4VLjonqnP2ex4HS9Bp6sHsQPaoveTD8vkxTXQGM/2Q9BlYOupwuU+O9G/
dFZWxbrPnExdws/jorrNzyi++D3uDj0/iO3gz3dpPfS8TNtFTJBcxTDfnhHD3HnR
te+O9N8+lyl2Dsj264FvWnDdkrTip3iTvjngkEcXDwsTTDOr1m7EmOKClnGUMdni
bQ/p4E9WAvyNf+vdcOX6fOp8hJGKnMlvL0yB1Fr8XPuRDf9u+ft2ugYtL0y89z0s
A5AZoZyZTc+RmWGmFzHwupJaVCF24WkSX/FQHdKneuQQN8iWZ8/vRvW4BwBifoyv
HfMbpQ+CeqsrJzliLo0Gk8IAUr8Zzd3hcxXpc6v/uFiv+kV4Mqttp6CDf46UxFSg
nujtWFDqdEXfSKyCD4Nml3YPcPdv2OpIxKXSbE4+7aLfLSF0nOt4PqhKEJHbe3nH
xVHdx2tmd32oOkdmqeNi+PSWfaDtEoV8ECscSHG8iAU52FDI8IzatqFWy/4PvqHv
zT2EzRpo2CSw3eCwIUKKU3h74dyAwXin8CRtfnN4RkZ40li5rjyI4dH2TjBmaJ+Y
Z0/X292fWXlYN8zqIP61ybTjRLBcTPR4QueilNwfa7XHuAgVvvnfLyBAfzRm+C0a
JnUwFMPKZ5xRLRMfJKZzmj/ssqzJ1Sd9SCnEXp/Hu+6z81EN06sNVrLcJDtfYdU6
S2UMuECZzFCDcXF42osWAcLj/QwDDdaCURNLMzOssUnWG0gx8vbDD+GMAdUPeOJr
cezVN+a4AmfXlm/8VNF25AP4U+F+xOgJqnpTrKQup0R1hA/KwLF3rF7w+DeBBCwZ
hf4HPctpCvkV7YaqHA2F+IR/bxuhlzZeqNwoISA3xZwbYcl9ea1faugTXOjNLwcg
K7We9Fdns3MVshEWedd1jeB57qjGgEg1TqNvfeHPbBEsnzLHE42qCGPXUjWFl3+O
UTQQwlcY9lnaOUxoARJQAaBMxq3X6PLwN+ekX8wbdQt1CI2Ve6MH8Ji/x1j8h5xq
B/zeGp+s+a9axcZ9x1QupUsUn5jynlIfU35U5Ab5XFdw+A/mrvLd2akHteOKLecF
LIbGOe+dYig8wqtz5xKGtj+M+EPR+4UkNkE/WFrE0kYwghClJVyEzQSNU9BBOb5O
wt75PBXbH2piLP911er24MlIIvI1EM+kUAFJWxk3bTY5wyRV3F5fZr/VwmwJ0sk1
3RKY7ydwHer+Hifg5doYLYV8qH4aunGWp/co88uROvLPHHPa7mbxzjgG2IPPVNTw
ZFrfWDAcnr4zpSzLRsZrlYW/6q1yx7AQkCLrkXWBmcFI4FCDMzwPIO+EyImcHxw4
Nvz7r9SdCAgHUy7g8tjvnJjpgK/QBaq4ljUuwGEaQTq6
-----END ENCRYPTED PRIVATE KEY-----
-----BEGIN CERTIFICATE-----
MIIFzjCCBLagAwIBAgIQGECz6TZ9Zk0AFuJOR1xuKjANBgkqhkiG9w0BAQsFADB1
MUQwQgYDVQQDDDtBcHBsZSBXb3JsZHdpZGUgRGV2ZWxvcGVyIFJlbGF0aW9ucyBD
ZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTELMAkGA1UECwwCRzMxEzARBgNVBAoMCkFw
cGxlIEluYy4xCzAJBgNVBAYTAlVTMB4XDTI2MDIwNDIwMzMzM1oXDTI3MDIwNDIw
MzMzMlowgZQxGjAYBgoJkiaJk/IsZAEBDApOWVQ0MlRQSjhVMTgwNgYDVQQDDC9B
cHBsZSBEZXZlbG9wbWVudDogQ3JlYXRlZCB2aWEgQVBJIChOWVQ0MlRQSjhVKTET
MBEGA1UECwwKOExOQlM4UldIVzEaMBgGA1UECgwRTmljaG9sYXMgU2FrYWltYm8x
CzAJBgNVBAYTAlVTMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxnL9
cCmSGCY7R8qvGpm1oD+GalJH6SWHc5bQXjbJSCpbV2G0bcJLZzu16PJeOtmsjJYu
yfm3OeedxJF2JLTiTrQq2HvSh8gW+1k6aUzp0/F3Rz6bmWrdZiUfm0073ue8x8bx
eFlgfbiSvGHKDHxqgGYoAHLI+7yDkiLqduFdbY+HskNEgA37ZCeitam0rmrk3rvU
vLrqmdl7964LahVC359nj2UD8DFjy83dNncSWOoLPL1E5JOSMTnCM4lgySC8c/pw
uCU6mryUchLKbjV6jdZ/Fmq+DZWOIM/4Qkj/utCbCmXFdBWsXgYewCBh0wECNbbU
dYqMvnj+aA6VWIkwRwIDAQABo4ICODCCAjQwDAYDVR0TAQH/BAIwADAfBgNVHSME
GDAWgBQJ/sAVkPmvZAqSErkmKGMMl+ynsjBwBggrBgEFBQcBAQRkMGIwLQYIKwYB
BQUHMAKGIWh0dHA6Ly9jZXJ0cy5hcHBsZS5jb20vd3dkcmczLmRlcjAxBggrBgEF
BQcwAYYlaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy13d2RyZzMwNDCCAR4G
A1UdIASCARUwggERMIIBDQYJKoZIhvdjZAUBMIH/MIHDBggrBgEFBQcCAjCBtgyB
s1JlbGlhbmNlIG9uIHRoaXMgY2VydGlmaWNhdGUgYnkgYW55IHBhcnR5IGFzc3Vt
ZXMgYWNjZXB0YW5jZSBvZiB0aGUgdGhlbiBhcHBsaWNhYmxlIHN0YW5kYXJkIHRl
cm1zIGFuZCBjb25kaXRpb25zIG9mIHVzZSwgY2VydGlmaWNhdGUgcG9saWN5IGFu
ZCBjZXJ0aWZpY2F0aW9uIHByYWN0aWNlIHN0YXRlbWVudHMuMDcGCCsGAQUFBwIB
FitodHRwczovL3d3dy5hcHBsZS5jb20vY2VydGlmaWNhdGVhdXRob3JpdHkvMBYG
A1UdJQEB/wQMMAoGCCsGAQUFBwMDMB0GA1UdDgQWBBTaETyx87nyOpGU4f9pJwwH
D/wN/jAOBgNVHQ8BAf8EBAMCB4AwEwYKKoZIhvdjZAYBAgEB/wQCBQAwEwYKKoZI
hvdjZAYBDAEB/wQCBQAwDQYJKoZIhvcNAQELBQADggEBAKiMHs5G6gdqa+hlydVS
WFbf3NUyQgsWbh1CDYQiDFkhO8XUbzH1pzpVBEF++2NaugBToxHItzlH7RmIhw9D
pdDiXjMEVeafQfJfWPlUS7EgBAz9uNKhj51nfpHNG4qrf6kQpMZ0XiqxnWMPDkIA
q6MNGuqGE7n5ym+NSU5LWF2sc+9dYPIdsu8rU+ntjXaHTYDAwf2MuYYkcUh/UN78
cMwLAxQ2ocYA16b5YfiQdKSgNW9WsqZ3EFiRpTSNHOHAKPPjbCOtVJjhHCQwotp0
ul0uG/gL4qFlsxWWKDrfcgY3Wr4dOq9dQF1+djy4Af69vvAD9MO6ahtbRP79V8Ex
Vz0=
-----END CERTIFICATE-----`

      const expectedCommonName =
        'Apple Development: Created via API (NYT42TPJ8U)'

      const testKeychain = new Keychain(
        `test-keychain-encrypted-${now}`,
        'test-password'
      )

      try {
        expect(testKeychain.exists()).toBe(false)
        await prepareKeychainWithDeveloperCertificate(
          encryptedPem,
          testKeychain,
          { password: 'gummybear' }
        )
        expect(testKeychain.exists()).toBe(true)

        const certficiateLookup =
          await testKeychain.findCertificate(expectedCommonName)

        expect(certficiateLookup).toBeDefined()
        expect(certficiateLookup.Code).toBe(0)
        expect(certficiateLookup.Stdout).toContain(expectedCommonName)
      } finally {
        if (testKeychain.exists()) {
          await testKeychain.deleteKeychain()
        }
      }
    }
  )
})
