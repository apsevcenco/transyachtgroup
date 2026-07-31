# Security deployment checklist

These steps are required in production; code deployment alone is not sufficient.

## Required secrets

- `ADMIN_PASSWORD`: unique high-entropy password stored only in the host secret manager.
- `ADMIN_TOTP_SECRET`: Base32 TOTP secret. When present, every admin login requires a six-digit authenticator code. Store it only in the host secret manager and in the owner's authenticator recovery procedure.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key used for private booking-photo uploads and signed reads. Never expose it through a `VITE_` variable.
- `SUPABASE_URL`: project URL for the server-side storage client.
- `PDF_IMAGE_HOSTS`: comma-separated allowlist of image hostnames used by PDF exports. Configure the Supabase project storage hostname and any explicitly trusted image CDN.

Generate `ADMIN_TOTP_SECRET` with a cryptographically secure Base32 generator, add it manually to an authenticator application using issuer `TransYachtGroup`, then verify login before closing the existing admin session. Keep recovery material offline.

## Database and Supabase

1. Apply migrations `0012` through `0016` before deploying the new API.
2. Confirm `booking_private` exists, is marked private, and has no `anon` or `authenticated` policies in `storage.objects`.
3. Confirm `vehicle_images` permits only the catalog/content workflow intended by the business. It must not contain `booking-photos/` objects after migration.
4. Move any existing booking photos from `vehicle_images/booking-photos/` into `booking_private`, replace database URLs with object paths, and delete the public originals.
5. Restrict the application database role to DML only. Schema migrations must use a separate migration role.

## Verification

- A request to `/api/vehicles?all=true` must return only visible vehicles.
- `/api/admin/vehicles` without an admin token must return 401.
- A booking photo URL must expire and the underlying bucket must reject public reads.
- Admin login must reject an absent or incorrect TOTP code when `ADMIN_TOTP_SECRET` is configured.
- Repeated contact-form and analytics requests must receive 429 responses.
- iCal/PDF remote fetches must reject localhost, private, link-local and non-HTTPS targets.
