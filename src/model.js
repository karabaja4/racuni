// dayjs
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

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

const isMine = (vatNumber) => {
  return formatVat(vatNumber) === 'HR21522318070';
};

const buildViewModel = (requestModel) => {

  const now = dayjs().tz("Europe/Zagreb");
  const model = JSON.parse(JSON.stringify(requestModel));

  const eom = now.year(model.invoiceYear).month(model.invoiceMonth - 1).endOf('month');
  const fin = `${model.invoiceId}-1-1`;
  const mine = isMine(model.sellerVatNumber);

  // start model calculations
  model.invoiceNumber = fin;

  // invoice date
  const invoiceDate = (mine && now.isAfter(eom)) ? eom.startOf('day').add(16, 'hour').add(Math.floor(Math.random() * 60), 'minute') : now;
  const utcOffset = Math.round(invoiceDate.utcOffset() / 60);
  model.invoiceDate = `${invoiceDate.format(fullDateFormat)} (UTC${(utcOffset > 0 ? `+${utcOffset}` : utcOffset) || ''})`;

  model.placeOfIssue = `${model.sellerCity}, ${model.sellerCountry}`;
  model.deliveryDate = eom.format(shortDateFormat);
  model.dueDate = eom.add(15, 'day').format(shortDateFormat);
  model.filename = `${model.invoiceYear}-${fin}`;

  // Dublin has postcode after city, e.g. "Dublin 7"
  if (model.buyerCity.toLowerCase().includes('dublin')) {
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
  const buyerName = model.buyerName.replace(/\s/g, '').toLowerCase();
  const isCroatian = formatVat(model.buyerVatNumber).startsWith("HR") ||
                     buyerFrom.includes("hrvat") ||
                     buyerFrom.includes("croat") ||
                     buyerName.includes('d.o.o');
                     
  if (isCroatian) {
    const croatianVat = 0.25;
    const vatAmount = model.grandTotal * croatianVat;

    model.vat = {
      percentage: formatDecimal(Math.round(croatianVat * 100)) + ' %',
      referenceNumber: `HR00 ${fin}`,
      barcodeData: null,
      grandTotalVatBase: formatMoney(model.grandTotal, 10000),
      vatAmount: formatMoney(vatAmount, 10000)
    };

    model.grandTotal += vatAmount;
    model.vat.barcodeData = buildBarcodeData(model);
    
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

  return {
    vm: model
  };
};

const bcrow = (text, limit) => {
  return text.toUpperCase().substring(0, limit) + '\n';
};

const stringToHex = (str) => {
  return Buffer.from(str, 'utf8').toString('hex');
};

// https://avacyn.radiance.hr/stuff/2DBK_EUR_Uputa_1.pdf
const buildBarcodeData = (model) => {
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
  data += bcrow(model.vat.referenceNumber.split(' ')[0], 4);             // 4
  data += bcrow(model.vat.referenceNumber.split(' ')[1], 22);            // 22
  data += bcrow('', 4);                                                  // 4
  data += bcrow(`RAČUN ${model.invoiceNumber}`, 35);                     // 35
  return stringToHex(data.trim());
};

module.exports = {
  buildViewModel
};
