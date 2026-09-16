#!/usr/bin/env node
/* ============================================================
   strip-dashes — take the em dashes out of the copy

   Run: node tools/strip-dashes.js            (report only)
        node tools/strip-dashes.js --write    (make the changes)

   An em dash sets off a clause the way a comma does, so that is what it
   becomes: "indices — price series" reads as "indices, price series".
   Where one is doing a different job, so is the replacement:

     word — word     ->  word, word        a parenthetical clause
     — at line start ->  removed           a leading dash in a list
     0–9   (en dash) ->  0-9               a range, which needs a hyphen
     word—word       ->  word - word       a hard break with no spaces

   Both the literal characters and the HTML entities (&mdash; &ndash;)
   are handled, because the copy uses each in different places.

   What it will not touch: anything inside a <script>, <style>, or a
   code-ish attribute. A dash in a regular expression or a CSS value is
   not prose, and replacing it would break the page rather than tidy it.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WRITE = process.argv.includes('--write');

/* Files whose prose we own. dist/ is generated, so it is rebuilt rather
   than edited, and node_modules is nobody's business. */
const TARGETS = [
  ...fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).map(f => f),
  ...fs.readdirSync(path.join(ROOT, 'admin'))
      .filter(f => f.endsWith('.html')).map(f => path.join('admin', f)),
  'assets/js/app.js', 'assets/js/api.js', 'assets/js/modals.js',
  'assets/js/trade.js', 'assets/js/ai.js', 'assets/js/positions.js',
  'assets/js/net.js', 'assets/js/format.js', 'assets/js/chart.js',
  'assets/js/config.js', 'admin/assets/js/config.js',
  'admin/assets/js/admin.js', 'admin/assets/js/api.js'
];

/* Apply to one run of text. Order matters: the spaced form is the common
   one and is handled before the bare character. */
function clean(text) {
  return text
    /* ranges first, so 0–9 does not become 0, 9 */
    .replace(/(\d)\s*(?:–|&ndash;)\s*(\d)/g, '$1-$2')
    .replace(/(?:–|&ndash;)/g, '-')
    /* a dash opening a line is a bullet: drop it */
    .replace(/^(\s*)(?:—|&mdash;)\s+/gm, '$1')
    /* the parenthetical clause */
    .replace(/\s+(?:—|&mdash;)\s+/g, ', ')
    /* no spaces around it: keep the break, lose the dash */
    .replace(/(\w)(?:—|&mdash;)(\w)/g, '$1 - $2')
    /* whatever is left */
    .replace(/(?:—|&mdash;)/g, '')
    /* The tidy-up, kept deliberately narrow, because this runs over
       source files and not just prose. Two earlier rules had to go:

         ,$          would strip the trailing comma from every
                     multi-line object literal in the codebase
         ,\s*[.!?]   reads as "comma before punctuation" in prose and as
                     a comma before a CSS selector or a ! operator in
                     code — it turned toggle('invalid', !!error) into
                     toggle('invalid' !!error), which is a parse error

       If a replacement leaves an odd comma somewhere, that is a thing a
       person fixes in one place. A rule that edits code is not. */
    .replace(/,\s*,/g, ',')
    .replace(/ +,/g, ',');
}

/* Only <style> is skipped. An inline <script> is where half the copy in
   the admin console lives, and an em dash cannot appear in JavaScript
   syntax — only inside a string or a comment — so the rules above reach
   it safely now that the two code-breaking ones are gone. A CSS value,
   by contrast, can legitimately contain a dash. */
const SKIP = /(<style[\s\S]*?<\/style>)/gi;

function cleanFile(source, isHtml) {
  if (!isHtml) return clean(source);
  const parts = source.split(SKIP);
  return parts.map((part, i) => (i % 2 ? part : clean(part))).join('');
}

let touched = 0;
let total = 0;

for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;

  const before = fs.readFileSync(file, 'utf8');
  const isHtml = rel.endsWith('.html');
  const after = cleanFile(before, isHtml);
  if (after === before) continue;

  const found = (before.match(/—|&mdash;|–|&ndash;/g) || []).length;
  const left = (after.match(/—|&mdash;|–|&ndash;/g) || []).length;
  total += found - left;
  touched++;
  console.log(`${rel.padEnd(34)} ${found - left} replaced${left ? `, ${left} left in script/style` : ''}`);

  if (WRITE) fs.writeFileSync(file, after);
}

console.log(`\n${total} dashes in ${touched} files${WRITE ? ' — written' : ' — dry run, pass --write to apply'}`);
