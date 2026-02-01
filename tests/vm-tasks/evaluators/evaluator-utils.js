const fs = require('fs');

const output = {
  pass: (reason) => {
    console.log(`PASS: ${reason}`);
    process.exit(0);
  },
  fail: (reason) => {
    console.log(`FAIL: ${reason}`);
    process.exit(1);
  },
};

const readFileTrimmed = (filePath) => {
  if (!fs.existsSync(filePath)) {
    output.fail(`Expected file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8').trimEnd();
};

module.exports = {
  output,
  readFileTrimmed,
};
