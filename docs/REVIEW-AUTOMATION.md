# Google review request delivery

Run migration `lib/db/migrations/0030_review_delivery_automation.sql`, then configure the API service environment.

## Email (Resend)

- `RESEND_API_KEY`
- `REVIEW_EMAIL_FROM` — a verified sender, for example `Trans Yacht Group <reviews@transyachtgroup.com>`

## WhatsApp Business Cloud API

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_REVIEW_TEMPLATE_NAME`
- `WHATSAPP_REVIEW_TEMPLATE_LANGUAGE` — optional fixed Meta language code

The approved Meta template must contain two body variables in this order:

1. client first name;
2. full Google review URL.

Automatic delivery is off by default. After the migration and provider setup, open Admin → Customer Reviews, save the Google review URL, choose channels and enable automation. A request is created and delivered once when a booking first transitions to `completed`. Provider failures do not roll back booking completion; the error and per-channel statuses remain visible for manual retry.
