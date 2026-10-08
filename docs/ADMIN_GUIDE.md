# Admin panel guide

Open `https://www.transyachtgroup.com/admin`. Log in with the admin password (and the authenticator code if TOTP is enabled). Only **one session is active at a time**: logging in on another device signs the previous one out.

## Dashboard sections

| Section | Use it for |
|---|---|
| **Fleet** (vehicles / yachts) | Add and edit listings: name, short description, full description, photos, specifications, prices, translations. Hide a listing with *visible = off*. Deleted items go to **Fleet Trash & Log** and can be restored |
| **Car Bookings / Yacht Bookings** | Bookings with dates, client, agent, expenses, odometer, photos |
| **CRM** | Customers and their history |
| **Agents** | Partner agents who supply vehicles (ownership: ours / agent) |
| **Proposals** | Commercial proposals and business letters, PDF export, email sending |
| **Contracts** | Rental contracts and numbering |
| **Customer Reviews** | Collected reviews and review-request automation |
| **Site Content** | Editable site texts (about, footer, contacts) |
| **Requests** | Enquiries from the website form |
| **Analytics** | First-party visits, sources, locations |

Separate pages: **Partners CRM** (`/admin/partners`), **Guides** (`/admin/guides`), **News** (`/admin/news`), **Answers** (`/admin/answers`).

## Listing a vehicle well
1. Use a plain name (brand + model + variant). The name becomes part of the URL; renaming later changes the URL.
2. Write a **full description** (150+ words): who it suits, what is special, conditions. Without a full description the page is thin for search engines.
3. Fill the specification fields; they appear on the page and in structured data.
4. Add several good photos; the first one is the cover.
5. Yachts without a written description show a factual summary generated from their specifications until a real description is added.

## Content tools (Guides, News, Answers)
Each has the same flow:
1. **Generate** a draft from a topic and keyword (AI).
2. **Audit**: a deterministic checklist with a score out of 100 (length, keyword use, headings, links, meta tags, FAQ, direct answer, unverifiable claims).
3. **Fix SEO**: AI corrects only what the audit flagged; repeat until the score is high and no errors remain.
4. **Read it yourself.** Check facts, prices and promises. The system must not publish claims the company cannot keep (guaranteed availability, amenities, awards).
5. **Publish.** The site rebuilds automatically a few minutes later.

Rules of thumb: never invent prices; availability and the final quote are always "confirmed individually"; link only to real pages (the tools enforce this).

## Partners CRM
- Import contacts from Excel/CSV, filter recipients, write a letter (AI can draft in the chosen language), send, and track replies and follow-ups.
- Replies arrive in the contact's history through the Resend inbound address (`PARTNER_REPLY_TO`).
- Every email carries an opt-out line; a clear unsubscribe reply blocks the contact automatically.
- A daily digest email lists due follow-ups and unread replies.

## Security habits
- Keep the password and TOTP secret in a password manager; never share them in chat.
- If a session behaves unexpectedly (suddenly logged out), someone logged in elsewhere; change the password if it was not you.
