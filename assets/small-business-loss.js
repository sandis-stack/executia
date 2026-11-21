/**
 * TASK-47 / BACKLOG-556 — transparent loss estimate (time + delays).
 * Same two formulas for Small business and Organization modes.
 * Weeks/year = 46. Working day = 7.5 hours.
 */

export const SMALL_BUSINESS_WEEKS = 46;
export const HOURS_PER_WORKING_DAY = 7.5;

/**
 * Round a money figure to 2 significant figures for public display.
 * Exact unrounded values stay in formulas / exact fields.
 * @param {number} n
 */
export function roundTo2SigFigs(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x === 0) return 0;
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const exp = Math.floor(Math.log10(abs));
  const factor = 10 ** (exp - 1);
  return sign * Math.round(abs / factor) * factor;
}

export const HEADCOUNT_BANDS = [
  {
    id: '1-9',
    label: '1–9',
    mode: 'small',
    peopleDefault: 5,
    hoursDefault: 4,
    stuckDefault: 1,
  },
  {
    id: '10-49',
    label: '10–49',
    mode: 'small',
    peopleDefault: 20,
    hoursDefault: 4,
    stuckDefault: 3,
  },
  {
    id: '50-249',
    label: '50–249',
    mode: 'org',
    peopleDefault: 100,
    hoursDefault: 3,
    stuckDefault: 10,
  },
  {
    id: '250+',
    label: '250+',
    mode: 'org',
    peopleDefault: 500,
    hoursDefault: 3,
    stuckDefault: 30,
  },
];

/**
 * @param {{
 *   people: number,
 *   hourlyCost: number,
 *   hoursPerWeek: number,
 *   stuckPerMonth?: number | null,
 *   delayWeekCost?: number | null,
 * }} input
 */
export function calculateSmallBusinessLoss(input) {
  const people = Math.max(0, Number(input.people) || 0);
  const hourlyCost = Math.max(0, Number(input.hourlyCost) || 0);
  const hoursPerWeek = Math.min(15, Math.max(0, Number(input.hoursPerWeek) || 0));
  const stuckRaw = input.stuckPerMonth;
  const delayRaw = input.delayWeekCost;
  const stuckProvided =
    stuckRaw !== null && stuckRaw !== undefined && stuckRaw !== '' && Number.isFinite(Number(stuckRaw));
  const delayProvided =
    delayRaw !== null && delayRaw !== undefined && delayRaw !== '' && Number.isFinite(Number(delayRaw));
  /** PO 15:27 — delays money only when both delay inputs are present. */
  const delaysKnown = stuckProvided && delayProvided;
  const stuckPerMonth = delaysKnown ? Math.max(0, Number(stuckRaw) || 0) : 0;
  const delayWeekCost = delaysKnown ? Math.max(0, Number(delayRaw) || 0) : 0;

  const duplicateWorkExact = people * hoursPerWeek * hourlyCost * SMALL_BUSINESS_WEEKS;
  const delaysExact = delaysKnown ? stuckPerMonth * 12 * delayWeekCost : 0;
  const annualLossExact = duplicateWorkExact + delaysExact;
  const hoursPerYear = people * hoursPerWeek * SMALL_BUSINESS_WEEKS;
  const workingDays = hoursPerYear / HOURS_PER_WORKING_DAY;
  const total = annualLossExact || 0;

  const duplicateWork = Math.round(duplicateWorkExact);
  const delays = Math.round(delaysExact);
  const annualLoss = Math.round(annualLossExact);
  // BACKLOG-560 V2 — whole-number % on the bars; exact share only in formulas.
  const duplicateWorkPctExact = total > 0 ? (duplicateWorkExact / total) * 100 : 0;
  const delaysPctExact = delaysKnown && total > 0 ? (delaysExact / total) * 100 : 0;

  return {
    inputs: {
      people,
      hourlyCost,
      hoursPerWeek,
      stuckPerMonth: delaysKnown ? stuckPerMonth : null,
      delayWeekCost: delaysKnown ? delayWeekCost : null,
    },
    delaysKnown,
    /** Exact (unrounded) — for "How we calculated this" only. */
    exact: {
      duplicateWork: duplicateWorkExact,
      delays: delaysExact,
      annualLoss: annualLossExact,
    },
    duplicateWork,
    delays,
    annualLoss,
    /** Display money (2 significant figures). */
    display: {
      duplicateWork: roundTo2SigFigs(duplicateWork),
      delays: delaysKnown ? roundTo2SigFigs(delays) : null,
      annualLoss: roundTo2SigFigs(annualLoss),
    },
    hoursPerYear: Math.round(hoursPerYear),
    workingDays: Math.round(workingDays * 10) / 10,
    breakdown: {
      duplicateWorkPct: total > 0 ? Math.round(duplicateWorkPctExact) : 0,
      delaysPct: delaysKnown && total > 0 ? Math.round(delaysPctExact) : 0,
      duplicateWorkPctExact,
      delaysPctExact,
    },
    formulas: {
      duplicateWork: `${people} × ${hoursPerWeek} h/week × ${hourlyCost} × ${SMALL_BUSINESS_WEEKS} weeks = ${duplicateWork}`,
      delays: delaysKnown
        ? `${stuckPerMonth} stuck/month × 12 × ${delayWeekCost} = ${delays}`
        : 'Not known yet — enter both delay fields to include delays',
      shares: delaysKnown
        ? `Share of total (exact): duplicate ${duplicateWorkPctExact.toFixed(1)}% / delays ${delaysPctExact.toFixed(1)}% (bars show whole %)`
        : `Share of total (exact): duplicate ${duplicateWorkPctExact.toFixed(1)}% (delays not included yet)`,
    },
  };
}

export function bandForId(id) {
  return HEADCOUNT_BANDS.find((b) => b.id === id) ?? HEADCOUNT_BANDS[0];
}
