const schema = require('./schema.json');
const Validator = require('jsonschema').Validator;

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

const validator = new Validator();

validator.customFormats.fmtDecimal = (input) => isValidDecimal(input);
validator.customFormats.fmtString = (input) => isValidString(input);
validator.customFormats.fmtInteger = (input) => isValidInteger(input);
validator.customFormats.fmtUrl = (input) => isValidUrl(input);
validator.customFormats.fmtYear = (input) => isValidInteger(input) && (input >= 2001) && (input <= 2100);
validator.customFormats.fmtMonth = (input) => isValidInteger(input) && (input >= 1) && (input <= 12);

const getError = (e) => {
  if (!e.property && !e.argument) {
    return null;
  }
  const prop = e.property.replace(/^instance\.?/, '');
  if (e.name === 'format') {
    const fmtMessages = {
      fmtDecimal: `${prop} must be a positive number, and can have at most 2 decimal places.`,
      fmtString: `${prop} must be a non-empty string and have less than ${maxStringLength} characters.`,
      fmtInteger: `${prop} must be a positive integer.`,
      fmtUrl: `${prop} must be a non-empty string, have less than ${maxStringLength} characters and start with https://.`,
      fmtYear: `${prop} must be a positive integer between 2001 and 2100.`,
      fmtMonth: `${prop} must be a positive integer between 1 and 12.`
    };
    return {
      field: prop,
      message: fmtMessages[e.argument]
    };
  }
  if (e.name === 'required') {
    const field = prop ? `${prop}.${e.argument}` : e.argument;
    return {
      field: field,
      message: `${field} is a required field.`
    };
  }
  if (e.name === 'type' && e.message) {
    return {
      field: prop,
      message: `${prop} ${e.message.replace('type(s)', 'type')}`
    };
  }
  return null;
};

const validate = (model) => {
  const result = validator.validate(model, schema);
  const errors = [];
  if (result.errors) {
    for (let i = 0; i < result.errors.length; i++) {
      const err = getError(result.errors[i]);
      if (err && !errors.some(x => x.field === err.field)) {
        errors.push(err);
      }
    }
  }
  if (!result.valid && errors.length === 0) {
    errors.push({
      field: null,
      message: 'Model is not valid (unexpected error).'
    });
  };
  return {
    errors: errors,
    valid: result.valid
  };
};

module.exports = {
  validate
};
