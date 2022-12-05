const dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc')
dayjs.extend(utc);

const isValidString = (data, field) => {
  return !!data[field] && typeof data[field] === 'string' && data[field].length > 0 && data[field].length <= 200;
}

const isValidInteger = (data, field) => {
  return !!data[field] && Number.isInteger(data[field]) && data[field] > 0 && data[field] <= 100000000;
}

const isValidNumber = (data, field) => {
  return !!data[field] && typeof data[field] === 'number' && data[field] > 0 && data[field] <= 100000000;
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
      if (!isValidNumber(item, 'price')) invalids.push(`items[${i}].price`);
      if (!isValidInteger(item, 'quantity')) invalids.push(`items[${i}].quantity`);
    }
  }

  return invalids;
}

const fullDateFormat = 'DD.MM.YYYY. HH:mm:ss';
const shortDateFormat = 'DD.MM.YYYY.';

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
    const subTotal = parseFloat(model.items[i].price) * parseInt(model.items[i].quantity);
    model.items[i].subTotal = subTotal.toFixed(2);
    model.grandTotal += subTotal;
  }
  model.grandTotal = model.grandTotal.toFixed(2);

  // fix decimal commas
  model.grandTotal = model.grandTotal.replace('.', ',');
  for (let i = 0; i < model.items.length; i++) {
    model.items[i].price = model.items[i].price.toFixed(2).replace('.', ',');
    model.items[i].subTotal = model.items[i].subTotal.replace('.', ',');
  }

  return model;
}

module.exports = {
  validateDataModel,
  buildDataModel
}
