# EverRoot V2

A premium single-page investor landing page for the EverRoot agroforestry project.

## Files
- `index.html` — page structure and content
- `styles.css` — responsive visual design
- `script.js` — language switching + demo form behavior

## Important before publishing
1. Replace the placeholder Telegram handle and phone number in `index.html`.
2. Add the real investment presentation as `investment-presentation.pdf` and change the form flow/button to the desired delivery method.
3. Connect the request form to an email service (e.g. Resend, Formspree, Netlify Forms, or a small backend). The current form is intentionally front-end only.
4. Replace or license the remote Unsplash images before commercial launch if needed.
5. Review all financial/agronomic claims against the final business plan and legal structure before publication.

## Languages
The UI contains EN/PL/UA/RU selectors. The V2 scaffold currently uses English copy as a temporary fallback for all four languages; translate the `translations` object in `script.js` before launch.

## Deploy
This is a static site and can be hosted on GitHub Pages, Netlify, Vercel or any standard web host.
