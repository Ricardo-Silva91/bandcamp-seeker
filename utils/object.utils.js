const mergeToCollection = ({collection, newAlbums}) => {
  for (const album of newAlbums) {
    if (!collection.find((el) => el.title === album.title)) {
      console.log('new free album found 🚀');
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

module.exports = {
  mergeToCollection,
  waitFor,
};
