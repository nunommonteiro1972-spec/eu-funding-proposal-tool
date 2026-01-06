import fs from 'fs';
let content = fs.readFileSync('deploy-functions.mjs', 'utf8');
content = content.replace(
    "const indexPath = join(functionDir, 'index.ts');",
    "const indexPath = name === 'server' ? join(functionDir, 'bundle.ts') : join(functionDir, 'index.ts');"
);
fs.writeFileSync('deploy-functions.mjs', content);
console.log('Updated deploy-functions.mjs');
