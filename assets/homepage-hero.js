/**
 * Hero — logical path panel (Approach → Engine → Pilot).
 */

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHeroPath() {
  return [
    {
      id: 'platform',
      label: 'Approach',
      href: '#platform',
      status: 'active',
    },
    {
      id: 'engine',
      label: 'Engine',
      href: '/engine',
      status: 'next',
    },
    {
      id: 'pilot',
      label: 'Pilot',
      href: '#pilot',
      status: 'next',
    },
  ];
}

function renderJourney(root, steps) {
  root.innerHTML = '';
  root.setAttribute('aria-label', 'Path through EXECUTIA');

  const glow = el('div', 'hp-monitor-glow');
  const panel = el('div', 'hp-monitor-panel');
  root.appendChild(glow);
  root.appendChild(panel);

  panel.appendChild(el('p', 'hp-monitor-label', 'Path'));

  const meta = el('div', 'hp-monitor-meta');
  meta.innerHTML =
    '<div><p class="sub">Current step</p>' +
    '<p class="hp-monitor-state">Understand</p></div>';
  panel.appendChild(meta);

  const list = el('ul', 'hp-journey-list');
  steps.forEach((step, index) => {
    if (index > 0) {
      const arrow = el('li', 'hp-journey-arrow', '↓');
      arrow.setAttribute('aria-hidden', 'true');
      list.appendChild(arrow);
    }

    const item = el('li', `hp-journey-step hp-journey-step--${step.status}`);
    item.innerHTML =
      '<div class="hp-journey-main">' +
      `<a class="hp-journey-label" href="${step.href}">${escapeHtml(step.label)}</a>` +
      '</div>';
    list.appendChild(item);
  });
  panel.appendChild(list);
}

function mount(root) {
  renderJourney(root, buildHeroPath());
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('hp-funnel-journey');
  if (root) mount(root);
});
