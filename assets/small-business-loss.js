/**
 * TASK-47 — small-business loss estimate (time + delays).
 * Weeks/year = 46. Working day = 7.5 hours.
 */

export const SMALL_BUSINESS_WEEKS = 46;
export const HOURS_PER_WORKING_DAY = 7.5;

export const HEADCOUNT_BANDS = [
  { id: '1-9', label: '1–9', mode: 'small', peopleDefault: 5 },
  { id: '10-49', label: '10–49', mode: 'small', peopleDefault: 20 },
  { id: '50-249', label: '50–249', mode: 'org', peopleDefault: 120 },
  { id: '250+', label: '250+', mode: 'org', peopleDefault: 500 },
];

/**
 * @param {{
 *   people: number,
 *   hourlyCost: number,
 *   hoursPerWeek: number,
 *   stuckPerMonth: number,
 *   delayWeekCost: number,
 * }} input
 */
export function calculateSmallBusinessLoss(input) {
  const people = Math.max(0, Number(input.people) || 0);
  const hourlyCost = Math.max(0, Number(input.hourlyCost) || 0);
  const hoursPerWeek = Math.min(15, Math.max(0, Number(input.hoursPerWeek) || 0));
  const stuckPerMonth = Math.max(0, Number(input.stuckPerMonth) || 0);
  const delayWeekCost = Math.max(0, Number(input.delayWeekCost) || 0);

  const duplicateWork =
    people * hoursPerWeek * hourlyCost * SMALL_BUSINESS_WEEKS;
  const delays = stuckPerMonth * 12 * delayWeekCost;
  const annualLoss = duplicateWork + delays;
  const hoursPerYear = people * hoursPerWeek * SMALL_BUSINESS_WEEKS;
  const workingDays = hoursPerYear / HOURS_PER_WORKING_DAY;
  const total = annualLoss || 0;

  return {
    inputs: {
      people,
      hourlyCost,
      hoursPerWeek,
      stuckPerMonth,
      delayWeekCost,
    },
    duplicateWork: Math.round(duplicateWork),
    delays: Math.round(delays),
    annualLoss: Math.round(annualLoss),
    hoursPerYear: Math.round(hoursPerYear),
    workingDays: Math.round(workingDays * 10) / 10,
    breakdown: {
      duplicateWorkPct: total > 0 ? Math.round((duplicateWork / total) * 1000) / 10 : 0,
      delaysPct: total > 0 ? Math.round((delays / total) * 1000) / 10 : 0,
    },
    formulas: {
      duplicateWork: `${people} × ${hoursPerWeek} h/week × ${hourlyCost} × ${SMALL_BUSINESS_WEEKS} weeks`,
      delays: `${stuckPerMonth} stuck/month × 12 × ${delayWeekCost}`,
    },
  };
}

export function bandForId(id) {
  return HEADCOUNT_BANDS.find((b) => b.id === id) ?? HEADCOUNT_BANDS[0];
}
