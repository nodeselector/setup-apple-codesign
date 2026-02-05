# Setup Apple Code Signing

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This action sets up a macOS runner for code signing. It's in the early stages
of development and is not yet ready for production use.

| Asset Type | Support |
| ---------- | ------- |
| Developer Certificate | ✅ |
| [App Store Connect API Key][api-key-docs] | ✅ |
| Provisioning Profile | ❌ |

[api-key-docs]: https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api

For an overview of the automated and manual code signing process, see
[Apple Code Signing Overview](apple_codesigning_overview.md).

## Sample Workflow

> [!NOTE]
> Apple Developer Enterprise accounts do not support App Store Connect
> API keys.
>
> [!IMPORTANT]
> "Automatically manage signing" in Xcode refers to how Xcode behaves when
> signed into a developer account through the GUI. This does not apply to
> `xcodebuild`, which requires explicit API authorization via the
> `-allowProvisioningUpdates` flag and authentication parameters, regardless
> of the Xcode project's signing configuration.

Both the API key and development certificate are required for automated
signing. The App Store Connect API key enables `xcodebuild` to communicate
with Apple's servers to download provisioning profiles remotely. However, if
a development certificate is not installed in the keychain before `xcodebuild`
runs, it will automatically create a new certificate in the Developer Portal.
Installing the certificate first ensures `xcodebuild` uses your existing
certificate for signing while still leveraging the API key for remote
provisioning profile management.

The action persists the App Store Connect API key to a file on the runner
because `xcodebuild` requires the `-authenticationKeyPath` parameter to point
to a file path—it does not accept API credentials via environment variables.

## Streamlined Setup (Recommended)

For the common case where you need both API key and certificate:

```yml
name: build with automatic signing

on:
  push:
  pull_request:
    branches:
      - main

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: nodeselector/setup-apple-codesign@v0.0.2
        with:
          # Certificate (PEM or P12 - P12 must be base64 encoded)
          secret-value: ${{ secrets.CERTIFICATE_PEM_OR_P12 }}
          # Optional: password for encrypted certificates
          certificate-password: ${{ secrets.CERT_PASSWORD }}
          # App Store Connect API credentials
          app-store-connect-api-key-key-id: ${{ secrets.ASC_KEY_ID }}
          app-store-connect-api-key-issuer-id: ${{ secrets.ASC_ISSUER_ID }}
          app-store-connect-api-key-base64-private-key: ${{ secrets.ASC_KEY }}
      # This example shows xcodebuild invocation for illustration.
      # You may use a different action/API to invoke xcodebuild, but ensure
      # the necessary flags are set to support automated code signing.
      - name: Build with xcodebuild
        run: |
          xcodebuild -project helloworld.xcodeproj \
            CODE_SIGN_STYLE=Automatic \
            DEVELOPMENT_TEAM="2KP9M7XQZN" \
            -scheme helloworld \
            -sdk iphoneos \
            -configuration Debug \
            -allowProvisioningUpdates \
            -authenticationKeyID ${{ secrets.ASC_KEY_ID }} \
            -authenticationKeyPath '/path/to/AuthKey.p8' \
            -authenticationKeyIssuerID ${{ secrets.ASC_ISSUER_ID }} \
            -derivedDataPath build \
            build
          # Additional steps: archive, export, etc.
```

## Advanced: Separate Setup Steps

For more control, you can set up the API key, certificate, and provisioning
profile separately:

```yml
name: build with manual signing (separate steps)

on:
  push:
  pull_request:
    branches:
      - main

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      # Set up App Store Connect API key
      - uses: nodeselector/setup-apple-codesign@v0.0.2
        with:
          asset-type: "app-store-connect-api-key"
          app-store-connect-api-key-key-id: ${{ secrets.ASC_KEY_ID }}
          app-store-connect-api-key-issuer-id: ${{ secrets.ASC_ISSUER_ID }}
          app-store-connect-api-key-base64-private-key: ${{ secrets.ASC_KEY }}
      # Set up development certificate
      - uses: nodeselector/setup-apple-codesign@v0.0.2
        with:
          asset-type: "certificate"
          secret-value: ${{ secrets.CERTIFICATE_PEM_OR_P12 }}
          certificate-password: ${{ secrets.CERT_PASSWORD }}
      # Optional: Install provisioning profile to host machine
      # Required for manual signing without -allowProvisioningUpdates
      - uses: nodeselector/setup-apple-codesign@v0.0.2
        with:
          asset-type: "provisioning-profile"
          secret-value: ${{ secrets.PROVISIONING_PROFILE_BASE64 }}
      - name: Build with xcodebuild
        run: |
          # Option 1: Use locally installed provisioning profile
          # Profile must be installed via the provisioning-profile asset-type
          # The -allowProvisioningUpdates flag is unnecessary (and is a no-op)
          xcodebuild -project helloworld.xcodeproj \
            CODE_SIGN_STYLE=Manual \
            CODE_SIGN_IDENTITY="Apple Development" \
            PROVISIONING_PROFILE_SPECIFIER="my-ios-profile" \
            -scheme helloworld \
            -sdk iphoneos \
            -configuration Debug \
            -derivedDataPath build \
            build
          
          # Option 2: Fetch provisioning profile remotely via App Store Connect
          # Uses -allowProvisioningUpdates with API authentication flags
          # xcodebuild -project helloworld.xcodeproj \
          #   CODE_SIGN_STYLE=Manual \
          #   PROVISIONING_PROFILE_SPECIFIER="my-ios-profile" \
          #   DEVELOPMENT_TEAM="2KP9M7XQZN" \
          #   -scheme helloworld \
          #   -sdk iphoneos \
          #   -configuration Debug \
          #   -allowProvisioningUpdates \
          #   -authenticationKeyID ${{ secrets.ASC_KEY_ID }} \
          #   -authenticationKeyPath '/path/to/AuthKey.p8' \
          #   -authenticationKeyIssuerID ${{ secrets.ASC_ISSUER_ID }} \
          #   -derivedDataPath build \
          #   build
```

For manual signing or to specify a provisioning profile, several required and
optional flags can be passed to `xcodebuild`. See the
[Apple Code Signing Overview](apple_codesigning_overview.md) for detailed
configuration options including:

- Using `CODE_SIGN_STYLE=Manual` with `PROVISIONING_PROFILE_SPECIFIER`
- Installing provisioning profiles locally vs. fetching remotely
- Certificate and profile management considerations
