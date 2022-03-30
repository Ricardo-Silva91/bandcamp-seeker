const {moveFile} = require('./fs.utils');
const {waitFor} = require('./object.utils');

const getFreeAlbumsInPage = async ({page}) => {
  const freeAlbums = [];

  const soldAlbums =
    await page.locator('.salesfeed-items.row > li:has(.item-over)');
  const soldAlbumsCount = await soldAlbums.count();

  for (let index = 0; index < soldAlbumsCount; index += 1) {
    const element = await soldAlbums.nth(index);

    const priceEl = await element.locator('.item-price');
    const priceText = await priceEl.allInnerTexts();
    const overEl = await element.locator('.item-over');
    const overText = await overEl.allInnerTexts();

    if (!priceText.length || !overText.length) {
      continue;
    }

    const price = priceText[0].replace(/[^0-9]/g, '');
    const over = overText[0].replace(/[^0-9]/g, '');

    if (price === over) {
      const titleEl = await element.locator('.item-title');
      const titleTexts = await titleEl.allInnerTexts();
      const linkEl = await element.locator('a.item-inner');
      const linkUrl = await linkEl.getAttribute('href');

      freeAlbums.push({
        title: titleTexts[0],
        url: `https:${linkUrl}`,
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

  await page.goto(url);

  await page.locator('.buyItem.digital .main-button .download-link.buy-link').click();
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
    console.log('must add email');

    result.mailAlbum = true;

    await page.locator('#fan_email_address').fill(tempMail);
    await page.locator('#fan_email_postalcode').fill('55555');

    await page.locator('#downloadButtons_email .download-panel-checkout-button').click();
  }

  return result;
};

const getAlbumsFromEmail = async ({emailPage, context, mailAlbums}) => {
  console.log('getting mailed albums');

  let emailAnchors = await emailPage.locator('a:has-text("Your download from")');
  let emailAnchorsCount = await emailAnchors.count();

  while (emailAnchorsCount < mailAlbums.length) {
    const timeEl = await emailPage.locator('#time');
    const timeTexts = await timeEl.allInnerTexts();
    const time = timeTexts[0].split(':')[0];

    await waitFor(30);

    if (time === '00') {
      await emailPage.locator('text=Give me 10 more minutes!').click();
    } else {
      await emailPage.locator('text=Refresh this page.').click();
    }

    emailAnchors = await emailPage.locator('a:has-text("Your download from")');
    emailAnchorsCount = await emailAnchors.count();

    console.log({emailAnchorsCount, mailAlbums: mailAlbums.length});
  }

  for (let index = 0; index < emailAnchorsCount; index += 1) {
    const anchor = await emailAnchors.nth(index);
    const {title} = mailAlbums[index];
    const {url} = mailAlbums[index];

    await anchor.click();
    const [downloadPage] = await Promise.all([
      context.waitForEvent('page'),
      emailPage.locator('#tab1 a').first().click(),
    ]);

    await waitFor(30);

    await downloadAlbum({downloadPage, title, url});
  }

  return;
};

const downloadAlbum = async ({downloadPage, title, url}) => {
  const defaultQualityLabel = await downloadPage.locator('text=MP3 V0 ▾');
  const defaultQualityLabelCount = await defaultQualityLabel.count();

  console.log({defaultQualityLabelCount});

  if (defaultQualityLabelCount) {
    await defaultQualityLabel.click();
    await downloadPage.locator('text=MP3 320').click();
  }

  const [download] = await Promise.all([
    downloadPage.waitForEvent('download'),
    downloadPage.locator('a:has-text("Download")').click(),
  ]);

  console.log('will wait for', title);

  const path = await download.path();

  const albumTitle = await getTextOfElement({page: downloadPage, query: '.download .title'});
  let albumArtist = await getTextOfElement({page: downloadPage, query: '.download .artist'});

  albumArtist = albumArtist.replace('by ', '');

  const realTitle = `${albumArtist}-${albumTitle}`;
  console.log('download for ', realTitle, 'is done', {albumArtist, albumTitle});

  const sanitizedTitle = realTitle.split('\n').join('-').replace(/[/.:,]/g, '').replace(/\\n| /g, '-');
  console.log({realTitle, path: `./downloads/${sanitizedTitle}.${url.includes('track') ? 'mp3' : 'zip'}`});

  moveFile(path, `./downloads/${sanitizedTitle}.zip`);
};

const getTextOfElement = async ({page, query}) => {
  if (!page || !query) {
    console.error('no page or query when searching for', {query, page});
  }
  const el = await page.locator(query);
  const texts = await el.allInnerTexts();
  const text = texts[0];

  return text;
};

module.exports = {
  getFreeAlbumsInPage,
  buyAlbum,
  getAlbumsFromEmail,
};
