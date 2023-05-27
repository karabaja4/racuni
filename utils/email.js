const fs = require('fs');
const path = require('path');
const pdfparse = require('pdf-parse');
const nodemailer = require('nodemailer');
const dayjs = require('dayjs');
const chalk = require('chalk');
const util = require('util');
const validator = require("email-validator");
const colorize = require('json-colorizer');
dayjs.extend(require('dayjs/plugin/customParseFormat'));
const emails = require('./emails.json').emails;
const homedir = require('os').homedir();

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const question = util.promisify(rl.question).bind(rl);

const error = (text) => {
  console.log(chalk.red(text));
  process.exit(1);
}

if (!emails) {
  error('Cannot load emails.json');
}

const main = async () => {

  // load
  const invoices = [];
  const dir = `${homedir}/downloads`;
  let files = null;
  try {
    files = await fs.promises.readdir(dir);
  } catch (e) {
    error(e.message);
  }
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    if (filename.endsWith('.pdf')) {
      const fullpath = path.join(dir, filename);
      const buffer = await fs.promises.readFile(fullpath);
      const data = await pdfparse(buffer);
      const lines = data.text.split('\n').filter(x => x);
      if (lines[0] === 'Račun (Invoice)') {
        invoices.push({
          filename: filename,
          fullpath: fullpath,
          lines: lines
        });
      }
    }
  }
  if (invoices.length !== 1) {
    error('More than one invoice found!');
  }

  // process
  const getValue = (lines, label) => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(label)) {
        return lines[i].replace(label, '');
      }
    }
    error(`Cannot find line with label ${label}`);
  }

  const invoice = invoices[0];

  const amount = getValue(invoice.lines, 'Ukupan iznos naplate (Grand total): ');
  const invoiceNumber = getValue(invoice.lines, 'Broj računa (Invoice number):');
  const dateText = getValue(invoice.lines, 'Datum isporuke (Delivery date):');

  console.log(chalk.blue(`Invoice ${invoiceNumber} for ${amount}`));
 
  const date = dayjs(dateText, 'DD.MM.YYYY.');
  if (!date.isValid()) {
    error('Cannot parse delivery date!');
  }

  const dict = {
    monthnumber: date.month() + 1,
    monthname: date.format('MMMM'),
    year: date.year(),
    invoicenumber: invoiceNumber
  };

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    // validate
    if (!email.name || !email.sender || !email.password ||
        !email.recipient || !email.message || !email.subject ||
        !validator.validate(email.sender) ||
        !validator.validate(email.recipient)) {
      error('Invalid email data!');
    }
    for (let key in dict) {
      email.message = email.message.replace(`{${key}}`, dict[key]);
      email.subject = email.subject.replace(`{${key}}`, dict[key]);
    }
    email.attachments = [{
      filename: invoice.filename,
      path: invoice.fullpath
    }];
    await send(email);
  }
  rl.close();
}

const send = async (email) => {
  console.log('Email to send:');
  const mail = {
    from: `"${email.name}" <${email.sender}>`,
    to: email.recipient,
    subject: email.subject,
    text: email.message,
    attachments: email.attachments
  };
  console.log(colorize(JSON.stringify(mail, null, 2)));
  const answer = await question('Send this email? [y/N] ');
  if (answer.trim().toLowerCase() == 'y') {
    const transport = {
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        user: email.sender,
        pass: email.password,
      },
      tls: {
        ciphers: 'SSLv3'
      }
    };
    const transporter = nodemailer.createTransport(transport);
    const info = await transporter.sendMail(mail);
    console.log(chalk.blue(`Message sent to ${email.recipient}\n${info.messageId}`));
  } else {
    console.log(chalk.red('Email NOT sent.'));
  }
}

main();