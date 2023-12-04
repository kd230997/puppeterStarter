/**
 * @name get list of links
 *
 * @desc Scrapes Hacker News for links on the home page and returns the top 10
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import https from 'https';

const FOLDER_IMG = 'Champion-Image';
const CHAMPION_LIST = 'Champions';
const URL = 'https://tftactics.gg/champions';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--disable-features=site-per-process'] })

    try {
        const listChampion = await getListOfChampion(browser);

        // Start to download image
        await downloadListChampionIcon(listChampion).then((resolve) => {
            console.log('Done to load icon!');
        });
    } catch (error) {
        console.log(error);
    }
    await browser.close()

})();

async function getListOfChampion(browser) {
    console.log('Start to load List Champion');
    const today = new Date();
    const filePath = `${CHAMPION_LIST}/tftChampionData-${today.getDate()}${today.getMonth() + 1}${today.getFullYear()}.json`;
    let listChampion = [];

    if (!fs.existsSync(filePath)) {
        console.log(`Not have champion in cache, get from ${URL}`);
        const page = await browser.newPage();

        await page.goto(URL, {
            waitUntil: 'load',
            timeout: 0
        });

        listChampion = await page.$$eval('a.characters-item', (champions) => {
            return champions.map(champion => ({
                championName: champion.getElementsByClassName('character-name')[0].textContent,
                championImage: champion.getElementsByClassName('character-icon')[0].getAttribute('src'),
                championDetailLink: `${window.location.origin}${champion.getAttribute('href')}`,
            }));
        });

        try {
            if (!fs.existsSync(CHAMPION_LIST)) {
                fs.mkdirSync(CHAMPION_LIST);
            }
        } catch (err) {
            console.error(err);
        }

        await fs.writeFileSync(filePath, JSON.stringify({ totalChampion: listChampion.length, champions: listChampion }, null, 4));
    } else {
        console.log(`Get champion from ${filePath}`);

        listChampion = JSON.parse(fs.readFileSync(filePath));
    }

    console.log('Done to load List Champion');
    return listChampion;
}

async function downloadListChampionIcon(listChampion = []) {
    console.log('Start to dowload champion image.');

    try {
        if (!fs.existsSync(FOLDER_IMG)) {
            fs.mkdirSync(FOLDER_IMG);
        }
    } catch (err) {
        console.error(err);
    }

    listChampion.forEach(async (champion) => {
        await downloadFile(FOLDER_IMG, champion.championImage);
    });
}

async function downloadFile(folderName = '', imgURL = '') {
    const splitURL = imgURL.split('/');
    const fileName = splitURL[splitURL.length - 1];
    const filePath = `${folderName}/${fileName}`;
    const file = fs.createWriteStream(filePath);

    return https.get(imgURL, response => {
        response.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log(`Image downloaded as ${filePath}`);
        });
    }).on('error', err => {
        fs.unlink(filePath);
        console.error(`Error downloading image: ${err.message}`);
    });
}