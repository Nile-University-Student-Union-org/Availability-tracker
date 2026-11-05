import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { codeChallenge, createOAuthFlow, decryptRefreshToken, encryptRefreshToken, matchesMailerAccount, mailerTokenKey, verifyOAuthFlow } from "./mailer-oauth";

const key = randomBytes(32);
const sealed = encryptRefreshToken("refresh-token", key);
assert.equal(decryptRefreshToken(sealed, key), "refresh-token");
assert.notEqual(sealed, encryptRefreshToken("refresh-token", key), "fresh IV each time");
assert.throws(() => decryptRefreshToken(sealed, randomBytes(32)), "wrong key must fail");
const tampered = Buffer.from(sealed, "base64");
tampered[tampered.length - 1] ^= 1;
assert.throws(() => decryptRefreshToken(tampered.toString("base64"), key), "tampered token must fail");

process.env.MAILER_TOKEN_KEY = key.toString("base64");
assert.ok(mailerTokenKey()?.equals(key));
process.env.MAILER_TOKEN_KEY = "too-short";
assert.equal(mailerTokenKey(), null);

const flow = createOAuthFlow("secret");
assert.equal(verifyOAuthFlow(flow.cookie, flow.state, "secret"), flow.verifier);
assert.equal(verifyOAuthFlow(flow.cookie, "other-state", "secret"), null);
assert.equal(verifyOAuthFlow(flow.cookie, flow.state, "other-secret"), null, "forged signature");
assert.equal(verifyOAuthFlow(undefined, flow.state, "secret"), null);
assert.equal(verifyOAuthFlow("garbage", flow.state, "secret"), null);
const expired = Buffer.from(JSON.stringify({ state: "s", verifier: "v", expires: Date.now() - 1 })).toString("base64url");
const signed = createHmac("sha256", "secret").update(expired).digest("base64url");
assert.equal(verifyOAuthFlow(`${expired}.${signed}`, "s", "secret"), null, "expired flow");

// RFC 7636 appendix B
assert.equal(codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");

assert.ok(matchesMailerAccount({ mail: "Registrationsu@nu.edu.eg" }, "registrationsu@nu.edu.eg"));
assert.ok(matchesMailerAccount({ mail: null, userPrincipalName: "registrationsu@nu.edu.eg" }, "Registrationsu@nu.edu.eg"));
assert.ok(!matchesMailerAccount({ mail: "a.wesam2300@nu.edu.eg" }, "Registrationsu@nu.edu.eg"));

console.log("mailer-oauth checks passed");
