const isProduction = () => {
  return stage() === 'production';
};

const stage = () => {
  return process.env?.NODE_ENV?.toLowerCase() || 'development';
};

module.exports = {
  isProduction,
  stage
};
