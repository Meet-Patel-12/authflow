import { Request, Response } from "express";
import { buildDiscoveryDocument, buildJWKS } from "../services/oidc.service";

// ─── GET /.well-known/openid-configuration ────────────────────────────────────
//
// Standard OIDC discovery endpoint. OAuth2 client libraries fetch this once
// at startup to auto-configure all your endpoint URLs.
//
// Must be served with CORS headers open to all origins — third-party apps
// need to fetch this from browsers during their own OAuth2 setup flows.
// The data is entirely public (no secrets).

export const discoveryHandler = (_req: Request, res: Response): void => {
  res
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Cache-Control", "public, max-age=3600") // cache for 1 hour
    .status(200)
    .json(buildDiscoveryDocument());
};

// ─── GET /.well-known/jwks.json ───────────────────────────────────────────────
//
// JSON Web Key Set — the public keys used to verify id_tokens.
// Phase 1b: returns an empty keyset (HS256 has no public key to advertise).
// Phase 2: returns the RSA public key so any client can verify offline.
//
// Same CORS and caching rules as the discovery document.

export const jwksHandler = (_req: Request, res: Response): void => {
  res
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Cache-Control", "public, max-age=3600")
    .status(200)
    .json(buildJWKS());
};
