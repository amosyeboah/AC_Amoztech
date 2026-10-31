const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'src', 'engine', 'accountingEngine.js');
const destPath = path.join(__dirname, '..', 'public', 'engine.js');

let code = fs.readFileSync(srcPath, 'utf8');
code = code.replace('module.exports = {', 'const _exports = {');
code += `
if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  window.accountingEngine = _exports;
}
`;

fs.writeFileSync(destPath, code, 'utf8');
console.log('Successfully wrote public/engine.js, bytes:', fs.statSync(destPath).size);
