# Creatorly Chrome Extension — M1

1. Start the web app with `npm run dev`.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select this `extension` folder.
5. Open an Instagram profile such as `instagram.com/maya_creates/` or a YouTube handle page such as `youtube.com/@TheTechRishi`.
6. Open Creatorly from the Chrome toolbar and choose **Find this contact**.

The popup defaults to the current production URL, `https://creatorly-build-week.vercel.app`. Expand **Dashboard address** in the popup to switch it to `http://localhost:5173` during local development or to save a future custom domain.

M1 limitation: the extension detects the profile and opens a pre-filled dashboard search. Contact reveal and account state stay in the dashboard. Shared extension sign-in and embedded unlock are deferred until the cloud Convex authentication flow can be verified.
