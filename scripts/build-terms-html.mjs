/**
 * Generates static HTML terms pages (no client JS).
 * Run from repo root: node scripts/build-terms-html.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docs = join(root, 'docs');

const LANG_ORDER = [
  'en', 'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'pt', 'ru', 'ur',
  'id', 'de', 'ja', 'sw', 'mr', 'te', 'tr', 'ko', 'vi', 'it'
];

const ctx = { window: {} };
runInNewContext(readFileSync(join(__dirname, 'terms-i18n.js'), 'utf8'), ctx);
const TERMS_I18N = ctx.window.TERMS_I18N;
const EN_BUNDLE = TERMS_I18N.en;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBlocks(blocks) {
  let html = '';
  for (const block of blocks || []) {
    if (block.type === 'p') {
      html += `        <p>${escapeHtml(block.text)}</p>\n`;
    } else if (block.type === 'ul') {
      html += '        <ul>\n';
      for (const item of block.items || []) {
        html += `          <li>${escapeHtml(item)}</li>\n`;
      }
      html += '        </ul>\n';
    }
  }
  return html;
}

function renderSections(sections) {
  let html = '';
  for (const sec of sections || []) {
    html += '      <section>\n';
    html += `        <h2>${escapeHtml(sec.title)}</h2>\n`;
    html += renderBlocks(sec.blocks);
    html += '      </section>\n';
  }
  return html;
}

function navHtml(currentCode, ariaLabel) {
  const items = LANG_ORDER.filter((code) => TERMS_I18N[code])
    .map((code) => {
      const name = TERMS_I18N[code].nativeName || code;
      const current = code === currentCode ? ' aria-current="page"' : '';
      return `          <li><a href="${code}.html"${current}>${escapeHtml(name)}</a></li>`;
    })
    .join('\n');
  return `        <nav class="lang-nav" aria-label="${escapeHtml(ariaLabel)}">\n          <ul>\n${items}\n          </ul>\n        </nav>\n`;
}

function pageHtml(code, bundle) {
  const normalized = {
    ...bundle,
    title: EN_BUNDLE.title,
    metaDescription: EN_BUNDLE.metaDescription,
    effective: EN_BUNDLE.effective,
    product: EN_BUNDLE.product,
    intro: EN_BUNDLE.intro,
    footerNote: EN_BUNDLE.footerNote,
    sections: EN_BUNDLE.sections
  };

  const lang = normalized.htmlLang || code;
  const dir = normalized.dir || 'ltr';
  const productBlock = normalized.product
    ? `        <p class="effective">${escapeHtml(normalized.product)}</p>\n`
    : '';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}" dir="${escapeHtml(dir)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(normalized.metaDescription || normalized.title)}" />
    <title>${escapeHtml(normalized.title)}</title>
    <link rel="stylesheet" href="terms/styles.css" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="wrap">
      <header>
${navHtml(code, normalized.selectLabel || 'Languages')}
        <h1>${escapeHtml(normalized.title)}</h1>
        <p class="effective">${escapeHtml(normalized.effective)}</p>
${productBlock}      </header>
      <main id="main">
        <p class="intro">${escapeHtml(normalized.intro)}</p>
${renderSections(normalized.sections)}
        <footer>
          <p>${escapeHtml(normalized.footerNote || '')}</p>
          <p>${escapeHtml(normalized.contactLabel || 'Contact')}: <a class="contact-email" href="mailto:supp0rt.serg@yandex.com">supp0rt.serg@yandex.com</a></p>
        </footer>
      </main>
    </div>
  </body>
</html>
`;
}

function hubHtml() {
  const items = LANG_ORDER.filter((code) => TERMS_I18N[code])
    .map((code) => {
      const b = TERMS_I18N[code];
      return `        <li><a href="${code}.html">${escapeHtml(b.nativeName || code)} — ${escapeHtml(b.title)}</a></li>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Tandem AI Chat — Terms of Use. Pick a language." />
    <title>Tandem AI Chat — Terms of Use</title>
    <link rel="stylesheet" href="terms/styles.css" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="wrap">
      <header>
        <h1>Tandem AI Chat — Terms of Use</h1>
        <p class="effective">Choose a language version (static pages, no scripts).</p>
      </header>
      <main id="main">
        <ul class="lang-hub">
${items}
        </ul>
      </main>
    </div>
  </body>
</html>
`;
}

for (const code of LANG_ORDER) {
  const bundle = TERMS_I18N[code];
  if (!bundle) {
    console.warn('Missing locale:', code);
    continue;
  }
  writeFileSync(join(docs, `${code}.html`), pageHtml(code, bundle), 'utf8');
}

writeFileSync(join(docs, 'index.html'), hubHtml(), 'utf8');
console.log('Wrote docs/index.html and', LANG_ORDER.length, 'locale files in docs/');
