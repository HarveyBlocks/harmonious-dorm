const fs = require('fs');

const file = 'lib/i18n/ui-texts.data.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const errors = [];

for (const [key, value] of Object.entries(data)) {
  if (!value || typeof value !== 'object') continue;
  for (const lang of ['zh-CN', 'zh-TW']) {
    const text = String(value[lang] || '');
    if (!text) continue;
    if (text.includes('????') || text.includes('?')) {
      errors.push(`${key}.${lang} contains mojibake placeholder`);
    }
  }
}

if (errors.length > 0) {
  console.error('[i18n-integrity] FAILED');
  for (const err of errors) console.error(' -', err);
  process.exit(1);
}

console.log('[i18n-integrity] OK');
