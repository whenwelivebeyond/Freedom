# Freedom app

## Run on your laptop and phone

1. Double-click **Start Freedom.bat** on the laptop.
2. If Windows asks whether Node.js may communicate on your network, allow it on your **private/home network**.
3. On the laptop, open `http://localhost:4173` in Chrome.
4. Keep the laptop and phone on the same Wi-Fi. On the phone, open the `http://...:4173` address printed in the server window.
5. Sign in to the app with the Google account allowed by the Firestore rules.

Keep the laptop and the server window running while using the app on your phone. Firestore syncs records between signed-in devices over the internet.

The site files are served from the laptop's local network; this setup does not publish a website. Firestore is still a cloud database, so the app needs an internet connection to sync.
