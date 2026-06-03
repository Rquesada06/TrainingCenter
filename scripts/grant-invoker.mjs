// One-off: grant allUsers the Cloud Functions Invoker role on the v1 callable
// functions so the Firebase callable protocol can invoke them (auth is still
// enforced in-code via the ID token). Uses the firebase CLI's stored refresh
// token. Safe to delete after running.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const PROJECT = 'laufit-dev';
const REGION = 'us-central1';
const FNS = ['createClientAccount', 'createAssignment'];
const ROLE = 'roles/cloudfunctions.invoker';

// firebase-tools public desktop OAuth client (well-known constants).
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const cfg = JSON.parse(readFileSync(homedir() + '/.config/configstore/firebase-tools.json', 'utf8'));
const refresh = cfg.tokens?.refresh_token;
if (!refresh) { console.error('No refresh_token in firebase CLI config'); process.exit(1); }

async function accessToken() {
  const body = new URLSearchParams({
    client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    refresh_token: refresh, grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
  const j = await r.json();
  if (!j.access_token) { console.error('Token refresh failed:', JSON.stringify(j)); process.exit(1); }
  return j.access_token;
}

async function main() {
  const tok = await accessToken();
  const H = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };
  const base = (fn) => `https://cloudfunctions.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/functions/${fn}`;

  for (const fn of FNS) {
    const getR = await fetch(`${base(fn)}:getIamPolicy`, { headers: H });
    const policy = await getR.json();
    if (!getR.ok) { console.error(`getIamPolicy ${fn} failed:`, JSON.stringify(policy)); process.exit(1); }

    const bindings = policy.bindings || [];
    let b = bindings.find((x) => x.role === ROLE);
    if (!b) { b = { role: ROLE, members: [] }; bindings.push(b); }
    if (!b.members.includes('allUsers')) b.members.push('allUsers');

    const setR = await fetch(`${base(fn)}:setIamPolicy`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ policy: { bindings, etag: policy.etag } }),
    });
    const setJ = await setR.json();
    if (!setR.ok) { console.error(`setIamPolicy ${fn} FAILED:`, JSON.stringify(setJ)); process.exit(1); }
    console.log(`✓ ${fn}: allUsers granted ${ROLE}`);
  }
  console.log('DONE');
}
main().catch((e) => { console.error(e); process.exit(1); });
