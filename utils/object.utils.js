const mergeToCollection = ({collection, newAlbums}) => {
  for (const album of newAlbums) {
    if (!collection.find((el) => el.title === album.title)) {
      console.log('new free album found 🚀', {album});
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
    console.log((end.getTime() - now.getTime()) / 1000, 'seconds untill quitting');

    await waitFor(60);
    now = new Date();
  }

  return;
};

module.exports = {
  mergeToCollection,
  waitFor,
  runTimer,
};
