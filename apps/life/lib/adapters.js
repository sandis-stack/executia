/**
 * LIFE binds adapters at the edge.
 * Engine never imports vendors; LIFE injects adapters into advance calls.
 */

import * as fiken from '/adapters/accounting/fiken/adapter.js';
import * as government from '/adapters/government/stub.js';
import * as email from '/adapters/email/stub.js';
import * as banking from '/adapters/banking/stub.js';
import * as calendar from '/adapters/calendar/stub.js';

export function getRuntimeAdapters() {
  return {
    accountingAdapter: fiken,
    governmentAdapter: government,
    emailAdapter: email,
    bankingAdapter: banking,
    calendarAdapter: calendar,
  };
}
