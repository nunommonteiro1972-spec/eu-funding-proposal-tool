import fs from 'fs';
const lines = fs.readFileSync('deploy-functions.mjs', 'utf8').split('\n');
console.log('--- LINES 1-50 ---');
console.log(lines.slice(0, 50).join('\n'));
console.log('--- LINES 51-100 ---');
console.log(lines.slice(50, 100).join('\n'));
