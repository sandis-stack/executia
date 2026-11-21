/** BACKLOG-586 — session/form strings must not enter innerHTML on /pilot. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderJourney, renderDeliverables } from '../assets/pilot-ui.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

/** Minimal DOM sufficient for pilot-ui textContent renders + XSS assertion. */
function makePilotDom() {
  function createElement(tag) {
    const node = {
      tagName: String(tag).toUpperCase(),
      className: '',
      children: [],
      attrs: {},
      _text: '',
      _htmlSet: null,
      get textContent() {
        if (this.children.length) {
          return this.children.map((c) => c.textContent ?? '').join('');
        }
        return this._text;
      },
      set textContent(v) {
        this._text = String(v ?? '');
        this._htmlSet = null;
        this.children = [];
      },
      get innerHTML() {
        if (this._htmlSet != null) return this._htmlSet;
        if (!this.children.length) {
          return this._text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        }
        return this.children.map((c) => c.outerHTML || c.textContent || '').join('');
      },
      set innerHTML(v) {
        this._htmlSet = String(v ?? '');
        // Simulate browser parsing: unescaped onerror in HTML would run.
        if (/onerror\s*=/i.test(this._htmlSet) && !/&lt;img/i.test(this._htmlSet)) {
          globalThis.__x = 1;
        }
        this._text = this._htmlSet.replace(/<[^>]+>/g, '');
        this.children = [];
      },
      get outerHTML() {
        return `<${tag}>${this.innerHTML}</${tag}>`;
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        this.children = this.children.filter((c) => c !== child);
        return child;
      },
      get firstChild() {
        return this.children[0] || null;
      },
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      querySelector(sel) {
        if (sel.startsWith('#')) {
          const id = sel.slice(1);
          if (this.attrs.id === id) return this;
          for (const c of this.children) {
            const hit = c.querySelector?.(sel);
            if (hit) return hit;
          }
        }
        return null;
      },
    };
    return node;
  }

  const journey = createElement('div');
  journey.attrs.id = 'pi-journey';
  const list = createElement('ul');
  list.attrs.id = 'pi-deliverable-list';
  const pilot = createElement('main');
  pilot.attrs.id = 'pilot';
  pilot.appendChild(journey);
  pilot.appendChild(list);
  pilot.querySelector = (sel) => {
    if (sel === '#pi-journey') return journey;
    if (sel === '#pi-deliverable-list') return list;
    return null;
  };

  globalThis.document = {
    createElement,
    getElementById: (id) => (id === 'pilot' ? pilot : null),
  };

  return { pilot, journey, list };
}

const XSS_ORG = '<img src=x onerror=window.__x=1>';

test('S2: crafted organization in session ctx renders as text on /pilot; __x undefined', () => {
  delete globalThis.__x;
  const { journey, list } = makePilotDom();

  const ctx = {
    assessment: {
      inputs: {
        organization: XSS_ORG,
        executionDomain: 'Finance',
      },
      results: {
        ok: true,
        pilotRecommendation: { value: 'Scoped pilot', readiness: 'Qualified' },
        gapAnalysis: { value: [] },
        improvementPlan: { value: [] },
      },
    },
    calculator: null,
    engine: null,
  };

  renderJourney({ querySelector: (sel) => (sel === '#pi-journey' ? journey : null) }, ctx);
  renderDeliverables(
    { querySelector: (sel) => (sel === '#pi-deliverable-list' ? list : null) },
    ctx,
  );

  const journeyText = journey.children.map((c) => c.textContent || '').join(' ');
  assert.match(journeyText, /<img src=x onerror/);
  assert.equal(globalThis.__x, undefined);

  const deliverableBodies = list.children.map((li) => {
    const p = li.children.find((c) => c.tagName === 'P');
    return p?.textContent ?? '';
  });
  assert.ok(deliverableBodies.some((b) => b.includes(XSS_ORG)));
  assert.equal(globalThis.__x, undefined);

  // No child should have been built via raw innerHTML with the payload.
  for (const child of [...journey.children, ...list.children]) {
    assert.equal(child._htmlSet, null);
  }
});

test('pilot-ui.js: no template innerHTML assignment left for journey/deliverables', () => {
  const src = read('assets/pilot-ui.js');
  assert.doesNotMatch(src, /rail\.innerHTML\s*=/);
  assert.doesNotMatch(src, /list\.innerHTML\s*=/);
  assert.match(src, /value\.textContent\s*=\s*detail/);
  assert.match(src, /body\.textContent\s*=\s*item\.body/);
});

test('audit file lists every named sink as fixed or static-only', () => {
  const audit = readFileSync(
    join(
      '/Users/sandis/EXECUTIA/00_COMMAND/BRIDGE/scratch/b586-evidence',
      'innerhtml-audit.md',
    ),
    'utf8',
  );
  for (const name of [
    'pilot-ui.js',
    'organization-assessment.js',
    'executive-journey.js',
    'living-engine-ui.js',
    'homepage-hero.js',
  ]) {
    assert.match(audit, new RegExp(name.replace('.', '\\.')));
  }
  assert.match(audit, /fixed|static-only/i);
});
