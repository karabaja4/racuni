"use strict";

function isValidInteger(value) {
  var regex = /^[0-9]+$/i;
  return regex.test(value);
}

function isValidDecimal(value) {
  var regex = /^[0-9]+(?:\.[0-9]{1,2})?$/i;
  return regex.test(value);
}

function addInputNumberValidation(input, isDecimal) {
  input.addEventListener('keypress', function(event) {
    if (isValidInteger(event.key)) {
      return;
    }
    // decimal, dot pressed, field not empty, field does not have a dot and cursor is not at start
    if (isDecimal && event.key === '.' && this.value !== '' && this.value.indexOf('.') === -1 && this.selectionStart > 0) {
      return;
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

function setupValidation() {
  var integers = document.querySelectorAll('input[data-type="integer"]');
  var i;
  for (i = 0; i < integers.length; i++) {
    addInputNumberValidation(integers[i], false);
  }
  var decimals = document.querySelectorAll('input[data-type="decimal"]');
  for (i = 0; i < decimals.length; i++) {
    addInputNumberValidation(decimals[i], true);
  }
}

// localStorage setup
var lsKey = 'invoiceJsonV2';

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

function restoreInputsFromLocalStorage() {
  var stored = lsGet(lsKey);
  if (stored) {
    var parsed = JSON.parse(stored);
    var elems = document.querySelectorAll('input');
    for (var i = 0; i < elems.length; i++) {
      var elem = elems[i];
      var map = elem.getAttribute('data-map');
      if (map && parsed[map]) {
        elem.value = parsed[map];
      }
    }
  }
}

// load stored values from localStorage to inputs
// and add input validation events
window.addEventListener('load', function() {
  restoreInputsFromLocalStorage();
  setupValidation();
});

// build request model from all the inputs based on data attributes
function buildRequestModel() {
  var result = {
    items: [{}]
  };
  var elems = document.querySelectorAll('input');
  for (var i = 0; i < elems.length; i++) {
    var elem = elems[i];
    var map = elem.getAttribute('data-map');
    var type = elem.getAttribute('data-type');
    if (map && type) {
      var idx = '[0].';
      if (map.indexOf(idx) === -1) {
        result[map] = (type === 'integer') ? parseInt(elem.value) : elem.value;
      } else {
        var prop = map.split(idx)[1];
        result.items[0][prop] = (type === 'decimal') ? parseFloat(elem.value) : elem.value;
      }
    }
  }
  return result;
}

// add invalid class to fields returned by the 400 response
function showErrors(message) {
  var parsed = JSON.parse(message);
  for (var i = 0; i < parsed.errors.length; i++) {
    var field = parsed.errors[i].field;
    var elem = document.querySelectorAll('input[data-map="' + field + '"]');
    if (elem && elem[0] && elem[0].classList) {
      elem[0].classList.add('invalid');
    }
  }
}

function clearErrors() {
  var elems = document.getElementsByTagName('input');
  for (var i = 0; i < elems.length; i++) {
    var elem = elems[i];
    if (elem.classList) {
      elem.classList.remove('invalid');
    }
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

// flatten out the sent request to be stored into localStorage
function flatten(obj) {
  var result = {};
  for (var objKey in obj) {
    var objValue = obj[objKey];
    if (!!objValue && objValue.constructor === Array) {
      for (var i = 0; i < objValue.length; i++) {
        var arrObj = objValue[i];
        for (var arrObjKey in arrObj) {
          result[objKey + '[' + i + '].' + arrObjKey] = arrObj[arrObjKey];
        }
      }
    } else {
      result[objKey] = objValue;
    }
  }
  return result;
}

document.getElementsByClassName('submit-button')[0].addEventListener('click', function () {
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
  var model = buildRequestModel();
  xhr.onload = function () {
    if (this.status === 200) {
      lsSet(lsKey, JSON.stringify(flatten(model)));
      var blob = new Blob([this.response], { type: 'application/pdf' });
      var filename = model.invoiceYear + '-' + model.invoiceId + '-1-1.pdf';
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
    } else if (this.status === 429) {
      alert('Too many requests. Try again in a few seconds.');
    } else {
      alert('Unexpected error: ' + this.status);
    }
    btn.classList.remove('disabled');
  };
  xhr.send(JSON.stringify(model));
});