# Studio KEEP private inquiry inbox

The website remains on GitHub Pages. The Cloudflare Worker accepts contact submissions and stores them privately in D1.

## One-time Cloudflare setup
1. Install Wrangler and sign in: `npx wrangler login`.
2. Create the database: `npx wrangler d1 create studio-keep-inquiries`. Copy the database ID into `wrangler.toml`.
3. Apply the schema: `npx wrangler d1 execute studio-keep-inquiries --remote --file=schema.sql`.
4. Deploy from this folder: `npx wrangler deploy`.
5. In Cloudflare Zero Trust → Access → Applications, configure a **self-hosted Access application** for the deployed Worker hostname, protecting `/admin/*` and `/api/inquiries*`. Allow only named Studio KEEP administrator email accounts. **Never protect /api/submit**, which needs to be public.
6. IMPORTANT: On workers.dev, Cloudflare Access path-based application matching may depend on your plan and hostname. Confirm that unauthenticated GET /api/inquiries and /admin/ are denied by Access before accepting real inquiries. Prefer a custom domain if path rules are unavailable.
7. Edit `site/inquiry-config.js` to set `window.KEEP_INQUIRY_ENDPOINT = "https://YOUR-WORKER-HOST/api/submit";`, then deploy the GitHub Pages site.
8. Add a bookmark to `https://YOUR-WORKER-HOST/admin/` for administrators. This is separate from Decap CMS but accessible from its admin page once configured.

## Privacy and operations
- Never commit submissions or administrator tokens to GitHub.
- The browser collects name, email, VRChat ID, message and consent; these are stored in Cloudflare D1. Only use this data for responding to inquiries.
- Define a privacy notice and retention period, and implement deletion/export procedures before production use.
- Public POST is subject to spam. Add Cloudflare Turnstile or rate limiting before public launch; the included honeypot and Origin check are **not** sufficient anti-abuse protection.
- Use Cloudflare Access for admin paths; the identity header check in Worker is defense-in-depth only and is not a replacement for Access.
- Cloudflare Access and D1 have separate free-tier limits; check current Cloudflare terms and pricing.
