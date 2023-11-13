const schema = require('./schema.json');
const Validator = require('jsonschema').Validator;

const maxStringLength = 300;
const maxNumberValue = 1000000;

const isValidString = (input) => {
  return (!!input) && (typeof input === 'string') && (input.length > 0) && (input.length <= maxStringLength);
};

const isValidInteger = (input) => {
  return (!!input) && Number.isInteger(input) && (input > 0) && (input <= maxNumberValue);
};

const isValidDecimal = (input) => {
  return (!!input) && (typeof input === 'number') && (input > 0) && (input <= maxNumberValue) && ((input * 100) % 1 === 0);
};

const validator = new Validator();
validator.customFormats.fmtDecimal = (input) => isValidDecimal(input);
validator.customFormats.fmtString = (input) => isValidString(input);
validator.customFormats.fmtInteger = (input) => isValidInteger(input);
validator.customFormats.fmtUrl = (input) => isValidString(input) && input.startsWith('https://');
validator.customFormats.fmtYear = (input) => isValidInteger(input) && (input >= 2001) && (input <= 2100);
validator.customFormats.fmtMonth = (input) => isValidInteger(input) && (input >= 1) && (input <= 12);

const getErrorMessage = (argument) => {
  if (!argument) {
    return null;
  }
  const messageMap = {
    fmtDecimal: `Must be a positive number, and can have at most 2 decimal places.`,
    fmtString: `Must be non-empty and have less than ${maxStringLength} characters.`,
    fmtInteger: `Must be a positive integer.`,
    fmtUrl: `Must be non-empty, have less than ${maxStringLength} characters and start with https://.`,
    fmtYear: `Must be a positive integer between 2001 and 2100.`,
    fmtMonth: `Must be a positive integer between 1 and 12.`,
  };
  return messageMap[argument];
};

const validate = (model) => {
  const result = validator.validate(model, schema);
  const errors = [];
  if (result.errors) {
    for (let i = 0; i < result.errors.length; i++) {
      const e = result.errors[i];
      const message = getErrorMessage(e.argument);
      if (e.property && message) {
        errors.push({
          field: e.property.substring(e.property.indexOf('.') + 1), // remove "instance."
          message: message
        });
      }
    }
  }
  if (!result.valid && errors.length === 0) {
    errors.push({
      field: null,
      errors: 'Model is not valid (unexpected error).'
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
