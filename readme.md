# Auto Festival of Giving
A small puppeteer script to keep up with the festival of giving

## Setup
- Run  `npm install` from root folder
- Update auth token so your account is logged in for the drops. To get auth token:
    - Log into Twitch on your normal browser
    - Open devtools
    - View cookies for https://www.twitch.tv
    - Search for `auth-token`
    - Copy value to `authToken` in `index.js`, or create an .env file with `AUTH_TOKEN` set to the copied value at the root folder
- Verify the `chromeExecutablePath` in `index.js` with your local installation of chrome, and update if necessary. Chromium bundled with puppeteer does not appear to work on Twitch
- Run `npm run start` or `node index.js` from root folder

## About
Manages two chrome instances (main page and secondary page) to handle viewing the official Sea of Thieves channel, and the channels they raid out to.

When a raid occurs, the raid target is sent to the secondary page and the main page goes back to the official Sea of Thieves channels to await the next raid

Happy Festival of Giving