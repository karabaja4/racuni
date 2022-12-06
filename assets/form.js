var inputIds = [
  'invoiceId',
  'invoiceMonth',
  'invoiceYear',
  'logoUrl',
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

var itemInputIds = [
  'itemDescription',
  'itemUnit',
  'itemPrice',
  'itemQuantity'
];

function addInputNumberValidation(ids, validateInteger) {
  for (var i = 0; i < ids.length; i++) {
    var input = document.getElementById(ids[i]);
    input.addEventListener('keypress', function(event) {
      var regex = /^[0-9]$/i;
      var validNumber = regex.test(event.key);
      if (validNumber) {
        return;
      }
      if (!validateInteger) {
        var validDot = event.key === '.' && (this.value !== '' && this.value.indexOf('.') === -1);
        if (validDot) {
          return;
        }
      }
      event.preventDefault();
    });
    input.addEventListener('paste', function(event) {
      event.preventDefault();
    });
  }
}

var integerIds = [
  'invoiceId',
  'invoiceMonth',
  'invoiceYear',
  'itemQuantity'
];

var floatIds = [
  'itemPrice'
];

addInputNumberValidation(integerIds, true);
addInputNumberValidation(floatIds, false);

function lsGet(key) {
  try {
    if (window.localStorage) {
      return localStorage.getItem(key);
    }
  } catch (err) {}
  return null;
}

function lsSet(key, value) {
  try {
    if (window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (err) {}
}

window.addEventListener('load', function() {
  var json = lsGet('invoiceJson');
  if (json) {
    var parsed = JSON.parse(json);
    for (var i = 0; i < inputIds.length; i++) {
      var inputId = inputIds[i];
      var value = parsed[inputId];
      if (value !== null && value !== undefined) {
        document.getElementById(inputId).value = value;
      }
    }
    for (var i = 0; i < itemInputIds.length; i++) {
      var itemInputId = itemInputIds[i];
      var realId = itemInputId.replace('item', '').toLowerCase();
      var value = parsed.items[0][realId];
      if (value !== null && value !== undefined) {
        document.getElementById(itemInputId).value = value;
      }
    }
  }
});

function getJson() {
  var result = {};
  for (var i = 0; i < inputIds.length; i++) {
    var inputId = inputIds[i];
    if (integerIds.indexOf(inputId) > -1) {
      result[inputId] = parseInt(document.getElementById(inputId).value);
    } else {
      result[inputId] = document.getElementById(inputId).value;
    }
  }
  result.items = [{
    description: document.getElementById('itemDescription').value,
    unit: document.getElementById('itemUnit').value,
    price: parseFloat(document.getElementById('itemPrice').value),
    quantity: parseInt(document.getElementById('itemQuantity').value)
  }];
  return JSON.stringify(result);
}

function showErrors(message) {
  var parsed = JSON.parse(message);
  for (let i = 0; i < parsed.errors.length; i++) {
    var field = parsed.errors[i].split(' ')[1];
    if (field.indexOf('items[0].') > -1) {
      field = field.replace('items[0].', '');
      field = field.charAt(0).toUpperCase() + field.slice(1);
      field = 'item' + field;
    }
    var elem = document.getElementById(field);
    if (elem) {
      elem.classList.add('invalid');
    }
  }
}

function removeErrors() {
  var elems = document.getElementsByTagName('input');
  for (let i = 0; i < elems.length; i++) {
    elems[i].classList.remove('invalid');
  }
}

document.getElementById('submitButton').addEventListener('click', function () {

  var btn = this;
  if (btn.classList.contains('disabled')) {
    return;
  }

  removeErrors();
  btn.classList.add('disabled');
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/generate', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.responseType = 'arraybuffer';

  var json = getJson();
  var parsed = JSON.parse(json);

  xhr.onload = function () {
    if (this.status === 200) {
      lsSet('invoiceJson', json);
      var blob = new Blob([this.response], { type: 'application/pdf' });
      var filename = parsed.invoiceYear + '-' + parsed.invoiceId + '-1-1.pdf';
      if (window.navigator && window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, filename);
      } else {
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
      }
    } else if (this.status === 400) {
      var decoded = new TextDecoder().decode(this.response);
      showErrors(decoded);
    } else {
      alert('Unexpected error: ' + this.status);
    }
    btn.classList.remove('disabled');
  };
  xhr.send(json);
  
});