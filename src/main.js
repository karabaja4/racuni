const path = require('node:path');
const crypto = require('node:crypto');
const proc = require('node:child_process');

const puppeteer = require('puppeteer-core');
const express = require('express');
const limiter = require('express-rate-limit');
const ejs = require('ejs');

const viewModel = require('./model');
const validator = require('./validator');

const port = 33198;
const app = express();

const errorResponse = (message) => {
  return {
    errors: [{ message: message }]
  };
};

const production = process.env.NODE_ENV?.toLowerCase() === 'production';
if (production) {
  app.set('trust proxy', 'loopback');
  const limit = limiter.rateLimit({
    windowMs: 10000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return res.status(429).send(errorResponse('Too many requests, please try again later.'));
    }
  });
  app.use('/generate', limit);
}

app.use(express.json());

const log = (message) => {
  var date = (new Date()).toISOString();
  console.log(`[${date}] ${message}`);
};

let revision = 'git';

app.get('/', async (request, response) => {
  
  try {
    
    const ejsPath = path.join(__dirname, 'form.ejs');
    const model = {
      vm: { revision: revision }
    };
    const html = await ejs.renderFile(ejsPath, model);
    return response.send(html);
    
  } catch (err) {
    
    log(err.stack);
    return response.status(500).send('Internal server error.');
    
  }
  
});

const jsonStore = {};

const getJsonHash = (json) => {
  return crypto.createHash('sha256').update(json).digest('hex');
};

app.post('/generate', async (request, response) => {

  try {

    if (!Object.keys(request.body).length) {
      return response.status(400).send(errorResponse('Unable to parse body JSON.'));
    }
  
    const result = validator.validate(request.body);
    if (!result.valid) {
      return response.status(400).send({
        errors: result.errors
      });
    }
  
    const model = viewModel.buildViewModel(request.body);
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
    response.set('Content-Disposition', `attachment; filename=${model.vm.filename}.pdf`);
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
    const ejsPath = path.join(__dirname, 'template.ejs');
    const model = JSON.parse(json);
    const html = await ejs.renderFile(ejsPath, model);
    return response.send(html);

  } catch (err) {

    log(err.stack);
    return response.status(500).send();

  }

});

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.get('/favicon.ico', (request, response) => response.status(204).send());

app.use((err, req, res, next) => {
  if (err?.stack) {
    log(err.stack);
  }
  if ((err instanceof SyntaxError) && (err.status === 400) && (err.type === 'entity.parse.failed')) {
    return res.status(400).send(errorResponse('Unable to parse body JSON.'));
  } else {
    return res.status(500).send(errorResponse('Unexpected error.'));
  }
});

app.listen(port, '127.0.0.1', () => {
  log(`The server is running on port ${port} in ${process.env.NODE_ENV || 'development'}`);
});

proc.exec('git rev-parse --short HEAD', { cwd: __dirname }, (err, stdout, stderr) => {
  if (!err && !stderr && stdout) {
    const rev = stdout.trim();
    if (rev && rev.length === 7) {
      revision = rev;
    }
  }
});