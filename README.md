# EverRoot V2

A premium single-page investor landing page for the EverRoot agroforestry project.

## Files

- `index.html` — page structure and content
- `styles.css` — responsive visual design
- `script.js` — language switching and investment deck request flow
- `api/request-deck.mjs` — Vercel Function that sends localized email through Resend
- `everroot-api.js` — the single public location for the deployed backend URL
- `assets/decks/` — EN, PL, UA and RU investment presentations

## Languages

The website and investment deck delivery support EN, PL, UA and RU.

## Investment deck email delivery setup

### 1. Import the repository into Vercel

1. Sign in to Vercel.
2. Select **Add New → Project**.
3. Import the GitHub repository **EverRoot**.
4. Keep the default framework setting. The backend file in `api/` is detected as a Vercel Function.

### 2. Add environment variables

In the Vercel project open **Settings → Environment Variables** and add:

- `RESEND_API_KEY` — the API key created in Resend
- `RESEND_FROM_EMAIL` — for example `EverRoot <invest@yourdomain.com>`
- `EVERROOT_OWNER_EMAIL` — the address that receives lead notifications
- `EVERROOT_SITE_URL` — the GitHub Pages URL without a trailing slash
- `ALLOWED_ORIGINS` — the GitHub Pages origin, for example `https://filippovyevhen-lab.github.io`

To allow more than one origin, separate exact origins with commas. Add localhost only while testing, for example: `https://filippovyevhen-lab.github.io,http://localhost:5500`.

### 3. Verify the sending domain in Resend

1. In Resend open **Domains**.
2. Add the domain used by `RESEND_FROM_EMAIL`.
3. Add the DNS records shown by Resend at the company that manages the domain.
4. Wait until Resend marks the domain as verified.
5. Create an API key and copy it into the Vercel variable `RESEND_API_KEY`.

### 4. Deploy the backend

1. In Vercel open **Deployments**.
2. Select the latest deployment and click **Redeploy** after adding environment variables.
3. Copy the production project domain, for example `https://ever-root.vercel.app`.
4. The function endpoint is that domain plus `/api/request-deck`.

### 5. Connect GitHub Pages to the backend

Open `everroot-api.js` and replace:

```js
window.EVERROOT_DECK_API_URL =
  'https://ever-root.vercel.app/api/request-deck';
```

with the production Vercel Function URL. Commit the change to `main` and wait for GitHub Pages to finish publishing.

### 6. Test all four languages

For EN, PL, UA and RU:

1. Select the language on the site.
2. Submit the form using an email address you can access.
3. Confirm that the investor receives the matching PDF link.
4. Confirm that `EVERROOT_OWNER_EMAIL` receives a separate lead notification.
5. Open the PDF link and confirm that it loads from `assets/decks/`.

The API endpoint never returns Resend error details or environment variables to the browser.

## Deploy

The public site remains hosted on GitHub Pages. The email endpoint is deployed separately as a Vercel Function.
