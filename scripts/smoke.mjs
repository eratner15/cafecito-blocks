#!/usr/bin/env node
// Smoke test every block subdomain. Exit non-zero if any returns < 200 or >= 400.
const SUBDOMAINS = [
  'voice', 'intake', 'estimate', 'reviews', 'scan', 'docs',
  'reactivate', 'outreach', 'ops', 'brand', 'orders', 'recovery',
  'bilingual', 'status', 'qa', 'form',
];

let failures = 0;
for (const sub of SUBDOMAINS) {
  const url = `https://${sub}.cafecito-ai.com/`;
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const ok = res.status >= 200 && res.status < 400;
    console.log(`${ok ? '✓' : '✗'} ${res.status}  ${url}`);
    if (!ok) failures++;
  } catch (e) {
    console.log(`✗ ERR   ${url}  ${e.message}`);
    failures++;
  }
}
process.exit(failures === 0 ? 0 : 1);
