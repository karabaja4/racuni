const dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc')
dayjs.extend(utc);

const isValidString = (data, field) => {
  return !!data[field] && typeof data[field] === 'string' && data[field].length > 0 && data[field].length <= 200;
}

const isValidInteger = (data, field) => {
  return !!data[field] && Number.isInteger(data[field]) && data[field] > 0 && data[field] <= 100000000;
}

const isValidDecimal = (data, field) => {
  return !!data[field] && typeof data[field] === 'number' && Number.isInteger(data[field] * 100) && data[field] > 0 && data[field] <= 100000000;
}

const isValidArray = (data, field) => {
  return !!data[field] && Array.isArray(data[field]) && data[field].length > 0 && data[field].length <= 5;
}

const validateDataModel = (model) => {

  const invalids = [];
  if (!model) invalids.push('body');
  if (!isValidInteger(model, 'invoiceId')) invalids.push('invoiceId');
  if (!isValidInteger(model, 'invoiceMonth') || model.invoiceMonth > 12) invalids.push('invoiceMonth');
  if (!isValidInteger(model, 'invoiceYear') || model.invoiceYear < (dayjs().utc().year() - 1)) invalids.push('invoiceYear');

  if (model.logoUrl && !model.logoUrl.startsWith('http://') && !model.logoUrl.startsWith('https://')) {
    invalids.push('logoUrl');
  }

  const stringFields = [
    //'logoUrl',
    'sellerName',
    'sellerStreet',
    'sellerPostCode',
    'sellerCity',
    'sellerCountry',
    'sellerVatNumber',
    'sellerIBAN',
    'sellerSWIFT',
    'sellerBank',
    'sellerOperator',
    'buyerName',
    'buyerStreet',
    'buyerPostCode',
    'buyerCity',
    'buyerCountry',
    'buyerVatNumber'
  ];
  for (let i = 0; i < stringFields.length; i++) {
    if (!isValidString(model, stringFields[i])) invalids.push(stringFields[i]);
  }

  if (!isValidArray(model, 'items')) invalids.push('items');
  if (isValidArray(model, 'items')) {
    for (let i = 0; i < model.items.length; i++) {
      const item = model.items[i];
      if (!isValidString(item, 'description')) invalids.push(`items[${i}].description`);
      if (!isValidString(item, 'unit')) invalids.push(`items[${i}].unit`);
      if (!isValidDecimal(item, 'price')) invalids.push(`items[${i}].price`);
      if (!isValidDecimal(item, 'quantity')) invalids.push(`items[${i}].quantity`);
    }
  }

  return invalids;
}

const fullDateFormat = 'DD.MM.YYYY. HH:mm:ss';
const shortDateFormat = 'DD.MM.YYYY.';

const formatMoney = (amount, divisor) => {
  const value = !!divisor ? (amount / divisor) : amount;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

const formatDecimal = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const buildDataModel = (requestModel) => {

  const model = JSON.parse(JSON.stringify(requestModel));

  const now = dayjs().utc();
  const eom = dayjs().year(model.invoiceYear).month(model.invoiceMonth - 1).endOf('month');
  const fin = `${model.invoiceId}-1-1`;

  // enrich model
  model.invoiceNumber = fin;
  model.invoiceDate = now.format(fullDateFormat);
  model.placeOfIssue = `${model.sellerCity}, ${model.sellerCountry}`;
  model.deliveryDate = eom.format(shortDateFormat);
  model.dueDate = eom.add(15, 'day').format(shortDateFormat);
  model.referenceNumber = `${model.invoiceYear}-${fin}`;

  // calculate totals
  model.grandTotal = 0;
  for (let i = 0; i < model.items.length; i++) {
    const praw = model.items[i].price * 100;
    const qraw = model.items[i].quantity * 100;
    const raw = praw * qraw;
    if (!Number.isInteger(praw) || !Number.isInteger(qraw) || !Number.isInteger(raw)) {
      throw new Error('invalid total calculation');
    }
    model.items[i].subTotal = raw;
    model.grandTotal += raw;
  }
  
  // fix decimal commas
  model.grandTotal = formatMoney(model.grandTotal, 10000);
  for (let i = 0; i < model.items.length; i++) {
    model.items[i].price = formatMoney(model.items[i].price, null);
    model.items[i].quantity = formatDecimal(model.items[i].quantity);
    model.items[i].subTotal = formatMoney(model.items[i].subTotal, 10000);
  }

  return model;
}

module.exports = {
  validateDataModel,
  buildDataModel
}
