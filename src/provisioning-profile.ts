import fs from 'node:fs'
// import uuid
import { v4 as uuid } from 'uuid'

export async function provisioningProfile(secretValue: string): Promise<void> {
  const decodedSecret = Buffer.from(secretValue, 'base64').toString('utf-8')
  // todo: read provisioning profile and extract UUID: security cms -D -i /path/to/profile.mobileprovision
  const provisioningProfilePath = `${process.env.HOME}/Library/MobileDevice/Provisioning Profiles/${uuid()}.mobileprovision`
  fs.writeFileSync(provisioningProfilePath, decodedSecret)
}
