const hexToUtf8 = (hex) => {
  return decodeURIComponent('%' + hex.match(/.{1,2}/g).join('%'));
};

const renderBarcode = () => {
  const canvas = document.getElementsByClassName('barcode')[0];
  const data = hexToUtf8(canvas.getAttribute('data-barcode'));
  PDF417.draw(data, canvas, 3.5, -1, 1);
};

renderBarcode();