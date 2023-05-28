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

function isValidInteger(value) {
  var regex = /^[0-9]+$/i;
  return regex.test(value);
}

function isValidDecimal(value) {
  var regex = /^[0-9]+(?:\.[0-9]{1,2})?$/i;
  return regex.test(value);
}

function addInputNumberValidation(ids, isDecimal) {
  for (var i = 0; i < ids.length; i++) {
    var input = document.getElementById(ids[i]);
    input.addEventListener('keypress', function(event) {
      if (isValidInteger(event.key)) {
        return;
      }
      if (isDecimal) {
        var validDot = event.key === '.' &&
                       this.value !== '' &&
                       this.value.indexOf('.') === -1 &&
                       this.selectionStart > 0;
        if (validDot) {
          return;
        }
      }
      event.preventDefault();
    });
    input.addEventListener('paste', function(event) {
      var text = null;
      if (event.clipboardData && event.clipboardData.getData) {
        text = event.clipboardData.getData('text/plain');
      } else if (window.clipboardData && window.clipboardData.getData) {
        text = window.clipboardData.getData('Text'); // IE
      }
      if (!text) {
        event.preventDefault();
      }
      var isValid = isDecimal ? isValidDecimal(text) : isValidInteger(text);
      if (!isValid) {
        event.preventDefault();
      }
    });
  }
}

var integerIds = [
  'invoiceId',
  'invoiceMonth',
  'invoiceYear'
];

var decimalIds = [
  'itemPrice',
  'itemQuantity'
];

addInputNumberValidation(integerIds, false);
addInputNumberValidation(decimalIds, true);

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
      var val = parsed[inputId];
      if (val !== null && val !== undefined) {
        document.getElementById(inputId).value = val;
      }
    }
    for (var j = 0; j < itemInputIds.length; j++) {
      var itemInputId = itemInputIds[j];
      var realId = itemInputId.replace('item', '').toLowerCase();
      var ival = parsed.items[0][realId];
      if (ival !== null && ival !== undefined) {
        document.getElementById(itemInputId).value = ival;
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
    quantity: parseFloat(document.getElementById('itemQuantity').value)
  }];
  return JSON.stringify(result);
}

function showErrors(message) {
  var parsed = JSON.parse(message);
  for (var i = 0; i < parsed.errors.length; i++) {
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

function clearErrors() {
  var elems = document.getElementsByTagName('input');
  for (var i = 0; i < elems.length; i++) {
    elems[i].classList.remove('invalid');
  }
}

function arrayBufferToString(buffer) {
  if (window.TextEncoder) {
    return new TextDecoder().decode(buffer);
  }
  // IE
  var arr = new Uint8Array(buffer);
  var str = String.fromCharCode.apply(String, arr);
  return str;
}

document.getElementById('submitButton').addEventListener('click', function () {

  var btn = this;
  if (btn.classList.contains('disabled')) {
    return;
  }

  clearErrors();
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
        window.navigator.msSaveBlob(blob, filename); // IE
      } else {
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
      }
    } else if (this.status === 400) {
      var decoded = arrayBufferToString(this.response);
      showErrors(decoded);
    } else {
      alert('Unexpected error: ' + this.status);
    }
    btn.classList.remove('disabled');
  };
  xhr.send(json);
  
});