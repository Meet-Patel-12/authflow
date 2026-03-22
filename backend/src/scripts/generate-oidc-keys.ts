/**
 * generate-oidc-keys.ts
 *
 * Generates an RSA-2048 key pair for OIDC id_token signing and prints
 * the values ready to paste into your .env file.
 *
 * Run once — never regenerate unless rotating keys:
 *   npx ts-node scripts/generate-oidc-keys.ts
 *
 * Key rotation note:
 *   When you rotate keys, update OIDC_KEY_ID to a new value (e.g. "authflow-key-2").
 *   Keep the old key in jwks.json for at least 24 hours so clients with
 *   cached id_tokens can still verify them.
 */

import crypto from "crypto";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// Collapse PEM newlines to \n literals so the value fits on one .env line
const toEnvString = (pem: string) =>
  pem.replace(/\r?\n/g, "\\n").replace(/\\n$/, "");

// Derive the JWK n/e values so you can verify the key is correct
const pubKeyObj = crypto.createPublicKey(publicKey);
const jwk = pubKeyObj.export({ format: "jwk" }) as { n: string; e: string };

console.log(
  "\n# ── Paste these into your .env file ──────────────────────────\n",
);
console.log(`OIDC_PRIVATE_KEY="${toEnvString(privateKey)}"`);
console.log(`OIDC_PUBLIC_KEY="${toEnvString(publicKey)}"`);
console.log(`OIDC_KEY_ID="authflow-key-1"`);
console.log(
  "\n# ── JWK components (for reference — derived automatically) ───\n",
);
console.log(`# n: ${jwk.n.substring(0, 40)}...`);
console.log(`# e: ${jwk.e}`);
console.log(
  "\n# ─────────────────────────────────────────────────────────────\n",
);
