require('dotenv').config();
const puppeteer = require('puppeteer');

// Auth token from www.twitch.tv cookies in your normal browser: log in with your account
const authToken = process.env.AUTH_TOKEN || "";
// Chrome executable path (built-in chromium from puppeteer does not work on twitch)
const chromeExecutablePath = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

const baseTwitchUrl = 'https://www.twitch.tv/';
const twitchChannelName = 'seaofthieves';
const defaultTwitchChannelUrl = `${baseTwitchUrl}${twitchChannelName}`;

const windowWidth = 820;
const windowHeight = 620;

/**
 * Log a message to the console
 * @param {any} msg 
 * @param {'error'|'success'|'pending'|'ready'|'ok'|undefined} messageType 
 */
const logMessage = (msg, messageType) => {
    const now = new Date();

    let messageTypeIcon = '';

    switch (messageType) {
        case 'error': {
            messageTypeIcon = '❌';
            break;
        }
        case 'pending': {
            messageTypeIcon = '⌛';
            break;
        }
        case 'success': {
            messageTypeIcon = '✅';
            break;
        }
        case 'ready': {
            messageTypeIcon = '🚀';
            break;
        }
        case 'ok': {
            messageTypeIcon = '👍';
            break;
        }
        default: {
            break;
        }
    }

    console.log(`${messageTypeIcon} [${now.toLocaleString()}] ${msg}`);
};

/**
 * Initializes the given page and URL with the local storage and cookies needed for twitch drops
 * @param {puppeteer.Page} page 
 * @param {string} url 
 */
const initializeTwitchUrl = async (page, url) => {
    const cookies = [{
        'name': 'auth-token',
        'value': authToken
    }];

    await page.goto(url);
    
    await page.evaluate(() => {
        localStorage.setItem('mature', 'true'); // Handle streams that need to confirm you're 'mature'
        localStorage.setItem('video-muted', '{"default":false}'); // Can't be muted to progress drops
        localStorage.setItem('volume', '0.01'); // Set volume as low as it goes without being muted
        localStorage.setItem('video-quality', '{"default":"160p30"}'); // Go low-res because if you wanted to be watching it you wouldnt be using this.
    });

    await page.setCookie(...cookies);

    // Reload now that we've got everything set so that Twitch is logged in and has localStorage configs
    await page.reload({
        waitUntil: ["domcontentloaded"]
    });
}

const run = async () => {
    // Lets use 2 browser instances instead of 2 tabs just because its easier to debug and more fun to watch
    // Could probably just as easily use one browser with 2 pages attached to the same instance if preferred
    const browser1 = await puppeteer.launch({
        headless: false,
        executablePath: chromeExecutablePath,
        args: [`--window-size=${windowWidth},${windowHeight}`, `--window-position=0,0`],
    });
    logMessage('mainPage browser launched', 'ready');

    const browser2 = await puppeteer.launch({
        headless: false,
        executablePath: chromeExecutablePath,
        args: [`--window-size=${windowWidth},${windowHeight}`, `--window-position=${windowWidth},0`],
    });
    logMessage('secondaryPage browser launched', 'ready');

    // Since we're not launching headless, a window will be shown and we'll have a default tab
    // Get the pages on each browser instance so that we can target the default tabs we want to work with
    const mainDefaultTabs = await browser1.pages();
    const secondaryDefaultTabs = await browser2.pages();

    if (mainDefaultTabs.length === 0 || secondaryDefaultTabs.length === 0) {
        logMessage('Launched Chrome, but a page wasnt created. This shouldnt happen as far as I understand, since its not headless. If the browser changed to be headless, a mainPage will need to be created manually!', 'error');

        return;
    }

    const mainPage = mainDefaultTabs[0];
    const secondaryPage = secondaryDefaultTabs[0];

    // Get twitch rockin' on both pages
    await initializeTwitchUrl(mainPage, defaultTwitchChannelUrl);
    logMessage(`Initialized mainPage with Twitch at ${defaultTwitchChannelUrl}`, 'ok');

    await initializeTwitchUrl(secondaryPage, baseTwitchUrl);
    logMessage(`Initialized secondaryPage with Twitch at ${baseTwitchUrl}`, 'ok');

    // Listen to 'framenavigated' event on mainPage to determine when we raid out
    mainPage.on('framenavigated', async (newMainFrame) => {
        // framenavigated appears to be the best way to detect a SPA URL change... buttttt...
        // it also seems to pick up basically any js network request (e.g. passport.twitch.tv, gql.twitch.tv, etc.)
        // SO MANY of these will go off that we dont care about (and will break stuff), so just ignore this event if we're not hitting our base twitch url
        if (!newMainFrame.url().startsWith(baseTwitchUrl)) {
            return;
        }

        try {
            // Seems like we need to wait for this new frame to load before messing with the navigation, otherwise puppeteer will error
            // The player seems to have a consistent class name, lets go with that as a target to ensure it's loaded.
            await newMainFrame.waitForSelector('.persistent-player');

            if (newMainFrame.url() !== defaultTwitchChannelUrl) {
                logMessage(`mainPage is navigating to ${newMainFrame.url()} ...`, 'pending');

                if (secondaryPage.url() !== newMainFrame.url()) {
                    await secondaryPage.goto(newMainFrame.url());
                    logMessage(`Navigated secondaryPage to ${newMainFrame.url()}`, 'success');
                }
                
                if (mainPage.url() !== defaultTwitchChannelUrl) {
                    await mainPage.goto(defaultTwitchChannelUrl);
                    logMessage(`Navigated mainPage back to ${defaultTwitchChannelUrl}`, 'success');
                }
            }
        } catch (err) {
            logMessage(err, 'error');
        }
    });
};

run();