# EXECUTIA Adapters

Capability boundary between the Engine and external systems.

**Core Law:** The Engine never depends on an external system.  
External systems depend on adapters.  
Adapters contain no business decisions.

---

## Capabilities (not vendors)

| Path | Capability |
|---|---|
| `email/` | Inbound/outbound email events |
| `accounting/` | Accounting / bookkeeping platforms |
| `banking/` | Banks and payment rails |
| `calendar/` | Calendar systems |
| `documents/` | Document / evidence storage |
| `government/` | Public-sector / filing endpoints |

Vendor implementations belong under the capability, e.g.:

```
adapters/email/gmail/
adapters/email/outlook/
adapters/accounting/fiken/
adapters/accounting/tripletex/
adapters/banking/dnb/
```

No vendor integrations are invented here. Empty capability folders hold only ownership READMEs until real adapters exist.

---

## Adapter duties only

- receive events  
- normalize data  
- deliver data  
- synchronize results  

Every decision belongs to the Engine.
