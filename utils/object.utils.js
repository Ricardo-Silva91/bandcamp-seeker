const mergeToCollection = ({collection, newAlbums}) => {
  for (const album of newAlbums) {
    if (!collection.find((el) => el.title === album.title)) {
      log('new free album found 🚀', {album});
      collection.push(album);
    }
  }

  return collection;
};

const waitFor = (seconds) => new Promise((resolve) => {
  setTimeout(() => {
    resolve();
  }, seconds * 1000);
});

const runTimer = async (end) => {
  let now = new Date();

  while (end.getTime() > now.getTime()) {
    log((end.getTime() - now.getTime()) / 1000, 'seconds until quitting');

    await waitFor(60);
    now = new Date();
  }

  return;
};

const log = (...arguments) => {
  const dev = process.env.DEV;
  const args = arguments;

  if (dev) {
    console.log(...args);
  }
};

module.exports = {
  mergeToCollection,
  waitFor,
  runTimer,
  log,
};
