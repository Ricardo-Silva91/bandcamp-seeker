// @ts-check
const {test} = require('@playwright/test');
const {buyAlbum, getAlbumsFromEmail, keepTempMailAlive} = require('../utils/browser.utils');
const {readFilesInDataDir} = require('../utils/fs.utils');
const {mergeToCollection, log} = require('../utils/object.utils');

test.describe('Go To Bandcamp', () => {
  test('download free albums', async ({page, context}) => {
    test.setTimeout(60 * 60 * 1000);

    const mailAlbums = [];

    const emailPage = await context.newPage();

    await emailPage.goto('https://10minutemail.net/');
    // await emailPage.locator('a[href="more.html"]').click();

    emailPage.on('popup', async (popup) => {
      const popupTitle = await popup.title();

      log('email page popup', {popupTitle});

      if (popupTitle !== 'Bandcamp') {
        await popup.close();
      }
    });

    const tempMail = await emailPage.inputValue('#fe_text');
    keepTempMailAlive({page: emailPage});

    log({tempMail});

    const files = readFilesInDataDir();
    let collection = files[0];

    for (let i = 1; i < files.length; i++) {
      collection = mergeToCollection({collection: collection, newAlbums: files[i]});
    }

    log({collection});

    for (const album of collection) {
      const buyAlbumResult = await buyAlbum({page, title: album.title, url: album.url, tempMail});

      if (buyAlbumResult.mailAlbum) {
        mailAlbums.push({title: album.title, url: album.url});
      }

      // await emailPage.locator('a[href="more.html"]').click();
    }

    await getAlbumsFromEmail({emailPage, context, mailAlbums});

    return;
  });
});
