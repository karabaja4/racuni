const info = (message) => {
  var date = (new Date()).toISOString();
  console.log(`[${date}] ${message}`);
};

module.exports = {
  info
};