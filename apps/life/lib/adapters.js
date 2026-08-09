/**
 * LIFE binds adapters at the edge.
 * Engine never imports vendors; LIFE injects adapters into advance calls.
 */

import * as fiken from '/adapters/accounting/fiken/adapter.js';
import * as government from '/adapters/government/stub.js';
import * as email from '/adapters/email/index.js';
import * as banking from '/adapters/banking/index.js';
import * as calendar from '/adapters/calendar/stub.js';
import { getEvidence } from '/adapters/documents/local.js';

export function getRuntimeAdapters() {
  return {
    accountingAdapter: fiken,
    governmentAdapter: government,
    emailAdapter: email,
    bankingAdapter: banking,
    calendarAdapter: calendar,
    /** Evidence port for accounting attachment — Engine never imports documents */
    getEvidence,
  };
}
