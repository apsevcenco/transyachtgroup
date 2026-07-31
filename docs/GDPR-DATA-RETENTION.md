# Personal-data retention policy

Owner: TransYachtGroup. Review at least annually and whenever the processing purpose or applicable law changes. Final periods must be confirmed by the company's French/EU legal adviser.

| Data | Purpose | Default retention | Disposal |
|---|---|---:|---|
| Unconverted contact requests | Sales follow-up | 12 months from last contact | Delete or irreversibly anonymise |
| Converted customer/order records | Contract performance and disputes | 5 years after rental completion | Delete non-statutory fields; retain only legally required records |
| Contracts and accounting evidence | Legal/accounting obligations | Up to 10 years where legally required | Secure deletion after legal hold expires |
| Passport/licence details | Identity and rental eligibility | Rental completion + 90 days unless a documented legal claim requires longer | Delete fields and all copies |
| Booking/handover photos | Vehicle condition evidence | Rental completion + 90 days, or until an active claim closes | Delete private storage objects and database references |
| Raw analytics events | Service analytics | 13 months | Delete or aggregate without persistent identifiers |
| Admin sessions | Authentication | 8 hours maximum | Automatic expiry and deletion; a new login revokes older sessions |
| Security logs | Abuse detection | 6 months | Rotate and securely delete |

## Operational rules

- Collect only data needed for a stated purpose. Passport and licence fields must not be copied into notes.
- Booking photos belong only in the private `booking_private` bucket and are accessed through short-lived signed URLs.
- Access to bookings, contracts, documents and photos is restricted to authenticated administrators and must be reviewed quarterly.
- Fulfil access, correction, portability and deletion requests after verifying identity; record the request without retaining unnecessary identity documents.
- Suspend deletion for an explicitly documented legal hold, including its owner and expiry review date.
- Backups must be encrypted, access-controlled, tested for restoration and expired on the same documented schedule where technically possible.
- A suspected disclosure of personal data must be recorded immediately and assessed against the GDPR 72-hour supervisory-authority notification requirement.
