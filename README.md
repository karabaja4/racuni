# 📝 Računi (Invoices)

### Croatian

Generiranje računa za hrvatsku tvrtku, u sustavu PDV-a, za usluge izvan Hrvatske (unutar ili izvan EU).

Aplikacija dostupna na: https://racuni.aerium.hr

Korištenje na vlastitu odgovornost, pod uvjetima [MIT licence](https://github.com/karabaja4/racuni/blob/master/LICENSE).

***

### English

Invoice generation for a Croatian company, VAT registered, for services outside Croatia (inside or outside EU).

The application is available on: https://racuni.aerium.hr

Use at your own risk, under the conditions of [MIT licence](https://github.com/karabaja4/racuni/blob/master/LICENSE).

## 🔌 API Documentation

API is available for public use:

**Url**
```nginx
POST https://racuni.aerium.hr/generate
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
  
  "logoUrl": "https://avacyn.aerium.hr/radiance/oblak.svg",
  
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

### Validation and error handling

Validation rules:

* `invoiceId` must be an integer.
* `invoiceMonth` must be an integer between 1 and 12.
* `invoiceYear` must be an integer representing a year, but not earlier than last year.
* `items[]` array can contain at most 5 items.
* `items[].price` must be a decimal with at most 2 decimals, e.g. `400.55`.
* `items[].quantity` must be a decimal with at most 2 decimals, e.g. `1.75`.
* All string lengths must be less than or equal to 200 characters.

If there are errors in the request body, the response will return the list of invalid fields, for example:

```json
{
  "errors": [
    "Field invoiceYear is invalid.",
    "Field sellerName is invalid."
  ]
}
```
The HTTP status code in this case is 400.

## 📸 Screenshot

![Alt text](https://user-images.githubusercontent.com/1043015/210459104-2bdcd361-4271-47a8-acdc-71ccdea5d373.png)
