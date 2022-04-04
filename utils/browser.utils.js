const {moveFile} = require('./fs.utils');
const {waitFor, log} = require('./object.utils');
const {getTextOfElement} = require('./playwright-helpers');

const getFreeAlbumsInPage = async ({page}) => {
  const freeAlbums = [];

  const soldAlbums =
    await page.locator('.salesfeed-items.row > li:has(.item-over)');
  const soldAlbumsCount = await soldAlbums.count();

  for (let index = 0; index < soldAlbumsCount; index += 1) {
    const element = await soldAlbums.nth(index);

    // const priceEl = await element.locator('.item-price');
    // const priceText = await priceEl.allInnerTexts();
    const priceText = await getTextOfElement({page: element, query: '.item-price'});
    // const overEl = await element.locator('.item-over');
    // const overText = await overEl.allInnerTexts();
    const overText = await getTextOfElement({page: element, query: '.item-over'});

    if (!priceText || !overText) {
      continue;
    }

    const price = priceText.replace(/[^0-9]/g, '');
    const over = overText.replace(/[^0-9]/g, '');

    if (price === over) {
      // const titleEl = await element.locator('.item-title');
      // const titleTexts = await titleEl.allInnerTexts();
      const titleText = await getTextOfElement({page: element, query: '.item-title'});
      const linkEl = await element.locator('a.item-inner');
      const linkUrl = await linkEl.getAttribute('href');

      freeAlbums.push({
        title: titleText,
        url: linkUrl.includes('https:') ? linkUrl : `https:${linkUrl}`,
      });
    }
  }

  return freeAlbums;
};

const buyAlbum = async ({
  page, title, url, tempMail,
}) => {
  const result = {
    mailAlbum: false,
  };

  try {
    await page.goto(url);
  } catch (error) {
    log('error navigating to', {url});
    return result;
  }

  waitFor(5);

  const priceLabelText = await getTextOfElement({page, query: '.buyItemExtra.buyItemNyp.secondaryText'});
  if (priceLabelText !== 'name your price') {
    log('album is not free 😢');
    return result;
  }

  await page.locator('.buyItem.digital .main-button .download-link.buy-link').click();
  let userPriceEl = await page.locator('#userPrice');
  let userPriceCount = await userPriceEl.count();

  let count = 0;
  while (count !== 3 && userPriceCount === 0) {
    count = count + 1;
    await page.locator('.buyItem.digital .main-button .download-link.buy-link').click();
    userPriceEl = await page.locator('#userPrice');
    userPriceCount = await userPriceEl.count();

    log({userPriceCount});

    await waitFor(1);
  }

  await page.locator('#userPrice').click();
  await page.locator('#userPrice').fill('0');
  await page.locator('text=download to your computer').click();

  const fanEmailInput = await page.locator('#email-section:not([style="display:none"]) #fan_email_address');
  const fanEmailInputCount = await fanEmailInput.count();

  if (fanEmailInputCount === 0) {
    await Promise.all([
      page.waitForNavigation(),
      page.locator('text=Download Now').click(),
    ]);

    await downloadAlbum({downloadPage: page, title, url});
  } else {
    log('must add email');

    result.mailAlbum = true;

    await page.locator('#fan_email_address').fill(tempMail);
    await page.locator('#fan_email_postalcode').fill('55555');

    await page.locator('#downloadButtons_email .download-panel-checkout-button').click();
  }

  return result;
};

const getAlbumsFromEmail = async ({emailPage, context, mailAlbums}) => {
  log('getting mailed albums');

  let emailAnchors = await emailPage.locator('a:has-text("Your download from")');
  let emailAnchorsCount = await emailAnchors.count();
  log({emailAnchorsCount, mailAlbums: mailAlbums.length});

  while (emailAnchorsCount < mailAlbums.length) {
    await waitFor(30);

    await emailPage.locator('text=Refresh this page.').click();

    emailAnchors = await emailPage.locator('a:has-text("Your download from")');
    emailAnchorsCount = await emailAnchors.count();

    log({emailAnchorsCount, mailAlbums: mailAlbums.length});
  }

  for (let index = 0; index < emailAnchorsCount; index += 1) {
    const anchor = await emailAnchors.nth(index);
    const {title} = mailAlbums[index];
    const {url} = mailAlbums[index];

    log({anchor});

    await anchor.click();

    let tabA = await emailPage.locator('#tab1 a');
    let tabACount = await tabA.count();

    log('waiting', {tabACount});

    let count = 0;
    while (count !== 3 && tabACount === 0) {
      count = count + 1;

      await anchor.click();

      tabA = await emailPage.locator('#tab1 a');
      tabACount = await tabA.count();

      log('waiting', {tabACount});

      await waitFor(1);
    }

    const [downloadPage] = await Promise.all([
      context.waitForEvent('page'),
      emailPage.locator('#tab1 a').first().click(),
    ]);

    await waitFor(5);

    await downloadAlbum({downloadPage, title, url});

    await downloadPage.close();
  }

  return;
};

const downloadAlbum = async ({downloadPage, title, url}) => {
  log('downloading', title);

  const defaultQualityLabel = await downloadPage.locator('text=MP3 V0 ▾');
  const defaultQualityLabelCount = await defaultQualityLabel.count();

  log({defaultQualityLabelCount});

  if (defaultQualityLabelCount) {
    await defaultQualityLabel.click();
    await downloadPage.locator('text=MP3 320').click();
  }

  const [download] = await Promise.all([
    downloadPage.waitForEvent('download'),
    downloadPage.locator('.download a.item-button').click(),
  ]);

  log('will wait for', title);

  const path = await download.path();

  const albumTitle = await getTextOfElement({page: downloadPage, query: '.download .title'});
  let albumArtist = await getTextOfElement({page: downloadPage, query: '.download .artist'});

  albumArtist = albumArtist.replace('by ', '');

  const realTitle = `${albumArtist}-${albumTitle}`;
  log('download for ', realTitle, 'is done', {albumArtist, albumTitle});

  const sanitizedTitle = realTitle.split('\n').join('-').replace(/[/.:,"()]/g, '').replace(/\\n| /g, '-');
  log({realTitle, path: `./downloads/${sanitizedTitle}.${url.includes('track') ? 'mp3' : 'zip'}`});

  moveFile(path, `./downloads/${sanitizedTitle}.zip`);
};

const keepTempMailAlive = async ({page}) => {
  let timeElCount = 1;

  while (timeElCount !== 0 && page) {
    try {
      const timeEl = await page.locator('#time');
      timeElCount = await timeEl.count();

      if (timeElCount !== 0) {
        // const timeTexts = await timeEl.allInnerTexts();
        const timeText = await getTextOfElement({page, query: '#time'});
        const time = timeText.split(':')[0];

        await waitFor(30);

        if (time === '00') {
          log('need 10 more minutes');
          const moreTimeEl = await page.locator('text=Give me 10 more minutes!');
          const moreTimeElCount = await moreTimeEl.count();

          if (moreTimeElCount === 1) {
            moreTimeEl.click();
          } else {
            return;
          }
        }
      }
    } catch (error) {
      log('quitting temp mail keepalive');
    }
  }

  return;
};

module.exports = {
  getFreeAlbumsInPage,
  buyAlbum,
  getAlbumsFromEmail,
  keepTempMailAlive,
};
