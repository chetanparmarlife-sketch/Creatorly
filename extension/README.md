# Creatorly Chrome Extension

1. Start the web app with `npm run dev`.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select this `extension` folder.
5. Open an Instagram profile, YouTube `@handle` channel, LinkedIn `/in/` profile, or X/Twitter profile.
6. In the Creatorly dashboard, open **Settings → Chrome extension** and create a connection key.
7. Click the Creatorly extension icon once. Chrome opens Creatorly in its side panel and keeps it open while you browse.
8. Paste the key under **Connection settings** in the side panel.
9. Move between supported profiles. The panel updates automatically so you can check social links, availability, unlock, copy contacts, or request a missing contact.

The extension requires Chrome 114 or newer for the Side Panel API. It defaults to the public production app, `https://my-build-week-project.vercel.app`, and production API, `https://effervescent-toucan-379.convex.site`. Expand **Connection settings** in the panel to switch the dashboard to `http://localhost:5173` during local development or to save a future custom domain.

The connection key is revocable and scoped to Creatorly extension endpoints. Creating a new key revokes the old one. The extension points to the production Convex endpoint; local backend testing requires changing `DEFAULT_API_URL` in `popup.js` and `API_URL` in `background.js`.

The repository still contains fictional `example.test` contacts. Do not treat extension results as real creator data until a verified dataset is imported.
