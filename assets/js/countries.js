/* ============================================================
   Countries: dialling codes, and a flag for each

   Two separate things used to be one. The table in api.js lists the
   countries we take money from — seven of them — and it carries the
   currency, the rate and the mobile-money format. That is a payments
   table, and it was also, wrongly, the list somebody picked their phone
   number from. A trader in Lagos or London could not enter their own
   number at all.

   This is the other thing: every dialling code there is. It knows
   nothing about money.

   ---- On the flags ----
   There is no flag font that can be relied on. Windows has no flag
   emoji at all — a regional-indicator pair renders as the two letters —
   and shipping ~240 SVGs would be ~240 files in a product that builds
   to a single page.

   So they are drawn here from a one-line spec each: bands, and a small
   set of the shapes that sit on top of them. At 20x14 that is what
   survives anyway; the detail in the middle of a flag is invisible at
   this size whatever you do.

   A country with no spec gets its two letters in a box rather than a
   wrong flag. That is deliberate — an approximation somebody recognises
   is fine, an approximation they do not is worse than plain letters —
   and adding one is a single line here.
   ============================================================ */
(function () {
  'use strict';

  /* cc name dial, one per line. Dial codes only: no currency, no
     payment rail, nothing this list has no business knowing. */
  var LIST = (
    'AF Afghanistan 93|AL Albania 355|DZ Algeria 213|AD Andorra 376|' +
    'AO Angola 244|AG Antigua and Barbuda 1268|AR Argentina 54|AM Armenia 374|' +
    'AW Aruba 297|AU Australia 61|AT Austria 43|AZ Azerbaijan 994|' +
    'BS Bahamas 1242|BH Bahrain 973|BD Bangladesh 880|BB Barbados 1246|' +
    'BY Belarus 375|BE Belgium 32|BZ Belize 501|BJ Benin 229|BM Bermuda 1441|' +
    'BT Bhutan 975|BO Bolivia 591|BA Bosnia and Herzegovina 387|BW Botswana 267|' +
    'BR Brazil 55|BN Brunei 673|BG Bulgaria 359|BF Burkina Faso 226|BI Burundi 257|' +
    'KH Cambodia 855|CM Cameroon 237|CA Canada 1|CV Cape Verde 238|' +
    'KY Cayman Islands 1345|CF Central African Republic 236|TD Chad 235|' +
    'CL Chile 56|CN China 86|CO Colombia 57|KM Comoros 269|CG Congo 242|' +
    'CD Congo (DRC) 243|CR Costa Rica 506|CI Cote d Ivoire 225|HR Croatia 385|' +
    'CU Cuba 53|CY Cyprus 357|CZ Czechia 420|DK Denmark 45|DJ Djibouti 253|' +
    'DM Dominica 1767|DO Dominican Republic 1809|EC Ecuador 593|EG Egypt 20|' +
    'SV El Salvador 503|GQ Equatorial Guinea 240|ER Eritrea 291|EE Estonia 372|' +
    'SZ Eswatini 268|ET Ethiopia 251|FJ Fiji 679|FI Finland 358|FR France 33|' +
    'GA Gabon 241|GM Gambia 220|GE Georgia 995|DE Germany 49|GH Ghana 233|' +
    'GI Gibraltar 350|GR Greece 30|GD Grenada 1473|GT Guatemala 502|GN Guinea 224|' +
    'GW Guinea-Bissau 245|GY Guyana 592|HT Haiti 509|HN Honduras 504|' +
    'HK Hong Kong 852|HU Hungary 36|IS Iceland 354|IN India 91|ID Indonesia 62|' +
    'IR Iran 98|IQ Iraq 964|IE Ireland 353|IL Israel 972|IT Italy 39|' +
    'JM Jamaica 1876|JP Japan 81|JO Jordan 962|KZ Kazakhstan 7|KE Kenya 254|' +
    'KW Kuwait 965|KG Kyrgyzstan 996|LA Laos 856|LV Latvia 371|LB Lebanon 961|' +
    'LS Lesotho 266|LR Liberia 231|LY Libya 218|LI Liechtenstein 423|' +
    'LT Lithuania 370|LU Luxembourg 352|MO Macau 853|MG Madagascar 261|' +
    'MW Malawi 265|MY Malaysia 60|MV Maldives 960|ML Mali 223|MT Malta 356|' +
    'MR Mauritania 222|MU Mauritius 230|MX Mexico 52|MD Moldova 373|MC Monaco 377|' +
    'MN Mongolia 976|ME Montenegro 382|MA Morocco 212|MZ Mozambique 258|' +
    'MM Myanmar 95|NA Namibia 264|NP Nepal 977|NL Netherlands 31|' +
    'NZ New Zealand 64|NI Nicaragua 505|NE Niger 227|NG Nigeria 234|' +
    'MK North Macedonia 389|NO Norway 47|OM Oman 968|PK Pakistan 92|' +
    'PS Palestine 970|PA Panama 507|PG Papua New Guinea 675|PY Paraguay 595|' +
    'PE Peru 51|PH Philippines 63|PL Poland 48|PT Portugal 351|PR Puerto Rico 1787|' +
    'QA Qatar 974|RO Romania 40|RU Russia 7|RW Rwanda 250|' +
    'KN Saint Kitts and Nevis 1869|LC Saint Lucia 1758|' +
    'VC Saint Vincent and the Grenadines 1784|WS Samoa 685|SM San Marino 378|' +
    'ST Sao Tome and Principe 239|SA Saudi Arabia 966|SN Senegal 221|' +
    'RS Serbia 381|SC Seychelles 248|SL Sierra Leone 232|SG Singapore 65|' +
    'SK Slovakia 421|SI Slovenia 386|SB Solomon Islands 677|SO Somalia 252|' +
    'ZA South Africa 27|KR South Korea 82|SS South Sudan 211|ES Spain 34|' +
    'LK Sri Lanka 94|SD Sudan 249|SR Suriname 597|SE Sweden 46|CH Switzerland 41|' +
    'SY Syria 963|TW Taiwan 886|TJ Tajikistan 992|TZ Tanzania 255|TH Thailand 66|' +
    'TL Timor-Leste 670|TG Togo 228|TO Tonga 676|TT Trinidad and Tobago 1868|' +
    'TN Tunisia 216|TR Turkiye 90|TM Turkmenistan 993|UG Uganda 256|' +
    'UA Ukraine 380|AE United Arab Emirates 971|GB United Kingdom 44|' +
    'US United States 1|UY Uruguay 598|UZ Uzbekistan 998|VU Vanuatu 678|' +
    'VE Venezuela 58|VN Vietnam 84|YE Yemen 967|ZM Zambia 260|ZW Zimbabwe 263'
  );

  var COUNTRIES = LIST.split('|').map(function (row) {
    var parts = row.split(' ');
    var cc = parts.shift();
    var dial = parts.pop();
    return { cc: cc, name: parts.join(' '), dial: dial };
  }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });

  var BY_CC = {};
  COUNTRIES.forEach(function (c) { BY_CC[c.cc] = c; });

  /* ---------- flags ----------
     One spec per country, read left to right:

       h:a,b,c      horizontal bands, equal, top to bottom
       v:a,b,c      vertical bands, equal, hoist to fly
       then any number of overlays, separated by spaces:
       o:col        a disc in the middle
       t:col        a triangle from the hoist
       k:col        a canton: top-left, 40% wide, half tall
       c:col        a plain cross, offset toward the hoist (Nordic)
       s:col        a saltire, corner to corner
       b:col        a vertical band down the hoist
       r:col        a rhombus in the middle
       q:col        a small disc up in the hoist corner

     Colours are three or six hex digits without the hash. */
  var SPEC = {
    AE: 'h:009739,fff,000 b:ce1126',
    AF: 'v:000,ce1126,090',
    AO: 'h:ce1126,000',
    AR: 'h:74acdf,fff,74acdf',
    AM: 'h:d90012,0033a0,f2a800',
    AT: 'h:ed2939,fff,ed2939',
    AU: 'h:00247d,00247d k:012169',
    AZ: 'h:0092bc,ed2939,509e2f',
    BD: 'h:006a4e,006a4e o:f42a41',
    BE: 'v:000,fae042,ed2939',
    BF: 'h:ef2b2d,009e49',
    BG: 'h:fff,00966e,d62612',
    BH: 'v:fff,ce1126,ce1126',
    BI: 'h:1eb53a,ce1126 o:fff',
    BJ: 'v:008751,fcd116,e8112d',
    BO: 'h:d52b1e,f9e300,007a33',
    BR: 'h:009739,009739 r:fedf00 o:012169',
    BW: 'h:75aadb,000,75aadb',
    BY: 'h:c8313e,fff,c8313e',
    CA: 'v:d80621,fff,d80621',
    CD: 'h:007fff,f7d618,ce1021',
    CF: 'h:003082,fff,009543',
    CG: 'h:009543,fbde4a,dc241f',
    CH: 'h:d52b1e,d52b1e c:fff',
    CI: 'v:f77f00,fff,009e60',
    CL: 'h:fff,d52b1e k:0039a6',
    CM: 'v:007a5e,ce1126,fcd116',
    CN: 'h:de2910,de2910 q:ffde00',
    CO: 'h:fcd116,003893,ce1126',
    CR: 'h:002b7f,fff,ce1126',
    CU: 'h:002a8f,fff,002a8f t:cf142b',
    CV: 'h:003893,fff,003893',
    CY: 'h:fff,fff o:d57800',
    CZ: 'h:fff,d7141a t:11457e',
    DE: 'h:000,dd0000,ffce00',
    DJ: 'h:6ab2e7,12ad2b t:fff',
    DK: 'h:c8102e,c8102e c:fff',
    DO: 'h:002d62,ce1126 c:fff',
    DZ: 'v:006233,fff o:d21034',
    EC: 'h:ffdd00,0033a0,ef3340',
    EE: 'h:0072ce,000,fff',
    EG: 'h:ce1126,fff,000',
    ER: 'h:12ad2b,0061a8 t:ea0437',
    ES: 'h:aa151b,f1bf00,aa151b',
    ET: 'h:078930,fcdd09,da121a o:0f47af',
    FI: 'h:fff,fff c:003580',
    FJ: 'h:68bfe5,68bfe5 k:012169',
    FR: 'v:002395,fff,ed2939',
    GA: 'h:009e60,fcd116,3a75c4',
    GB: 'h:012169,012169 c:fff s:cf142b',
    GE: 'h:fff,fff c:ff0000',
    GH: 'h:ce1126,fcd116,006b3f o:000',
    GM: 'h:ce1126,0c1c8c,3a7728',
    GN: 'v:ce1126,fcd116,009460',
    GQ: 'h:3e9a00,fff,e32118',
    GR: 'h:0d5eaf,fff,0d5eaf k:0d5eaf',
    GT: 'v:4997d0,fff,4997d0',
    GW: 'h:ce1126,fcd116 t:009e49',
    HN: 'h:0073cf,fff,0073cf',
    HR: 'h:ff0000,fff,171796',
    HT: 'h:00209f,d21034',
    HU: 'h:cd2a3e,fff,436f4d',
    ID: 'h:ce1126,fff',
    IE: 'v:169b62,fff,ff883e',
    IL: 'h:fff,fff o:0038b8',
    IN: 'h:ff9933,fff,138808 o:000080',
    IQ: 'h:ce1126,fff,000',
    IR: 'h:239f40,fff,da0000',
    IS: 'h:02529c,02529c c:fff',
    IT: 'v:009246,fff,ce2b37',
    JM: 'h:009b3a,009b3a s:fed100',
    JO: 'h:000,fff,007a3d t:ce1126',
    JP: 'h:fff,fff o:bc002d',
    KE: 'h:000,ce1126,006600',
    KG: 'h:e8112d,e8112d o:ffef00',
    KH: 'h:032ea1,e00025,032ea1',
    KR: 'h:fff,fff o:cd2e3a',
    KW: 'h:007a3d,fff,ce1126 t:000',
    KZ: 'h:00afca,00afca o:fec50c',
    LA: 'h:ce1126,002868,ce1126 o:fff',
    LB: 'h:ed1c24,fff,ed1c24',
    LK: 'h:8d2029,8d2029 k:ff9933',
    LR: 'h:bf0a30,fff,bf0a30 k:002868',
    LS: 'h:00209f,fff,009543',
    LT: 'h:fdb913,006a44,c1272d',
    LU: 'h:ed2939,fff,00a1de',
    LV: 'h:9e3039,fff,9e3039',
    LY: 'h:e70013,000,239e46',
    MA: 'h:c1272d,c1272d o:006233',
    MD: 'v:0046ae,ffd200,cc092f',
    ME: 'h:c40308,c40308 o:d4af3a',
    MG: 'h:fff,ce1126,007e3a',
    MK: 'h:d20000,d20000 o:f8e92e',
    ML: 'v:14b53a,fcd116,ce1126',
    MM: 'h:fecb00,34b233,ea2839',
    MN: 'v:c4272f,015197,c4272f',
    MR: 'h:006233,006233 o:ffc400',
    MT: 'v:fff,fff,cf142b',
    MU: 'h:ea2839,1a206d,ffd500',
    MV: 'h:d21034,d21034 k:007e3a',
    MW: 'h:000,ce1126,339e35',
    MX: 'v:006847,fff,ce1126',
    MY: 'h:cc0001,fff,cc0001 k:010066',
    MZ: 'h:009a00,000,ffd100 t:d21034',
    NA: 'h:003580,003580 s:d21034',
    NE: 'h:e05206,fff,0db02b o:e05206',
    NG: 'v:008751,fff,008751',
    NI: 'h:0067c6,fff,0067c6',
    NL: 'h:ae1c28,fff,21468b',
    NO: 'h:ba0c2f,ba0c2f c:fff',
    NP: 'h:dc143c,dc143c t:003893',
    NZ: 'h:00247d,00247d k:012169',
    OM: 'h:fff,db161b,008000',
    PA: 'h:fff,db0a16',
    PE: 'v:d91023,fff,d91023',
    PG: 'h:ce1126,000',
    PH: 'h:0038a8,ce1126 t:fff',
    PK: 'h:01411c,01411c b:fff',
    PL: 'h:fff,dc143c',
    PS: 'h:000,fff,007a3d t:ce1126',
    PT: 'v:046a38,046a38,da291c',
    PY: 'h:d52b1e,fff,0038a8',
    QA: 'h:8d1b3d,8d1b3d b:fff',
    RO: 'v:002b7f,fcd116,ce1126',
    RS: 'h:c6363c,0c4076,fff',
    RU: 'h:fff,0039a6,d52b1e',
    RW: 'h:20603d,00a1de,fad201',
    SA: 'h:006c35,006c35',
    SD: 'h:d21034,fff,000 t:007229',
    SE: 'h:006aa7,006aa7 c:fecc00',
    SG: 'h:ed2939,fff',
    SI: 'h:fff,0000c6,d50000',
    SK: 'h:fff,0b4ea2,ee1c25',
    SL: 'h:1eb53a,fff,0072c6',
    SN: 'v:00853f,fdef42,e31b23',
    SO: 'h:4189dd,4189dd o:fff',
    SS: 'h:000,d21034,078930 t:0f47af',
    SY: 'h:ce1126,fff,000',
    SZ: 'h:3e5eb9,ffd900,3e5eb9',
    TD: 'v:002664,fecb00,c60c30',
    TG: 'h:006a4e,ffce00,006a4e k:d21034',
    TH: 'h:a51931,2d2a4a,a51931',
    TJ: 'h:cc0000,fff,006600',
    TL: 'h:d7141a,d7141a t:000',
    TN: 'h:e70013,e70013 o:fff',
    TR: 'h:e30a17,e30a17 o:fff',
    TT: 'h:da1a35,da1a35 s:000',
    TW: 'h:fe0000,fe0000 k:000095',
    TZ: 'h:1eb53a,000,00a3dd',
    UA: 'h:0057b7,ffd700',
    UG: 'h:000,fcdc04,d90000 o:fff',
    US: 'h:b22234,fff,b22234,fff,b22234 k:3c3b6e',
    UY: 'h:fff,0038a8,fff,0038a8,fff k:fff',
    UZ: 'h:0099b5,fff,1eb53a',
    VE: 'h:ffcc00,00247d,cf0821',
    VN: 'h:da251d,da251d o:ffff00',
    YE: 'h:ce1126,fff,000',
    ZA: 'h:e03c31,fff,007a4d t:000',
    ZM: 'h:198a00,198a00',
    ZW: 'h:078930,fcd116,ce1126 t:fff'
  };

  function px(hex) { return '#' + hex; }

  /* 20 x 14, which is the size it is actually drawn at. Working in the
     final units means no fractional band edges and no seams between
     them. */
  var W = 20, H = 14;

  function bands(dir, colours) {
    var n = colours.length, out = '';
    for (var i = 0; i < n; i++) {
      /* The last band runs to the edge rather than to a rounded stop,
         so a 3-into-14 division cannot leave a hairline of background. */
      var a = Math.round((dir === 'h' ? H : W) * i / n);
      var b = i === n - 1 ? (dir === 'h' ? H : W) : Math.round((dir === 'h' ? H : W) * (i + 1) / n);
      out += dir === 'h'
        ? '<rect y="' + a + '" width="' + W + '" height="' + (b - a) + '" fill="' + px(colours[i]) + '"/>'
        : '<rect x="' + a + '" width="' + (b - a) + '" height="' + H + '" fill="' + px(colours[i]) + '"/>';
    }
    return out;
  }

  var OVERLAY = {
    o: function (c) { return '<circle cx="10" cy="7" r="3.4" fill="' + px(c) + '"/>'; },
    t: function (c) { return '<path d="M0 0L8 7L0 14Z" fill="' + px(c) + '"/>'; },
    k: function (c) { return '<rect width="8" height="7" fill="' + px(c) + '"/>'; },
    c: function (c) {
      return '<rect x="6" width="3" height="' + H + '" fill="' + px(c) + '"/>' +
             '<rect y="5.5" width="' + W + '" height="3" fill="' + px(c) + '"/>';
    },
    s: function (c) {
      return '<path d="M0 0L20 14M20 0L0 14" stroke="' + px(c) + '" stroke-width="2.4"/>';
    },
    b: function (c) { return '<rect width="5" height="' + H + '" fill="' + px(c) + '"/>'; },
    r: function (c) { return '<path d="M10 1.6L18 7L10 12.4L2 7Z" fill="' + px(c) + '"/>'; },
    q: function (c) { return '<circle cx="4.6" cy="4" r="1.8" fill="' + px(c) + '"/>'; }
  };

  function body(cc) {
    var spec = SPEC[cc];
    if (!spec) return null;
    var parts = spec.split(' ');
    var base = parts.shift().split(':');
    var out = bands(base[0], base[1].split(','));
    for (var i = 0; i < parts.length; i++) {
      var bit = parts[i].split(':');
      if (OVERLAY[bit[0]]) out += OVERLAY[bit[0]](bit[1]);
    }
    return out;
  }

  /* The letters, for a country with no spec. A box with "PG" in it is a
     deliberate-looking thing; a tricolour in the wrong colours is not. */
  function letters(cc) {
    return '<rect width="' + W + '" height="' + H + '" fill="#8494A8"/>' +
      '<text x="10" y="10.4" text-anchor="middle" font-size="8" font-weight="600" ' +
      'font-family="system-ui,sans-serif" fill="#fff">' + cc + '</text>';
  }

  var cache = {};
  function flag(cc, size) {
    cc = (cc || '').toUpperCase();
    var key = cc + ':' + (size || 20);
    if (cache[key]) return cache[key];

    /* The seven countries we take money from have hand-drawn flags in
       app.js, with the shield, the star and the fimbriations these
       generated ones cannot express. Most customers are in one of them,
       so where a proper drawing exists it wins. */
    if (window.NexFlag) {
      var hand = window.NexFlag(cc);
      if (hand) { cache[key] = hand; return hand; }
    }
    var inner = body(cc) || letters(cc);
    var w = size || 20;
    var svg = '<svg class="flagsvg" viewBox="0 0 ' + W + ' ' + H + '" width="' + w +
      '" height="' + Math.round(w * H / W) + '" role="img" aria-label="' + cc + '">' +
      inner + '</svg>';
    cache[key] = svg;
    return svg;
  }

  /* ---------- the picker ----------
     A native <select> hands the list to the operating system, which on a
     laptop is a bare column of 195 names in the browser's own font, with
     no flags, no dialling codes and no way to search except by typing
     the first letters of a name somebody may not know in English. This
     is the same control drawn properly: flags, codes, and a filter that
     matches either the country or the number.

     It is still a button and a list, so the keyboard works and a screen
     reader is told what it is. */
  function mountPicker(host, opts) {
    opts = opts || {};
    var value = (opts.value || 'KE').toUpperCase();
    if (!BY_CC[value]) value = 'KE';
    var open = false;

    host.classList.add('cc');
    host.innerHTML =
      '<button type="button" class="cc-btn" aria-haspopup="listbox" aria-expanded="false">' +
        '<i class="flag"></i><b class="num"></b>' +
        (window.NexIcon ? window.NexIcon('chevD', 12) : '') +
      '</button>' +
      '<div class="cc-pop" hidden>' +
        '<div class="cc-find">' +
          '<input type="text" class="cc-search" placeholder="Search country or code" ' +
            'autocomplete="off" spellcheck="false" aria-label="Search countries">' +
        '</div>' +
        '<div class="cc-list" role="listbox"></div>' +
      '</div>';

    var btn = host.querySelector('.cc-btn');
    var pop = host.querySelector('.cc-pop');
    var search = host.querySelector('.cc-search');
    var list = host.querySelector('.cc-list');

    function paintButton() {
      btn.querySelector('.flag').innerHTML = flag(value, 20);
      btn.querySelector('b').textContent = '+' + BY_CC[value].dial;
      btn.setAttribute('aria-label', BY_CC[value].name + ', +' + BY_CC[value].dial);
    }

    function paintList(q) {
      q = (q || '').trim().toLowerCase().replace(/^\+/, '');
      var rows = COUNTRIES.filter(function (c) {
        if (!q) return true;
        return c.name.toLowerCase().indexOf(q) > -1 || c.dial.indexOf(q) === 0;
      });
      list.innerHTML = rows.length
        ? rows.map(function (c) {
            return '<button type="button" class="cc-row' + (c.cc === value ? ' on' : '') +
                '" role="option" aria-selected="' + (c.cc === value) + '" data-cc="' + c.cc + '">' +
              flag(c.cc, 20) +
              '<span class="cc-name">' + c.name + '</span>' +
              '<span class="cc-dial num">+' + c.dial + '</span>' +
            '</button>';
          }).join('')
        : '<div class="cc-none">No country matches that</div>';
    }

    function setOpen(next) {
      open = next;
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      host.classList.toggle('open', open);
      if (open) {
        paintList('');
        search.value = '';
        /* Not on a touch keyboard: opening the list and throwing a
           keyboard over two thirds of it helps nobody. */
        if (!matchMedia('(pointer:coarse)').matches) search.focus();
        var on = list.querySelector('.cc-row.on');
        if (on) list.scrollTop = Math.max(0, on.offsetTop - 60);
      }
    }

    function choose(cc) {
      if (!BY_CC[cc]) return;
      value = cc;
      paintButton();
      setOpen(false);
      if (opts.onChange) opts.onChange(BY_CC[cc]);
    }

    btn.addEventListener('click', function (e) { e.preventDefault(); setOpen(!open); });
    search.addEventListener('input', function () { paintList(search.value); });
    list.addEventListener('click', function (e) {
      var row = e.target.closest('[data-cc]');
      if (row) choose(row.getAttribute('data-cc'));
    });
    host.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { setOpen(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (open && !host.contains(e.target)) setOpen(false);
    });

    paintButton();
    if (opts.onChange) opts.onChange(BY_CC[value]);

    return {
      value: function () { return value; },
      set: choose
    };
  }

  window.NexCountries = {
    all: COUNTRIES,
    get: function (cc) { return BY_CC[(cc || '').toUpperCase()] || null; },
    dial: function (cc) { var c = BY_CC[(cc || '').toUpperCase()]; return c ? c.dial : null; },
    flag: flag,
    mountPicker: mountPicker,
    /* Whether this one is drawn or lettered, so a caller that cares can
       ask rather than inspect the markup. */
    drawn: function (cc) { return !!SPEC[(cc || '').toUpperCase()]; }
  };
})();
