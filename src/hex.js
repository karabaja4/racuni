const stringToHex = (str) => {
  return Buffer.from(str, 'utf8').toString('hex');
};
  
const hexToString = (hex) => {
  return Buffer.from(hex, 'hex').toString('utf8');
};

module.exports = {
  stringToHex,
  hexToString
};
