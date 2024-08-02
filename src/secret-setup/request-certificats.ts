import AppStoreConnectAPI from "appstore-connect-sdk";
import { CertificatesApi } from "appstore-connect-sdk/dist/openapi/apis/CertificatesApi";
import { CertificateType } from "appstore-connect-sdk/dist/openapi/models/CertificateType";
import { pki, asn1 } from "node-forge";
import fs from "fs";

type AppleSigningCertificate = {
  certificateId: string;
  pemCertificate: string;
}

export async function requestCertificates(
  keyId: string,
  issuerId: string,
  privateKey: string,
): Promise<AppleSigningCertificate> {

  var keys = pki.rsa.generateKeyPair(2048);
  var csr = pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([{
    name: 'commonName',
    value: 'Apple Code Signing CSR'
  }]);
  csr.sign(keys.privateKey);
  csr.verify();
  var pemCsr = pki.certificationRequestToPem(csr);

  const client = new AppStoreConnectAPI({
    privateKey: privateKey,
    privateKeyId: keyId,
    issuerId: issuerId,
  });

  const certs = await client.create(CertificatesApi)

  const resp = await certs.certificatesCreateInstance({
    certificateCreateRequest: {
      data: {
        type: "certificates",
        attributes: {
          csrContent: pemCsr,
          certificateType: CertificateType.Development,
        },
      }
    }
  })

  if (resp.data.attributes === undefined) {
    throw new Error(`Failed to create certificate: ${resp}`)
  }

  const certificateId = resp.data.id
  const certificateContent = resp.data.attributes!.certificateContent

  const certBuffer = Buffer.from(certificateContent as string, 'base64')
  const cert = pki.certificateFromAsn1(asn1.fromDer(certBuffer.toString('binary')))
  // need to pem encode the certificate and the private key
  const pemCert = pki.certificateToPem(cert)
  const pemPrivateKey = pki.privateKeyToPem(keys.privateKey)

  // concatenate the certificate and private key
  const pem = pemCert + pemPrivateKey

  return {
    certificateId,
    pemCertificate: pem,
  }
}

const keyId = process.argv[2]
const issuerId = process.argv[3]
const privateKeyPath = process.argv[4]

const privateKey = fs.readFileSync(privateKeyPath, 'utf8')

  ; (async () => {
    const cert = await requestCertificates(keyId, issuerId, privateKey)
    console.log(`Certificate ID: ${cert.certificateId}`)
    fs.writeFileSync(`${cert.certificateId}.pem`, cert.pemCertificate)
  })()
