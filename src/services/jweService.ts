import * as jose from "jose";

import { LinkConstants } from "../constants";
import { IUserToken } from "../types";
import { createSecret, getSecret } from "../util/secretKey";

export const createToken = async (
  item: Record<string, unknown>,
): Promise<string> => {
  try {
    let _publicKey = await getSecret(LinkConstants.PUBLIC_KEY);

    if (!_publicKey) {
      const { publicKey, privateKey } = await jose.generateKeyPair(
        LinkConstants.ALG,
      );

      const pkcs8 = await jose.exportPKCS8(privateKey);
      const spki = await jose.exportSPKI(publicKey);

      await createSecret(LinkConstants.PRIVATE_KEY, pkcs8);
      await createSecret(LinkConstants.PUBLIC_KEY, spki);
    }

    _publicKey = await getSecret(LinkConstants.PUBLIC_KEY);

    const publicKey = await jose.importSPKI(
      _publicKey as string,
      LinkConstants.ALG,
    );

    return await new jose.CompactEncrypt(
      new TextEncoder().encode(JSON.stringify(item)),
    )
      .setProtectedHeader({ alg: LinkConstants.ALG, enc: LinkConstants.ENC })
      .encrypt(publicKey);
  } catch (err) {
    throw err;
  }
};

export const decryptToken = async (token: string): Promise<IUserToken> => {
  try {
    const _privateKey = await getSecret(LinkConstants.PRIVATE_KEY);
    const privateKey = await jose.importPKCS8(
      _privateKey as string,
      LinkConstants.ALG,
    );

    const decrypt = await jose.compactDecrypt(token, privateKey);
    const decryptedText = new TextDecoder().decode(decrypt.plaintext);

    return JSON.parse(decryptedText) as IUserToken;
  } catch (err) {
    throw err;
  }
};
