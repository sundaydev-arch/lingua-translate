const path = require('path');
const Mocha = require('mocha');

exports.run = async function run() {
  const mocha = new Mocha({ ui: 'tdd', timeout: 30000 });
  mocha.addFile(path.join(__dirname, 'extension.test.js'));
  await new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) reject(new Error(`${failures} integration test(s) failed`));
      else resolve();
    });
  });
};
