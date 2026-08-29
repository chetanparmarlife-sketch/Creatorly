# Creatorly Chrome Extension

1. Start the web app with `npm run dev`.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select this `extension` folder.
5. Open an Instagram profile such as `instagram.com/maya_creates/` or a YouTube handle page such as `youtube.com/@TheTechRishi`.
6. In the Creatorly dashboard, open **Settings → Chrome extension** and create a connection key.
7. Paste the key under **Connection settings** in the extension popup.
8. Open Creatorly on a supported profile to check availability, unlock, copy contacts, or request a missing contact.

The popup defaults to the public production URL, `https://my-build-week-project.vercel.app`. Expand **Dashboard address** in the popup to switch it to `http://localhost:5173` during local development or to save a future custom domain.

The connection key is revocable and scoped to Creatorly extension endpoints. Creating a new key revokes the old one. The extension points to the production Convex endpoint; local backend testing requires changing `DEFAULT_API_URL` in `popup.js` and `API_URL` in `background.js`.

The repository still contains fictional `example.test` contacts. Do not treat extension results as real creator data until a verified dataset is imported.
