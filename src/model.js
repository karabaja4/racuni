const hex = require('./hex');

// dayjs
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const max = 1000000;

const isValidString = (data, field) => {
  return !!data[field] && typeof data[field] === 'string' && data[field].length > 0 && data[field].length <= 200;
};

const isValidInteger = (data, field) => {
  return !!data[field] && Number.isInteger(data[field]) && data[field] > 0 && data[field] <= max;
};

const isValidDecimal = (data, field) => {
  if (!data[field] || typeof data[field] !== 'number' || data[field] <= 0 || data[field] > max) {
    return false;
  }
  const str = data[field].toString();
  const regex = /^[0-9]+(?:\.[0-9]{1,2})?$/;
  if (!regex.test(str)) {
    return false;
  }
  return true;
};

const isValidArray = (data, field) => {
  return !!data[field] && Array.isArray(data[field]) && data[field].length > 0 && data[field].length <= 5;
};

const getNow = () => {
  return dayjs().tz("Europe/Zagreb");
};

const validateDataModel = (model) => {

  const invalids = [];
  if (!model) invalids.push('body');
  if (!isValidInteger(model, 'invoiceId')) invalids.push('invoiceId');
  if (!isValidInteger(model, 'invoiceMonth') || model.invoiceMonth > 12) invalids.push('invoiceMonth');
  if (!isValidInteger(model, 'invoiceYear') || model.invoiceYear < (getNow().year() - 1) || model.invoiceYear > 2100) invalids.push('invoiceYear');

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
};

const fullDateFormat = 'DD.MM.YYYY. HH:mm';
const shortDateFormat = 'DD.MM.YYYY.';

const formatMoney = (amount, divisor) => {
  const value = !!divisor ? (amount / divisor) : amount;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

const formatDecimal = (amount) => {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatVat = (vatNumber) => {
  return vatNumber.replace(/\s/g, '').toUpperCase();
};

const isMine = (model) => {
  return formatVat(model.sellerVatNumber) === 'HR21522318070';
};

const buildDataModel = (requestModel) => {

  const now = getNow();
  const model = JSON.parse(JSON.stringify(requestModel));

  const eom = now.year(model.invoiceYear).month(model.invoiceMonth - 1).endOf('month');
  const fin = `${model.invoiceId}-1-1`;
  const mine = isMine(model);

  // enrich model
  model.invoiceNumber = fin;

  // invoice date
  const invoiceDate = (mine && now.isAfter(eom)) ? eom.startOf('day').add(16, 'hour') : now;
  const utcOffset = Math.round(invoiceDate.utcOffset() / 60);
  model.invoiceDate = `${invoiceDate.format(fullDateFormat)} (UTC${(utcOffset > 0 ? `+${utcOffset}` : utcOffset) || ''})`;

  model.placeOfIssue = `${model.sellerCity}, ${model.sellerCountry}`;
  model.deliveryDate = eom.format(shortDateFormat);
  model.dueDate = eom.add(15, 'day').format(shortDateFormat);
  model.referenceNumber = `${model.invoiceYear}-${fin}`;

  // Dublin has postcode after city, e.g. "Dublin 7"
  if (model.buyerCity.toLowerCase() === 'dublin') {
    const pc = model.buyerPostCode;
    model.buyerPostCode = model.buyerCity;
    model.buyerCity = pc;
  }

  // calculate totals
  model.grandTotal = 0;
  for (let i = 0; i < model.items.length; i++) {
    const praw = Math.round(model.items[i].price * 100);
    const qraw = Math.round(model.items[i].quantity * 100);
    const raw = praw * qraw;
    model.items[i].subTotal = raw;
    model.grandTotal += raw;
  }

  // show barcode only for croatian customers
  const buyerFrom = model.buyerCountry.toLowerCase();
  const isCroatian = formatVat(model.buyerVatNumber).startsWith("HR") ||
                     buyerFrom.includes("hrvatska") ||
                     buyerFrom.includes("croatia") ||
                     model.buyerName.replace(/\s/g, '').includes('d.o.o');
  if (isCroatian) {

    const croatianVat = 0.25;
    const vatAmount = model.grandTotal * croatianVat;
    const referenceNumber = `HR00 ${model.invoiceId}-1-1`;

    model.vat = {
      percentage: formatDecimal(Math.round(croatianVat * 100)) + ' %',
      referenceNumber: referenceNumber,
      barcodeData: buildBarcodeData(model, referenceNumber),
      grandTotalVatBase: formatMoney(model.grandTotal, 10000),
      vatAmount: formatMoney(vatAmount, 10000)
    };

    model.grandTotal += vatAmount;
    
  } else {
    model.vat = null;
  }
  
  // format money
  model.grandTotal = formatMoney(model.grandTotal, 10000);
  for (let i = 0; i < model.items.length; i++) {
    model.items[i].price = formatMoney(model.items[i].price, null);
    model.items[i].quantity = formatDecimal(model.items[i].quantity);
    model.items[i].subTotal = formatMoney(model.items[i].subTotal, 10000);
  }

  return model;
};

const bcrow = (text, limit) => {
  return text.toUpperCase().substring(0, limit) + '\n';
};

// https://avacyn.radiance.hr/stuff/2DBK_EUR_Uputa_1.pdf
const buildBarcodeData = (model, referenceNumber) => {
  // grandTotal is multiplied by 10000 here
  const amount = Math.round(model.grandTotal / 100);
  let data = '';
  data += bcrow('HRVHUB30', 8);                                          // 8
  data += bcrow('EUR', 3);                                               // 3
  data += bcrow(amount.toString().padStart(15, '0'), 15);                // 15
  data += bcrow(model.buyerName, 30);                                    // 30
  data += bcrow(model.buyerStreet, 27);                                  // 27
  data += bcrow(`${model.buyerPostCode} ${model.buyerCity}`, 27);        // 27
  data += bcrow(model.sellerName, 25);                                   // 25
  data += bcrow(model.sellerStreet, 25);                                 // 25
  data += bcrow(`${model.sellerPostCode} ${model.sellerCity}`, 27);      // 27
  data += bcrow(model.sellerIBAN, 21);                                   // 21
  data += bcrow(referenceNumber.split(' ')[0], 4);                       // 4
  data += bcrow(referenceNumber.split(' ')[1], 22);                      // 22
  data += bcrow('', 4);                                                  // 4
  data += bcrow(`RAČUN ${model.invoiceNumber}`, 35);                     // 35
  return hex.stringToHex(data.trim());
};

module.exports = {
  validateDataModel,
  buildDataModel
};
