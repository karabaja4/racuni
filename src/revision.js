const fs = require('node:fs');
const path = require('node:path');
const log = require('./log');

let revision = 'git';

const resolve = async () => {
  try {
    const master = path.join(path.resolve(__dirname, '..'), '.git/refs/heads/master');
    const data = await fs.promises.readFile(master);
    revision = data.toString().trim().substring(0, 7);
  } catch (err) {
    log.info(err.stack);
  }
};

const get = () => {
  return revision;
};

module.exports = {
  resolve,
  get
};
