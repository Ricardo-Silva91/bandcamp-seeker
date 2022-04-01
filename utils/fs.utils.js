const fs = require('fs');
const { log } = require('./object.utils');

const saveAlbumsInFile = (albums) => {
  const timestamp = new Date().getTime();

  checkDirExistsAndCreateIfNeeded('./data', true);

  fs.writeFileSync(`./data/${timestamp}.json`, JSON.stringify(albums, null, 2));
};

const readFilesInDataDir = () => {
  if (!checkDirExistsAndCreateIfNeeded('./data')) {
    return [];
  }

  const result = [];
  const files = fs.readdirSync('./data');

  for (const file of files) {
    const fileContent = fs.readFileSync(`./data/${file}`);
    result.push(JSON.parse(fileContent));
  }

  log({result});

  return result;
};

const moveFile = (src, dest) => {
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
  } else {
    log('file ', src, 'does not exist 😢');
  }
};

const checkDirExistsAndCreateIfNeeded = (dir, create = false) => {
  const dirExists = fs.existsSync(dir);

  if (dirExists) {
    const isDirectory = fs.lstatSync(dir).isDirectory();

    return isDirectory;
  }

  if (create) {
    fs.mkdirSync(dir);
    return true;
  }

  return false;
};

module.exports = {
  saveAlbumsInFile,
  readFilesInDataDir,
  moveFile,
};
