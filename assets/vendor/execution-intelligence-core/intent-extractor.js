/**
 * Intent extraction — structural parsing with cited spans only.
 * Conclusions are limited to text and facts present in the mission statement.
 */

const CONSTRAINT_MARKERS = [
  'governed',
  'governance',
  'compliance',
  'regulated',
  'audit',
  'evidence',
  'authority',
  'visibility',
  'before action',
  'cross-border',
  'cross border',
];

const STAKEHOLDER_ROLES = [
  'executive sponsor',
  'sponsor',
  'board',
  'ceo',
  'cfo',
  'coo',
  'program director',
  'project manager',
  'compliance lead',
  'legal',
  'regulator',
];

const DEPENDENCY_MARKERS = [
  { marker: 'depends on', type: 'depends_on' },
  { marker: 'requires', type: 'requires' },
  { marker: 'after', type: 'after' },
  { marker: 'before', type: 'before' },
];

/**
 * @param {string} missionText
 */
export function extractIntent(missionText) {
  const text = String(missionText ?? '').trim();
  const lower = text.toLowerCase();

  return {
    statement: text,
    headline: firstSentence(text),
    objectives: extractObjectives(text),
    constraints: extractConstraints(text, lower),
    stakeholders: extractStakeholders(text, lower),
    dependencies: extractDependencies(text, lower),
    geography: extractGeography(text),
  };
}

function firstSentence(text) {
  const match = text.match(/^[^.!?]+[.!?]?/);
  return (match ? match[0] : text).trim();
}

function extractObjectives(text) {
  const objectives = [
    {
      id: 'obj-primary',
      text,
      source: 'mission_statement',
      span: [0, text.length],
    },
  ];

  const subclauses = text
    .split(/[;]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8 && part !== text);

  subclauses.forEach((clause, index) => {
    const start = text.indexOf(clause);
    if (start >= 0) {
      objectives.push({
        id: `obj-sub-${index + 1}`,
        text: clause,
        source: 'mission_clause',
        span: [start, start + clause.length],
      });
    }
  });

  return objectives;
}

function extractConstraints(text, lower) {
  const constraints = [];
  CONSTRAINT_MARKERS.forEach((marker) => {
    const index = lower.indexOf(marker);
    if (index < 0) return;
    const start = Math.max(0, index - 24);
    const end = Math.min(text.length, index + marker.length + 48);
    constraints.push({
      id: `constraint-${constraints.length + 1}`,
      marker,
      text: text.slice(start, end).trim(),
      span: [index, index + marker.length],
      source: 'mission_text',
    });
  });
  return constraints;
}

function extractStakeholders(text, lower) {
  const stakeholders = [];
  STAKEHOLDER_ROLES.forEach((role) => {
    const index = lower.indexOf(role);
    if (index < 0) return;
    stakeholders.push({
      id: `stakeholder-${stakeholders.length + 1}`,
      role,
      text: text.slice(index, index + role.length),
      span: [index, index + role.length],
      source: 'mission_text',
    });
  });
  return stakeholders;
}

function extractDependencies(text, lower) {
  const dependencies = [];
  const sentences = text.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);

  sentences.forEach((sentence, sentenceIndex) => {
    const sentenceLower = sentence.toLowerCase();
    DEPENDENCY_MARKERS.forEach(({ marker, type }) => {
      const index = sentenceLower.indexOf(marker);
      if (index < 0) return;
      const remainder = sentence.slice(index + marker.length).trim();
      const target = remainder.split(/[,;]/)[0]?.trim();
      if (!target || target.length < 3) return;
      dependencies.push({
        id: `dependency-${dependencies.length + 1}`,
        type,
        marker,
        target,
        text: sentence,
        span: [text.indexOf(sentence), text.indexOf(sentence) + sentence.length],
        sentenceIndex,
        source: 'mission_text',
      });
    });
  });

  return dependencies;
}

function extractGeography(text) {
  const geography = [];
  const patterns = [
    /\binto\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/g,
    /\bin\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/g,
    /\bto\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const place = match[1].trim();
      if (['We', 'Our', 'The', 'This', 'That'].includes(place)) continue;
      geography.push({
        id: `geo-${geography.length + 1}`,
        place,
        text: match[0].trim(),
        span: [match.index, match.index + match[0].length],
        source: 'mission_text',
      });
    }
  });

  return dedupeGeography(geography);
}

function dedupeGeography(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.place.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
