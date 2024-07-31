# Setup Apple Code Signing

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This action sets up a macOS runner for code signing. It's in the early stages of
development and is not yet ready for production use.

| Asset Type                                                                                                                            | Support |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Developer Certificate                                                                                                                 | ✅      |
| [App Store Connect API Key](https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api) | ✅      |
| Provisioning Profile                                                                                                                  | ❌      |

# Sample Workflow

Apple introduced
[managed signing at WWDC21](https://developer.apple.com/videos/play/wwdc2021/10204/).
By setting up the runner with an App Store Connect API Key, you can use managed
signing to sign your app. No provisioning profile is required.

> [!NOTE]
> Apple Developer Enterprise accounts do not support App Store Connect API keys.

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
      - uses: nodeselector/setup-apple-codesign@v0.0.1
        with:
          asset-type: 'app-store-connect-api-key'
          secret-value: ${{ secrets.APP_STORE_CONNECT_API_KEY }}
      - uses: nodeselector/setup-apple-codesign@v0.0.1
        with:
          asset-type: 'certificate'
          secret-value: ${{ secrets.CODE_SIGNING_CERTIFICATE }}
      - run: |
          issuer_id=$(jq -r '.issuerId' $RUNNER_TEMP/.app-store-connect-api-key.json)
          key_id=$(jq -r '.keyId' $RUNNER_TEMP/.app-store-connect-api-key.json)

          xcodebuild -scheme helloworld \
                    -project ./helloworld.xcodeproj \
                    -destination 'generic/platform=iOS' \
                    -allowProvisioningDeviceRegistration \
                    -allowProvisioningUpdates \
                    -authenticationKeyIssuerID $issuer_id \
                    -authenticationKeyID $key_id \
                    -authenticationKeyPath $RUNNER_TEMP/.app-store-connect-api-key.p8 \
                    archive
```
