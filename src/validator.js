const maxStringLength = 300;
const maxNumberValue = 1000000;

const isValidInteger = (input) => {
  return (!!input) && Number.isInteger(input) && (input > 0) && (input <= maxNumberValue);
};

const isValidMonth = (input) => {
  return isValidInteger(input) && (input >= 1) && (input <= 12);
};

const isValidYear = (input) => {
  return isValidInteger(input) && (input >= 2001) && (input <= 2100);
};

const isValidUrl = (input) => {
  // null, undefined or empty string is a valid url
  if (input === null || input === undefined) {
    return true;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') {
      return true;
    }
    if ((trimmed.startsWith('http://') || trimmed.startsWith('https://')) && trimmed.length <= maxStringLength) {
      return true;
    }
  }
  return false;
};

const isValidString = (input) => {
  return (!!input) && (typeof input === 'string') && (input.trim().length > 0) && (input.trim().length <= maxStringLength);
};

const isValidDecimal = (input) => {
  const regex = /^[0-9]+(?:\.[0-9]{1,2})?$/;
  return (!!input) && regex.test(input.toString()) && (typeof input === 'number') && (input > 0) && (input <= maxNumberValue);
};

const validate = (model) => {
  
  const errors = [];
  
  const push = (fieldName, message) => {
    if (errors.some(x => x.field === fieldName)) {
      // each field only once
      return;
    }
    errors.push({
      field: fieldName,
      message: `${fieldName} ${message}`
    });
  };
  
  const validateInteger = (obj, fieldName) => {
    if (!isValidInteger(obj[fieldName])) {
      push(fieldName, 'must be a valid integer.');
    }
  };
  
  const validateMonth = (obj, fieldName) => {
    if (!isValidMonth(obj[fieldName])) {
      push(fieldName, 'must be a valid integer between 1 and 12.');
    }
  };
  
  const validateYear = (obj, fieldName) => {
    if (!isValidYear(obj[fieldName])) {
      push(fieldName, 'must be a valid integer between 2001 and 2100.');
    }
  };
  
  const validateUrl = (obj, fieldName) => {
    if (!isValidUrl(obj[fieldName])) {
      push(fieldName, `must be a non-empty string, have less than ${maxStringLength} characters and start with https://.`);
    }
  };
  
  const validateString = (obj, fieldName, fieldLabel) => {
    if (!isValidString(obj[fieldName])) {
      push(fieldLabel || fieldName, `must be a non-empty string and have less than ${maxStringLength} characters.`);
    }
  };
  
  const validateDecimal = (obj, fieldName, fieldLabel) => {
    if (!isValidDecimal(obj[fieldName])) {
      push(fieldLabel || fieldName, 'must be a valid number, and can have at most 2 decimal places.');
    }
  };
  
  validateInteger(model, 'invoiceId');
  validateMonth(model, 'invoiceMonth');
  validateYear(model, 'invoiceYear');
  validateUrl(model, 'logoUrl');
  validateString(model, 'sellerName');
  validateString(model, 'sellerStreet');
  validateString(model, 'sellerPostCode');
  validateString(model, 'sellerCity');
  validateString(model, 'sellerCountry');
  validateString(model, 'sellerVatNumber');
  validateString(model, 'sellerIBAN');
  validateString(model, 'sellerSWIFT');
  validateString(model, 'sellerBank');
  validateString(model, 'sellerOperator');
  validateString(model, 'buyerName');
  validateString(model, 'buyerStreet');
  validateString(model, 'buyerPostCode');
  validateString(model, 'buyerCity');
  validateString(model, 'buyerCountry');
  validateString(model, 'buyerVatNumber');
  
  if (!model.items || !Array.isArray(model.items) || (model.items.length === 0)) {
    push('items', 'must be a non-empty array.');
  } else if (model.items.length > 5) {
    push('items', 'array can have at most 5 elements.');
  } else {
    for (let i = 0; i < model.items.length; i++) {
      const item = model.items[i];
      if (!item || (item.constructor !== Object)) {
        push('items', 'array can only contain objects.');
      } else {
        const prefix = `items[${i}]`;
        validateString(item, 'description', `${prefix}.description`);
        validateString(item, 'unit', `${prefix}.unit`);
        validateDecimal(item, 'price', `${prefix}.price`);
        validateDecimal(item, 'quantity', `${prefix}.quantity`);
      }
    }
  }
  
  return {
    errors: errors,
    valid: errors.length === 0
  };
}

module.exports = {
  validate
};
