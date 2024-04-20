const schema = require('./schema.json');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

ajv.addFormat('fmtInteger', { type: 'number', validate: (input) => isValidInteger(input) });
ajv.addFormat('fmtMonth',   { type: 'number', validate: (input) => isValidInteger(input) && (input >= 1) && (input <= 12) });
ajv.addFormat('fmtYear',    { type: 'number', validate: (input) => isValidInteger(input) && (input >= 2001) && (input <= 2100) });
ajv.addFormat('fmtUrl',     { type: 'string', validate: (input) => isValidUrl(input) });
ajv.addFormat('fmtString',  { type: 'string', validate: (input) => isValidString(input) });
ajv.addFormat('fmtDecimal', { type: 'number', validate: (input) => isValidDecimal(input) });

const maxStringLength = 300;
const maxNumberValue = 1000000;

const isValidString = (input) => {
  return (!!input) && (typeof input === 'string') && (input.trim().length > 0) && (input.trim().length <= maxStringLength);
};

const isValidInteger = (input) => {
  return (!!input) && Number.isInteger(input) && (input > 0) && (input <= maxNumberValue);
};

const isValidDecimal = (input) => {
  const regex = /^[0-9]+(?:\.[0-9]{1,2})?$/;
  return (!!input) && regex.test(input.toString()) && (typeof input === 'number') && (input > 0) && (input <= maxNumberValue);
};

const isValidUrl = (input) => {
  // null or empty string is a valid url
  if (input === null) {
    return true;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return true;
    }
    if ((trimmed.startsWith('http://') || trimmed.startsWith('https://')) && trimmed.length <= maxStringLength) {
      return true;
    }
  }
  return false;
};

const formatInstancePath = (input) => {
  return input.substring(1)
    .replace(/\/([0-9]+)\//, '[$1].')
    .replace(/\/([0-9]+)$/, '[$1]');
};

const extractError = (e) => {
  if (e.keyword === 'format' && e.instancePath && e.params?.format) {
    const instancePath = formatInstancePath(e.instancePath);
    const fmtMessages = {
      fmtDecimal: `${instancePath} must be a positive number, and can have at most 2 decimal places.`,
      fmtString: `${instancePath} must be a non-empty string and have less than ${maxStringLength} characters.`,
      fmtInteger: `${instancePath} must be a positive integer.`,
      fmtUrl: `${instancePath} must be a non-empty string, have less than ${maxStringLength} characters and start with https://.`,
      fmtYear: `${instancePath} must be a positive integer between 2001 and 2100.`,
      fmtMonth: `${instancePath} must be a positive integer between 1 and 12.`
    };
    const message = fmtMessages[e.params.format];
    if (message) {
      return {
        field: instancePath,
        message: message
      };
    }
  }
  else if (e.keyword === 'required' && e.params?.missingProperty) {
    const instancePath = formatInstancePath(`${e.instancePath}/${e.params.missingProperty}`);
    return {
      field: instancePath,
      message: `${instancePath} is a required field.`
    };
  }
  else if ((e.keyword === 'type' || e.keyword === 'minItems' || e.keyword === 'maxItems') && e.instancePath) {
    const instancePath = formatInstancePath(e.instancePath);
    return {
      field: instancePath,
      message: `${instancePath} ${e.message}.`
    };
  }
  return null;
};

const validate = (model) => {
  
  const doValidation = ajv.compile(schema);
  const isValid = doValidation(model);
  
  const errors = [];
  
  if (doValidation.errors) {
    for (let i = 0; i < doValidation.errors.length; i++) {
      const err = extractError(doValidation.errors[i]);
      if (err && !errors.some(x => x.field === err.field)) {
        errors.push(err);
      }
    }
  }
  if (!isValid && ((errors.length === 0) || errors.some(x => !x.field))) {
    errors.push({
      field: null,
      message: 'Model is not valid (unexpected error).'
    });
  };
  
  return {
    errors: errors,
    valid: isValid
  };
}

module.exports = {
  validate
};
