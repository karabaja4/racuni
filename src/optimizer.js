const os = require('node:os');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const log = require('./log');

const optimize = async (pdfBuffer) => {
  
  try {
    
    const tmpdir = os.tmpdir();
    const basename = crypto.randomBytes(16).toString('hex');
    const sourceFile = path.join(tmpdir, `in-${basename}.pdf`);
    const destFile = path.join(tmpdir, `out-${basename}.pdf`);
    
    await fs.promises.writeFile(sourceFile, pdfBuffer);
    await exec(`/usr/bin/qpdf --empty --pages ${sourceFile} -- ${destFile}`);
    const optimizedPdfBuffer = await fs.promises.readFile(destFile);
    
    // cleanup
    await fs.promises.unlink(sourceFile);
    await fs.promises.unlink(destFile);
    
    log.info(`Successfully optimized PDF (${pdfBuffer.length} bytes -> ${optimizedPdfBuffer.length} bytes)`)
    
    return optimizedPdfBuffer;
    
  } catch (err) {
    
    log.error(err);
    return pdfBuffer; // return unmodified buffer on failure
    
  }
};

module.exports = {
  optimize
};