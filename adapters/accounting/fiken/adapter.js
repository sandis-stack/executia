/**
 * Accounting adapter · Fiken v0.1
 *
 * Translates Engine AccountingIntent and synchronizes to Fiken.
 * Contains NO classification, VAT, or business/personal decision logic.
 */

import { loadFikenConfig, credentialsPresent, probeFikenAuth } from './auth.js';
import { createFikenClient, FikenHttpError } from './client.js';
import {
  translateIntentToFikenPurchase,
  translateIntentToFikenContact,
} from './translate.js';
import {
  findFikenMapping,
  rememberFikenMapping,
  intentFingerprint,
} from './idempotency.js';
import { resolveEvidencePayload } from './evidence.js';

export const adapterInfo = {
  capability: 'accounting',
  vendor: 'fiken',
  mode: 'live',
  detail: 'Fiken API v2 — authenticates via FIKEN_API_TOKEN + FIKEN_COMPANY_SLUG',
};

export { loadFikenConfig, credentialsPresent, probeFikenAuth };
export { clearFikenIdempotency, findFikenMapping } from './idempotency.js';

function resultBase(partial) {
  return {
    vendor: 'fiken',
    at: new Date().toISOString(),
    ...partial,
  };
}

/**
 * Accept AccountingIntent (preferred) or legacy accounting consequence.
 */
function coerceIntent(input) {
  if (!input) return null;
  if (input.executionObjectId) return input;
  // Legacy Engine consequence shape → minimal intent for translation
  return {
    executionObjectId: input.executionObjectId || input.id || `legacy_${Date.now().toString(36)}`,
    counterparty: input.supplier || '',
    documentDate: null,
    dueDate: input.dueDate || null,
    grossAmount: input.gross,
    netAmount: input.net,
    vatAmount: input.vatAmount,
    vatTreatment: {
      rate: input.vatRate,
      amount: input.vatAmount,
      context: input.context,
    },
    classification: {
      context: input.context,
      expenseCategory: null,
      executionContext: input.executionContext || null,
      lines: input.lines || [],
    },
    evidenceReference: {
      evidenceId: input.evidenceId || null,
      documentName: null,
      mimeType: null,
      contentHash: null,
    },
    paymentTruth: null,
    currency: input.currency || 'NOK',
    intent: input.intent || 'record_supplier_invoice',
  };
}

async function ensureSupplier(client, intent) {
  const name = String(intent.counterparty || '').trim();
  if (!name) {
    const err = new Error('FIKEN_SUPPLIER_NAME_REQUIRED');
    err.code = 'requires_attention';
    throw err;
  }

  const listed = await client.listContacts({ name, supplier: true });
  const contacts = Array.isArray(listed.data)
    ? listed.data
    : listed.data?.contacts || listed.data?._embedded?.contacts || [];
  const exact = contacts.find(
    (c) => String(c.name || '').trim().toLowerCase() === name.toLowerCase(),
  );
  if (exact?.contactId != null) return exact.contactId;

  const created = await client.createContact(translateIntentToFikenContact(intent));
  const id = client.idFromLocation(created.location) || created.data?.contactId;
  if (id == null) {
    const err = new Error('FIKEN_CONTACT_CREATE_MISSING_ID');
    err.code = 'failed';
    throw err;
  }
  return id;
}

async function attachEvidence(client, purchaseId, intent, ports, mapping) {
  if (mapping?.evidenceAttached && mapping?.evidenceId === intent.evidenceReference?.evidenceId) {
    return { attached: true, skipped: true };
  }
  const payload = resolveEvidencePayload(intent, ports);
  if (!payload) return { attached: false, skipped: true, reason: 'no_evidence' };
  if (payload.missing) return { attached: false, skipped: true, reason: payload.reason };

  await client.addPurchaseAttachment(purchaseId, payload);
  return {
    attached: true,
    evidenceId: payload.evidenceId,
    filename: payload.filename,
    contentHash: payload.contentHash,
  };
}

/**
 * Synchronize AccountingIntent to Fiken.
 * @param {object} accountingIntentOrLegacy
 * @param {{ getEvidence?: Function, config?: object, fetchImpl?: Function }} ports
 */
export async function synchronizeAccounting(accountingIntentOrLegacy, ports = {}) {
  const intent = coerceIntent(accountingIntentOrLegacy);
  if (!intent?.executionObjectId) {
    return resultBase({
      status: 'failed',
      detail: 'AccountingIntent missing executionObjectId',
      externalIds: null,
    });
  }

  const config = loadFikenConfig(ports.config || {});
  if (!credentialsPresent(config)) {
    return resultBase({
      status: 'failed',
      detail:
        'Fiken credentials missing (FIKEN_API_TOKEN + FIKEN_COMPANY_SLUG). Engine truth preserved; external sync not claimed.',
      mode: 'blocked',
      metadata: {
        reason: 'credentials_missing',
        hasToken: Boolean(config.token),
        hasCompanySlug: Boolean(config.companySlug),
      },
      externalIds: findFikenMapping(intent.executionObjectId),
      translated: null,
    });
  }

  const client = createFikenClient(config, ports.fetchImpl || globalThis.fetch);
  const fingerprint = intentFingerprint(intent);
  const existing = findFikenMapping(intent.executionObjectId);
  const translatedPreview = null;

  try {
    // Idempotent path — update existing Fiken purchase when possible
    if (existing?.purchaseId) {
      if (existing.fingerprint === fingerprint && existing.status === 'synchronized') {
        return resultBase({
          status: 'synchronized',
          detail: 'Idempotent hit — existing Fiken purchase unchanged',
          mode: 'live',
          externalIds: {
            purchaseId: existing.purchaseId,
            contactId: existing.contactId,
            companySlug: config.companySlug,
          },
          metadata: { idempotent: true, fingerprint },
          evidence: {
            evidenceId: intent.evidenceReference?.evidenceId || null,
            attached: Boolean(existing.evidenceAttached),
          },
        });
      }

      let remote;
      try {
        remote = await client.getPurchase(existing.purchaseId);
      } catch (err) {
        if (err instanceof FikenHttpError && err.status === 404) {
          // Mapping stale — recreate below
        } else {
          throw err;
        }
      }

      if (remote?.data) {
        const supplierId = existing.contactId || (await ensureSupplier(client, intent));
        const body = translateIntentToFikenPurchase(intent, {
          supplierId,
          expenseAccount: config.expenseAccount,
        });
        try {
          await client.updatePurchase(existing.purchaseId, body);
          const evidence = await attachEvidence(
            client,
            existing.purchaseId,
            intent,
            ports,
            existing,
          );
          const mapping = rememberFikenMapping(intent.executionObjectId, {
            purchaseId: String(existing.purchaseId),
            contactId: String(supplierId),
            companySlug: config.companySlug,
            fingerprint,
            status: 'synchronized',
            evidenceAttached: Boolean(evidence.attached || existing.evidenceAttached),
            evidenceId: intent.evidenceReference?.evidenceId || null,
          });
          return resultBase({
            status: 'synchronized',
            detail: 'Updated existing Fiken purchase from Engine truth',
            mode: 'live',
            externalIds: {
              purchaseId: mapping.purchaseId,
              contactId: mapping.contactId,
              companySlug: config.companySlug,
            },
            metadata: { updated: true, fingerprint },
            translated: body,
            evidence: {
              evidenceId: intent.evidenceReference?.evidenceId || null,
              attached: mapping.evidenceAttached,
              detail: evidence.reason || null,
            },
          });
        } catch (err) {
          if (err instanceof FikenHttpError && (err.status === 400 || err.status === 405 || err.status === 409)) {
            return resultBase({
              status: 'requires_attention',
              detail:
                'Fiken purchase exists but can no longer be safely updated. Divergence preserved — no duplicate created.',
              mode: 'live',
              externalIds: {
                purchaseId: String(existing.purchaseId),
                contactId: existing.contactId || null,
                companySlug: config.companySlug,
              },
              metadata: {
                reason: 'external_record_immutable',
                httpStatus: err.status,
                body: err.body,
                fingerprint,
              },
            });
          }
          throw err;
        }
      }
    }

    const supplierId = await ensureSupplier(client, intent);
    const body = translateIntentToFikenPurchase(intent, {
      supplierId,
      expenseAccount: config.expenseAccount,
    });
    const created = await client.createPurchase(body);
    const purchaseId =
      client.idFromLocation(created.location) ||
      created.data?.purchaseId ||
      created.data?.id;
    if (purchaseId == null) {
      return resultBase({
        status: 'failed',
        detail: 'Fiken created purchase but returned no purchase id',
        mode: 'live',
        metadata: { location: created.location || null },
        translated: body,
      });
    }

    const evidence = await attachEvidence(client, purchaseId, intent, ports, existing);
    const mapping = rememberFikenMapping(intent.executionObjectId, {
      purchaseId: String(purchaseId),
      contactId: String(supplierId),
      companySlug: config.companySlug,
      fingerprint,
      status: 'synchronized',
      evidenceAttached: Boolean(evidence.attached),
      evidenceId: intent.evidenceReference?.evidenceId || null,
    });

    return resultBase({
      status: 'synchronized',
      detail: 'Synchronized AccountingIntent to Fiken purchase',
      mode: 'live',
      externalIds: {
        purchaseId: mapping.purchaseId,
        contactId: mapping.contactId,
        companySlug: config.companySlug,
      },
      metadata: { created: true, fingerprint },
      translated: body,
      evidence: {
        evidenceId: intent.evidenceReference?.evidenceId || null,
        attached: mapping.evidenceAttached,
        detail: evidence.reason || null,
      },
    });
  } catch (err) {
    const httpStatus = err instanceof FikenHttpError ? err.status : null;
    const status =
      err.code === 'requires_attention' || httpStatus === 409
        ? 'requires_attention'
        : 'failed';
    return resultBase({
      status,
      detail: `Fiken synchronization failed: ${String(err?.message || err)}. Engine truth preserved.`,
      mode: 'live',
      metadata: {
        reason: 'provider_error',
        httpStatus,
        body: err instanceof FikenHttpError ? err.body : null,
        fingerprint,
      },
      externalIds: existing
        ? {
            purchaseId: existing.purchaseId,
            contactId: existing.contactId,
            companySlug: config.companySlug,
          }
        : null,
      translated: translatedPreview,
    });
  }
}

/** Alias used by some call sites */
export async function synchronize(intent, ports) {
  return synchronizeAccounting(intent, ports);
}
