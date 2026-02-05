# Apple Code Signing Overview

This document provides an overview of automated and manual code signing with
`xcodebuild`.

## Automated Signing

> [!IMPORTANT] "Automatically manage signing" in Xcode refers to how Xcode
> behaves when signed into a developer account through the GUI. When using
> `xcodebuild`, API authorization must be granted explicitly via the
> `-allowProvisioningUpdates` flag and authentication parameters
> (`-authenticationKeyID`, `-authenticationKeyPath`,
> `-authenticationKeyIssuerID`), regardless of the Xcode project's signing
> configuration.

If "Automatically manage signing" is checked in your Xcode project, use:

```bash
xcodebuild -project helloworld.xcodeproj \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="2KP9M7XQZN" \
  -scheme helloworld \
  -sdk iphoneos \
  -configuration Debug \
  -allowProvisioningUpdates \
  -authenticationKeyID XJ8K5RLMP3 \
  -authenticationKeyPath '/path/to/AuthKey_XJ8K5RLMP3.p8' \
  -authenticationKeyIssuerID 3f7b9c24-8e15-4a6d-b921-7c5e3f8a9d42 \
  build
```

You can omit the `PROVISIONING_PROFILE_SPECIFIER` when using automated signing.

**Important:** If a development certificate is _not_ installed in the keychain
when `xcodebuild` runs, a NEW certificate will be created in the Developer
Portal with the name "Created via API".

## Manual Signing

When you toggle to "Manual signing" in Xcode, the following build settings in
the Xcode project are cleared and therefore need to be passed to the
`xcodebuild` command:

- `CODE_SIGN_STYLE = Manual`
- `DEVELOPMENT_TEAM = ""`
- `PROVISIONING_PROFILE_SPECIFIER = ""`

This means that `xcodebuild` must be told where to find the provisioning
profile. You have two options:

1. Install the provisioning profile locally
1. Allow `xcodebuild` to fetch the provisioning profile via App Store Connect

**Note:** The `PROVISIONING_PROFILE_SPECIFIER` is the name of the provisioning
profile in the Apple Developer Portal, NOT a filename, and should match the name
exactly.

### Option 1: Install Provisioning Profile Locally

The code signing setup should manually fetch and persist the provisioning
profile to the correct location on the machine
(`$HOME/Library/Developer/Xcode/UserData/Provisioning\ Profiles`) prior to
invoking `xcodebuild`:

```bash
xcodebuild -project helloworld.xcodeproj \
  -scheme helloworld \
  -sdk iphoneos \
  -configuration Debug \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="Apple Development: Created via API (XJ8K5RLMP3)" \
  PROVISIONING_PROFILE_SPECIFIER="acme.app.helloworld-ios-profile" \
  build
```

When applying the provisioning profile manually in this way, note that the
`-allowProvisioningUpdates` flag is unnecessary (and is in fact a no-op).

### Option 2: Fetch Provisioning Profile via App Store Connect

In lieu of manually installing the provisioning profile, you can use the
`-allowProvisioningUpdates` flag, which _also_ requires the following flags:

- `-authenticationKeyPath`
- `-authenticationKeyID`
- `-authenticationKeyIssuerID`

These flags tell `xcodebuild` to fetch the correct provisioning profile remotely
via the App Store Connect API.

Because manual code signing has been enabled in the Xcode project settings, the
usage of `CODE_SIGN_STYLE=Manual` is not necessary, but can be included for
explicitness.

```bash
xcodebuild -project helloworld.xcodeproj \
  CODE_SIGN_STYLE=Manual \
  PROVISIONING_PROFILE_SPECIFIER="github.nsakaimbo.helloworld-ios-profile" \
  DEVELOPMENT_TEAM="2KP9M7XQZN" \
  -scheme helloworld \
  -sdk iphoneos \
  -configuration Debug \
  -allowProvisioningUpdates \
  -authenticationKeyID XJ8K5RLMP3 \
  -authenticationKeyPath '/path/to/AuthKey_XJ8K5RLMP3.p8' \
  -authenticationKeyIssuerID 3f7b9c24-8e15-4a6d-b921-7c5e3f8a9d42 \
  build
```

## Additional Notes

### PROVISIONING_PROFILE_SPECIFIER Identifier

The `PROVISIONING_PROFILE_SPECIFIER` identifier must be either:

1. The profile's filename if the profile is installed on the host machine, OR
1. The profile's name in the Apple Developer Portal, if allowing `xcodebuild` to
   fetch the provisioning profile remotely

### Certificate and Profile Management

If you delete all development certificates associated with a provisioning
profile, the provisioning profile will become invalid. Rather than removing and
recreating the profile, the Apple Developer Portal allows you to edit existing
provisioning profiles so that you can associate them with new development
certificates. Therefore, provided you associate the profile with a new (valid)
development certificate, you can reuse the existing
`PROVISIONING_PROFILE_SPECIFIER`.
