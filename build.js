/* Bundles the multi-page site into dist/preview.html — one self-contained
   file with a hash router, for sharing as a single link.
   Run: node build.js                                                    */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PAGES = [
  'landing', 'index', 'ai', 'markets', 'positions', 'learn', 'responsible',
  'account', 'chat',
  'login', 'signup', 'forgot-password', 'reset-password'
];

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const css = read('assets/css/app.css');
const MODULES = ['config', 'net', 'format', 'api', 'chart', 'modals', 'trade', 'positions', 'ai', 'app'];
const js = MODULES.map(m => read(`assets/js/${m}.js`)).join(String.fromCharCode(10));

const pages = {};
for (const name of PAGES) {
  const src = read(name + '.html');
  const bodyTag = src.match(/<body([^>]*)>/i)[1];
  const attrs = {};
  bodyTag.replace(/(data-[\w-]+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v; return ''; });

  const main = src.match(/<main>([\s\S]*?)<\/main>/i);
  const title = (src.match(/<title>([^<]*)<\/title>/i) || [, 'Nexas'])[1];

  // inline page-specific scripts (those without a src)
  const inline = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');

  pages[name] = {
    attrs,
    title,
    html: main ? main[1] : '',
    script: inline.trim()
  };
}

const out = `<title>Nexas Terminal</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
${css}
</style>

<div class="app" id="app"></div>

<script>window.NEXAS_BUNDLE = true; window.NEXAS_PAGES = ${JSON.stringify(pages)};</script>
<script>
${js}
</script>
<script>
(function () {
  var app = document.getElementById('app');

  function route() {
    var name = (location.hash || '#/index').replace('#/', '').split('?')[0] || 'index';
    var page = window.NEXAS_PAGES[name] || window.NEXAS_PAGES.index;

    document.body.className = '';
    Object.keys(page.attrs).forEach(function (k) { document.body.setAttribute(k, page.attrs[k]); });
    ['data-back', 'data-title'].forEach(function (k) {
      if (!page.attrs[k]) document.body.removeAttribute(k);
    });

    app.innerHTML = '<main>' + page.html + '</main>';
    window.NexBoot();
    if (page.script) { try { new Function(page.script)(); } catch (e) {} }
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.indexOf('.html') === -1) return;
    e.preventDefault();
    location.hash = '#/' + href.replace('.html', '');
  });

  window.addEventListener('hashchange', route);
  route();
})();
</script>
`;

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'preview.html'), out);
console.log('dist/preview.html  ' + (out.length / 1024).toFixed(0) + ' KB  ·  ' + PAGES.length + ' pages');
