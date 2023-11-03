const path = require('node:path');
const crypto = require('node:crypto');

const puppeteer = require('puppeteer-core');
const express = require('express');
const limiter = require('express-rate-limit');
const ejs = require('ejs');

const { validateDataModel, buildDataModel } = require('./model');

const port = 33198;
const app = express();

const production = process.env.NODE_ENV?.toLowerCase() === 'production';
if (production) {
  app.set('trust proxy', 'loopback');
  const limit = limiter.rateLimit({
    windowMs: 10000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/generate', limit);
}

app.use(express.json());

const log = (message) => {
  var date = (new Date()).toISOString();
  console.log(`[${date}] ${message}`);
};

app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, '/form.html'));
});

const validate = (model) => {
  const errors = [];
  const invalids = validateDataModel(model);
  for (let i = 0; i < invalids.length; i++) {
    errors.push(`Field ${invalids[i]} is invalid.`);
  }
  return errors;
};

const jsonStore = {};

const getJsonHash = (json) => {
  return crypto.createHash('sha256').update(json).digest('hex');
};

app.post('/generate', async (request, response) => {

  try {

    if (!Object.keys(request.body).length) {
      return response.status(400).send({
        errors: ['Unable to parse JSON.']
      });
    }
  
    const errors = validate(request.body);
    if (errors.length) {
      return response.status(400).send({
        errors: errors
      });
    }
  
    const model = buildDataModel(request.body);
    const json = JSON.stringify(model);

    const jsonHash = getJsonHash(json);
    jsonStore[jsonHash] = json;
  
    log(`Generating (${jsonHash}): ${json}`);
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      headless: true
    });
  
    const page = await browser.newPage();
    const status = await page.goto(`http://localhost:${port}/render?hash=${jsonHash}`);
    if (!status.ok()) {
      throw new Error(`Failed to render (${status.status()})`);
    }
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true
    });
  
    await browser.close();
  
    response.set('Content-Type', 'application/pdf');
    response.set('Content-Disposition', `attachment; filename=${model.referenceNumber}.pdf`);
    response.set('Content-Length', pdf.length);
    response.send(pdf);

  } catch (err) {

    log(err.stack);
    return response.status(500).send({
      errors: ['Internal server error.']
    });

  }

});

app.get('/render', async (request, response) => {

  try {
    const jsonHash = request.query.hash;
    const json = jsonStore[jsonHash];
    if (!json) {
      throw new Error(`JSON with ${jsonHash} not found.`);
    }
    if (production) {
      delete jsonStore[jsonHash];
    }
    const model = JSON.parse(json);
  
    const templatePath = path.join(__dirname, 'template.ejs');
  
    const html = await ejs.renderFile(templatePath, model);
    return response.send(html);

  } catch (err) {

    log(err.stack);
    return response.status(500).send();

  }

});

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.get('/favicon.ico', (request, response) => response.status(204).send());

app.listen(port, '127.0.0.1', () => {
  log(`The server is running on port ${port} in ${process.env.NODE_ENV || 'development'}`);
});
