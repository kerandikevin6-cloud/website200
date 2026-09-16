/* Bundles the multi-page site into dist/preview.html — one self-contained
   file with a hash router, for sharing as a single link.
   Run: node build.js                                                    */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PAGES = [
  'landing', 'index', 'ai', 'markets', 'positions', 'history', 'copy', 'learn', 'responsible',
  'terms', 'privacy', 'risk', 'security', 'complaints',
  'account', 'chat',
  'login', 'signup', 'forgot-password', 'reset-password'
];

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const css = read('assets/css/app.css');
const MODULES = ['config', 'countries', 'net', 'format', 'api', 'chart', 'modals', 'trade', 'positions', 'ai', 'app'];
const js = MODULES.map(m => read(`assets/js/${m}.js`)).join(String.fromCharCode(10));

const pages = {};
for (const name of PAGES) {
  const src = read(name + '.html');
  const bodyTag = src.match(/<body([^>]*)>/i)[1];
  const attrs = {};
  bodyTag.replace(/(data-[\w-]+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v; return ''; });

  const main = src.match(/<main>([\s\S]*?)<\/main>/i);
  const title = (src.match(/<title>([^<]*)<\/title>/i) || [, 'Novi'])[1];

  // inline page-specific scripts (those without a src)
  const inline = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');

  pages[name] = {
    attrs,
    title,
    html: main ? main[1] : '',
    script: inline.trim()
  };
}

/* The bundle is one file with no assets beside it, so the icon travels
   inside it as a data URI rather than as a link to something that will
   not be there. */
const favicon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAADbUlEQVR42u1WO4wcRRCtV909s7tzPziMDAc6AoyFZBNYAhMhRIJIkJATEkRCQg6ZcURmiQiBREgEERKZA0sESASIDGRhiwAuMLJYe7nbz8x0dxVB78zO7e1hXWAR4NEEM9P1+lV1vX7T+PTV3+hBXkwP+HpI8N8T2OMGlFRVmjcwllMRFSKdD4NBOAGBklpkme01c8UqTpdi+naNYdJzHWdB/UoOe8zsblju/XHwM4NFZeA2zmy93CmIAP5l+N007AOsKrvr5x/t7azksMuTE4nG3G7eHP3w5Y0P0tcni+euXLxea8kEIhLSDO7rm1duT2+lgHef/+SVnXdqf9fMa8IKAhAInPoOgoVjGMsuiM9tQUQMkxJkUiLKbcEwhl0Ub+BAYBgkAlVt2rMgCOpFYqogmEKJRKMoi0ZVUdI6zhKBkhq7piqiEcqiMcHrOEtdYRgDuyAQjYXb+urXyz/e+dZx5qV+fff97d7TizI5+7u6c/Wnt6J6IrLsPrzwjWXXBgzs+vW9L679/nmCv/j4m2+f/XjiRwxjm/XhsR+Oqj9BUNKJHz3W2+30BqJhWO51NBq6Cw3wxI9a+NgP0eywhboZDgTHOQiMo+qCRQZCiqEjamHYDtytVJFqcy8pIUmgHVLSI3Kc96aJ0UNWAULU4KVqlVrH6Szst0FRw9jf66Yy9veihvZ9Fvbr+U5UIvJSRQ2N5JIqYB3nbS6Z6fXtGhHSbWAHbrOb78BtGtg2oG/XMtNr4Y5zA5vKPc7sElKVYlo6rFqxNqCJP4nZAWw5s+xA3iJbgURmOTPsInmAT+amszA+v/3aRy9dYzhV6dn1MkwAtO4ZNLx37rMyHAAs6k8Pzty4+/19CABmWIZJGs1tcar/DMMmZ70dbjEsQ5IiifSR/ImQbYMgGhovmcO7BbUbDVUYi4YqBiKqZKqqXkqGUxIwqUqjE6pjUJKotZcSxKJeVSuZLuBh3PbMptxrmV08femp9XMMIxp3N16o4zTtHZARlcJtXXr2crIdhhnYLVFhSs5j6zi9cOqN7XwnwXeKs7XMUh1I5yIlzU3hOFNVAD5WlUxx2Az6ZgOYe+UsHnR/D0qa88CZfA6XuoqTBD+0RCVJUieIl4ShKmP/V+cPapZUW8VJGQ+Owg81Gf96BlhlUHRf+MNz0f+A4B+tJL14xgpcYQAAAABJRU5ErkJggg==';

const out = `<title>Novi Terminal</title>
<link rel="icon" type="image/png" href="${favicon}">
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
