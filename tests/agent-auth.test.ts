import test from "node:test";
import assert from "node:assert/strict";
import {verifyFirebaseIdentity} from '../worker/personal-auth.ts';
import {
  issueAgentToken,
  authenticateAgent,
  AgentError,
} from "../worker/agent-auth.ts";
const now = 1800000000000;
test('verified Firebase identities reject signed anonymous sign-in claims', async()=>{
 const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey),encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url'),clock=Math.floor(Date.now()/1000);
 const body=encode({alg:'RS256',kid:'test'})+'.'+encode({sub:'owner',aud:'demo',iss:'https://securetoken.google.com/demo',exp:clock+3600,iat:clock,auth_time:clock,firebase:{sign_in_provider:'anonymous'}});
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(body));
 await assert.rejects(verifyFirebaseIdentity(body+'.'+Buffer.from(signature).toString('base64url'),'demo',async()=>Response.json({keys:[{...jwk,kid:'test'}]})));
});
test("agent credentials have separate namespace and only hashed secrets persist", async () => {
  const issued = await issueAgentToken(
    "owner",
    "Hermes",
    ["study:read"],
    30,
    now,
  );
  assert.match(
    issued.token,
    /^sanctra_agent_[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/,
  );
  assert.ok(
    !JSON.stringify(issued.record).includes(issued.token.split(".")[1]),
  );
});
test("auth rejects personal, forged, revoked, expired and disabled or removed admins before target access", async () => {
  const issued = await issueAgentToken(
    "owner",
    "Hermes",
    ["study:read"],
    30,
    now,
  );
  for (const scenario of [
    "personal",
    "forged",
    "revoked",
    "expired",
    "disabled",
    "removed",
    "scope",
  ]) {
    const seen: string[] = [];
    const read = async (path: string) => {
      seen.push(path);
      return {
        version: "v1",
        data: path.startsWith("admins/")
          ? scenario === "removed"
            ? null
            : scenario === "disabled"
              ? { enabled: false }
              : {}
          : {
              ...issued.record,
              ...(scenario === "revoked"
                ? { revokedAt: new Date(now).toISOString() }
                : {}),
              ...(scenario === "expired"
                ? { expiresAt: new Date(now - 1).toISOString() }
                : {}),
            },
      };
    };
    const token =
      scenario === "personal"
        ? "sanctra_personal_" + "a".repeat(43)
        : scenario === "forged"
          ? issued.token.slice(0, -10) + "b".repeat(10)
          : issued.token;
    await assert.rejects(
      () =>
        authenticateAgent(
          { read },
          token,
          scenario === "scope" ? "users:read" : "study:read",
          now,
        ),
      AgentError,
    );
    assert.ok(
      seen.every(
        (p) => p.startsWith("agent_grants/") || p.startsWith("admins/"),
      ),
    );
  }
});
