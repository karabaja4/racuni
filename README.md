# 📝 Računi (Invoices)

### Croatian

Generiranje računa za hrvatsku tvrtku, u sustavu PDV-a, za usluge.

Aplikacija dostupna na: https://racuni.radiance.hr

Korištenje na vlastitu odgovornost, pod uvjetima [MIT licence](https://github.com/karabaja4/racuni/blob/master/LICENSE).

***

### English

Invoice generation for a Croatian company, VAT registered, for services.

The application is available on: https://racuni.radiance.hr

Use at your own risk, under the conditions of [MIT licence](https://github.com/karabaja4/racuni/blob/master/LICENSE).

## API Documentation

API is available for public use:

**Url**
```nginx
POST https://racuni.radiance.hr/generate
```

**Headers**
```json
{
  "Content-Type": "application/json"
}
```

**Body (JSON)**
```json
{
  "invoiceId": 1,
  "invoiceMonth": 4,
  "invoiceYear": 2022,
  
  "logoUrl": "https://avacyn.radiance.hr/radiance/oblak.svg",
  
  "sellerName": "Oblak d.o.o.",
  "sellerStreet": "Trg Bana Jelačića 1",
  "sellerPostCode": "10000",
  "sellerCity": "Zagreb",
  "sellerCountry": "Hrvatska (Croatia)",
  "sellerVatNumber": "HR47263538192",
  "sellerIBAN": "HR6347264928374615242",
  "sellerSWIFT": "ESBCHR22",
  "sellerBank": "Erste&Steiermärkische Bank d.d.",
  "sellerOperator": "Art Vandelay",
  
  "buyerName": "Evil Corp Ltd",
  "buyerStreet": "Sesame Street 1",
  "buyerPostCode": "20095",
  "buyerCity": "Hamburg",
  "buyerCountry": "Germany",
  "buyerVatNumber": "DE29937562531",
  
  "items": [
    {
      "description": "Software Development",
      "unit": "dan (day)",
      "price": 420,
      "quantity": 6
    },
    {
      "description": "Technical Support",
      "unit": "dan (day)",
      "price": 69,
      "quantity": 5
    }
  ]
}
```
The response is a binary file (PDF) with HTTP status code 200.

### VAT

VAT will be applied automatically, if a Croatian company is detected as the buyer. This will be true:

* If the buyer country is "Croatia" or "Hrvatska".
* If the buyer name contains "d.o.o".
* If the buyer VAT number starts with "HR".

If Croatian company is detected as the buyer, a PDF417 barcode will be included to facilitate mobile payments by scanning the code.

Read more about this on: [HUB 3A obrazac - specifikacija PDF417 barkoda](https://avacyn.radiance.hr/stuff/2DBK_EUR_Uputa_1.pdf)

### Validation and error handling

Validation rules:

* `invoiceId` must be an integer.
* `invoiceMonth` must be an integer between 1 and 12.
* `invoiceYear` must be an integer representing a year.
* `items[]` array can contain at most 5 items.
* `items[].price` must be a decimal with at most 2 decimals, e.g. `400.55`.
* `items[].quantity` must be a decimal with at most 2 decimals, e.g. `1.75`.
* All string lengths must be less than or equal to 80 characters.

If there are errors in the request body, the response will return the list of invalid fields, for example:

```json
{
  "errors": [
    {
      "field": "invoiceMonth",
      "message": "invoiceMonth must be a positive integer between 1 and 12."
    },
    {
      "field": "items[1].quantity",
      "message": "items[1].quantity must be a positive number, and can have at most 2 decimal places."
    }
  ]
}
```
The HTTP status code in this case is 400.

## Screenshots

### with VAT:
<p align="center">
  <img src="https://user-images.githubusercontent.com/1043015/281582487-d26fb763-5fe7-49cc-ad35-4af0bbf64ecf.png">
</p>

### without VAT:
<p align="center">
  <img src="https://user-images.githubusercontent.com/1043015/281582481-ac3cde23-ab07-4aca-80f7-34141d844e10.png">
</p>

## Dependencies

### Applications

* Chromium (`/usr/bin/chromium`) - for generating PDF via headless Chromium/Skia
* QPDF (`/usr/bin/qpdf`) - for PDF optimization and removing Chromium PDF metadata (Title, Creator etc.) _(optional)_

### System Fonts (TTF)

* Roboto
* DejaVu

Application is written for and tested on Linux only.

## References

https://github.com/pkoretic/pdf417-generator - PDF417 barcode generation
