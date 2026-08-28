# Google Ads conversion tracking

The frontend supports direct Google Ads conversion events in addition to GA4 events.

Add these environment variables to the frontend service on Render and redeploy:

```env
VITE_GOOGLE_ADS_ID=AW-XXXXXXXXX
VITE_GOOGLE_ADS_FORM_CONVERSION_LABEL=FORM_LABEL
VITE_GOOGLE_ADS_PHONE_CONVERSION_LABEL=PHONE_LABEL
VITE_GOOGLE_ADS_WHATSAPP_CONVERSION_LABEL=WHATSAPP_LABEL
```

The labels come from Google Ads conversion actions created as `Website` actions.
Open each conversion action, choose manual Google tag setup, and copy the value after the slash in:

```js
send_to: "AW-XXXXXXXXX/LABEL"
```

The code also accepts a full `AW-XXXXXXXXX/LABEL` value in any label variable.

Tracked actions:

- Contact form submit: GA4 `generate_lead` and Google Ads form conversion.
- Phone link click: GA4 `phone_click` and Google Ads phone conversion.
- WhatsApp link click: GA4 `whatsapp_click` and Google Ads WhatsApp conversion.

Visitors must accept cookies before analytics and ads events are sent.
