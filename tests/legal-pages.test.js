import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const privacy = readFileSync(join(root, 'privacy.html'), 'utf8');
const terms = readFileSync(join(root, 'terms.html'), 'utf8');
const footer = readFileSync(join(root, 'assets/platform-brand.js'), 'utf8');
const vercel = readFileSync(join(root, 'vercel.json'), 'utf8');
const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');

const IDENTITY = {
  name: 'EXECUTIA AS',
  org: '838 230 962',
  address: 'Lerkeveien 6B',
  postcode: '4314 Sandnes',
  email: 'contact@executia.io',
};

function assertIdentity(html, label) {
  assert.match(html, new RegExp(IDENTITY.name), `${label} names EXECUTIA AS`);
  assert.match(html, new RegExp(IDENTITY.org), `${label} includes org. no.`);
  assert.match(html, new RegExp(IDENTITY.address), `${label} includes verified address`);
  assert.match(html, new RegExp(IDENTITY.postcode), `${label} includes verified postcode`);
  assert.match(html, new RegExp(IDENTITY.email), `${label} includes verified contact email`);
}

function assertNotClaimingExecutiaAisp(html, label) {
  assert.match(
    html,
    /EXECUTIA AS is not(?: itself)? a licensed Account Information Service Provider/i,
    `${label} states EXECUTIA AS is not a licensed AISP`,
  );
  assert.doesNotMatch(
    html,
    /EXECUTIA AS is a licensed AISP|EXECUTIA AS is an authorised AISP|EXECUTIA AS holds an AISP/i,
    `${label} must not claim EXECUTIA AS is a licensed AISP`,
  );
}

function assertNoPisClaim(html, label) {
  assert.match(html, /does not (?:provide|use) payment initiation/i, `${label} denies PIS`);
  assert.doesNotMatch(
    html,
    /LIFE (?:provides|offers|includes) payment initiation/i,
    `${label} must not claim LIFE PIS`,
  );
}

test('privacy policy covers LIFE AIS controller requirements', () => {
  assert.match(privacy, /<h1>Privacy Policy<\/h1>/);
  assert.match(privacy, /canonical" href="https:\/\/executia.io\/privacy"/);
  assertIdentity(privacy, 'privacy');
  assert.match(privacy, /data controller/i);
  assert.match(privacy, /EXECUTIA LIFE/);
  assert.match(privacy, /Open Banking \/ Account Information Services/);
  assert.match(privacy, /account, balance and transaction data/);
  assert.match(privacy, /obtained only after your consent/i);
  assert.match(privacy, /Purpose and lawful basis for processing/);
  assert.match(privacy, /GDPR Article 6\(1\)\(a\)/);
  assert.match(privacy, /Enable Banking/);
  assert.match(privacy, /regulated Open Banking \/ Account Information Services infrastructure provider/);
  assert.match(privacy, /Storage, retention and deletion/);
  assert.match(privacy, /Processors and sub-processors/);
  assert.match(privacy, /id="security"/);
  assert.match(privacy, /GDPR rights/);
  assert.match(privacy, /Withdrawal and revocation of bank consent/);
  assert.match(privacy, /enablebanking.com\/data-sharing-consents/);
  assert.match(privacy, /International data transfers/);
  assert.match(privacy, /Data-protection contact/);
  assertNotClaimingExecutiaAisp(privacy, 'privacy');
  assertNoPisClaim(privacy, 'privacy');
  assert.match(
    privacy,
    /EXECUTIA LIFE is a software service for business and financial execution, including processing information relating to customers, invoices, money, documents and actions/,
  );
  assert.doesNotMatch(privacy, /verified company materials|verified public inventory|numeric retention schedule|No separate data protection officer/i);
});

test('terms of service cover LIFE AIS service requirements', () => {
  assert.match(terms, /<h1>Terms of Service<\/h1>/);
  assert.match(terms, /canonical" href="https:\/\/executia.io\/terms"/);
  assertIdentity(terms, 'terms');
  assert.match(terms, /EXECUTIA LIFE/);
  assert.match(terms, /Nature and scope of LIFE/);
  assert.match(terms, /LIFE is not a bank/);
  assert.match(terms, /Open Banking consent/);
  assert.match(terms, /Enable Banking/);
  assert.match(terms, /AIS infrastructure provider/);
  assert.match(terms, /User authorisation and responsibilities/);
  assert.match(terms, /Data freshness, availability and accuracy limitations/);
  assert.match(terms, /Consent withdrawal/);
  assert.match(terms, /Service availability/);
  assert.match(terms, /Termination/);
  assert.match(terms, /Limitation of liability/);
  assert.match(terms, /Applicable Norwegian law/);
  assert.match(terms, /laws of Norway/);
  assertNotClaimingExecutiaAisp(terms, 'terms');
  assertNoPisClaim(terms, 'terms');
  assert.match(terms, /EXECUTIA AS is not a licensed Account Information Service Provider \(AISP\)/);
  assert.doesNotMatch(terms, /does not itself claim to be a licensed AISP/);
  assert.match(
    terms,
    /EXECUTIA LIFE is a software service for business and financial execution, including processing information relating to customers, invoices, money, documents and actions/,
  );
});

test('legal pages stay on the existing design and remain mobile-width readable', () => {
  for (const [label, html] of [
    ['privacy', privacy],
    ['terms', terms],
  ]) {
    assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
    assert.match(html, /assets\/legal.css/, `${label} uses legal.css`);
    assert.match(html, /assets\/app.css/, `${label} uses app.css`);
    assert.match(html, /data-platform-footer="legal"/);
  }
});

test('site footer already links Privacy and Terms; vercel routes exist', () => {
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /href="\/terms"/);
  assert.match(vercel, /"src": "\^\/privacy\$"/);
  assert.match(vercel, /"src": "\^\/terms\$"/);
});

test('sitemap lists privacy and terms production URLs', () => {
  assert.match(sitemap, /https:\/\/executia.io\/privacy/);
  assert.match(sitemap, /https:\/\/executia.io\/terms/);
});
