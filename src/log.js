const log = (type, message) => {
  const utc = (new Date()).toISOString();
  console.log(`[${utc}][${type}] ${message}`);
};

const info = (message) => {
  log('info', message);
};

const error = (err) => {
  if (err) {
    log('error', err.stack || err.message || err);
  } else {
    log('error', 'Unknown error occured.');
  }
};

module.exports = {
  info,
  error
};
