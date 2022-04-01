// @ts-check
const {test} = require('@playwright/test');
const {getFreeAlbumsInPage} = require('../utils/browser.utils');
const {saveAlbumsInFile} = require('../utils/fs.utils');
const {mergeToCollection, waitFor, runTimer, log} = require('../utils/object.utils');

test.describe('Go To Bandcamp', () => {
  test('fetch available free albums', async ({page}) => {
    await page.goto('https://bandcamp.com/');

    let collection = [];
    const timeToSearch = process.env.TIMETOSEARCH || '0';
    const end = new Date().getTime() + (Number.parseInt(timeToSearch, 10) * 60 * 1000);

    log('searching, will stop at: ', new Date(end));
    runTimer(new Date(end));

    do {
      const freeAlbums = await getFreeAlbumsInPage({page});

      if (freeAlbums.length) {
        collection = mergeToCollection({collection, newAlbums: freeAlbums});
      }

      await waitFor(1);
    } while (new Date().getTime() < end);

    if (collection.length) {
      saveAlbumsInFile(collection);
    } else {
      log('no free albums found 😢');
    }
  });
});
