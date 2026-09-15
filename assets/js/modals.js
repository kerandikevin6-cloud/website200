/* ============================================================
   Nexas — modal definitions
   Each modal is a set of steps; the engine in app.js renders the
   shell and handles back, close and step transitions.
     data-goto="stepId"       advance
     data-set="method:usdt"   store a value on the modal state
     data-action="deposit"    run a real action against NexAPI
     data-done="message"      close with a toast
   ============================================================ */
(function () {
  "use strict";

  var eye = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"></path><circle cx="12" cy="12" r="2.6"></circle></svg>';
  var NAMES = { mpesa: 'M-Pesa', card: 'Card', usdt: 'USDT' };

  function I(n, s) { return window.NexIcon(n, s); }
  function F() { return window.NexFmt; }
  function API() { return window.NexAPI; }

  function field(id, label, attrs, hint) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<input class="input" id="' + id + '" ' + (attrs || '') + '>' +
      (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  }
  function secret(id, label, placeholder, meter) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<div class="input-wrap"><input class="input" id="' + id + '" type="password" placeholder="' + placeholder + '">' +
      '<button type="button" data-reveal aria-label="Show password">' + eye + '</button></div>' +
      (meter ? '<div class="meter"><i></i><i></i><i></i><i></i></div>' : '') + '</div>';
  }
  /* Country comes from the IP lookup in api.js, with a timezone guess
     standing in until it answers. The dialling code is a fixed prefix,
     never part of the value, so the box itself starts empty and takes
     nothing but the local number. */
  function phoneField(id, label, hint) {
    var c = API().geo.country();
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<div class="phone">' +
        '<span class="phone-cc" data-phone-cc>' +
          '<i class="flag">' + window.NexFlag(API().geo.code()) + '</i>' +
          '<b class="num">+' + c.dial + '</b>' +
        '</span>' +
        '<input class="input num phone-input" id="' + id + '" type="tel" inputmode="numeric" ' +
          'autocomplete="tel-national" placeholder="' + c.sample + '">' +
      '</div>' +
      (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  }

  /* Just enough logo to confirm what is accepted. It sits above the
     form as a small chip rather than a banner — the white ground is
     only there because these marks are drawn for light backgrounds. */
  function brandMark(src, alt, inkSrc) {
    /* Only a mark that needs a second version is theme-tagged. The
       M-Pesa badge is a solid green plate and reads on either ground,
       so it ships once and is never hidden. */
    if (!inkSrc) {
      return '<div class="paylogo"><img src="' + src + '" alt="' + alt + '" loading="lazy"></div>';
    }
    return '<div class="paylogo">' +
      '<img class="on-dark" src="' + src + '" alt="' + alt + '" loading="lazy">' +
      '<img class="on-light" src="' + inkSrc + '" alt="' + alt + '" loading="lazy">' +
    '</div>';
  }

  /* A rail that is not live yet: shown, so people can see it is coming,
     but inert. */
  function methodOff(iconName, name, note) {
    return '<div class="method off" aria-disabled="true">' +
      '<span class="ico">' + I(iconName, 19) + '</span>' +
      '<span class="t"><b>' + name + '</b><span>' + note + '</span></span>' +
      '<span class="badge">Soon</span></div>';
  }

  function method(value, iconName, name, note) {
    return '<button class="method" data-set="method:' + value + '" data-goto="form">' +
      '<span class="ico">' + I(iconName, 19) + '</span>' +
      '<span class="t"><b>' + name + '</b><span>' + note + '</span></span>' + I('chev', 16) + '</button>';
  }
  function act(label, action, cls) {
    return '<button class="btn ' + (cls || 'btn-fill') + '" type="button" data-action="' + action + '">' + label + '</button>';
  }
  function submit(label, done) {
    return '<button class="btn btn-fill" type="button" data-done="' + done + '">' + label + '</button>';
  }
  /* Mobile money is quoted in the money the person actually holds. Card
     follows the same country; USDT is a dollar rail, so it stays in USD. */
  function payCur(methodId) {
    var c = API().geo.country();
    if (methodId === 'usdt' || !c.cur) {
      return { cur: API().account.currency(), rate: 1, min: 10, quick: [10, 25, 50, 100, 250] };
    }
    return { cur: c.cur, rate: c.rate, min: c.min, quick: c.quick };
  }

  /* The waiting and done screens are shared by deposit and withdraw, so
     both rails behave the same while we are still on mock money. */
  function waitingBody(headline, note) {
    return '<div class="await">' +
      window.NexLoader() +
      '<b>' + headline + '</b>' +
      '<span>' + note + '</span>' +
      '<button class="btn btn-ghost" type="button" data-close>Cancel</button>' +
    '</div>';
  }
  /* Every operation that changes something ends on one of these, so a
     save, a payment and a document upload all confirm the same way
     instead of some flashing a toast and others closing silently. */
  function doneBody(headline, note, rows, cta) {
    return '<div class="done">' +
      '<span class="done-mark">' + I('check', 30) + '</span>' +
      '<b>' + headline + '</b>' +
      '<span>' + note + '</span>' +
      '</div>' +
      '<div class="modal-form">' +
        (rows ? '<div class="totals">' + rows + '</div>' : '') +
        (cta || '') +
        '<button class="btn btn-fill" type="button" data-close>Done</button>' +
      '</div>';
  }
  /* The other ending. A payment that does not go through is the moment a
     person is most likely to think they have lost money, so this says
     what happened, whose problem it is, and what to do next — in that
     order. It never blames the customer for something that was not
     theirs, and never claims a fault is ours when the truth is that the
     prompt was declined. app.js decides which of those it was. */
  function failBody(f) {
    f = f || {};
    return '<div class="done">' +
      '<span class="done-mark bad">' + I('alert', 30) + '</span>' +
      '<b>' + (f.headline || 'That payment did not go through') + '</b>' +
      '<span>' + (f.note || 'No money has left your account.') + '</span>' +
      '</div>' +
      '<div class="modal-form">' +
        (f.detail
          ? '<div class="totals">' + kv('What happened', f.detail) +
            (f.ref ? kv('Reference', f.ref) : '') + '</div>'
          : (f.ref ? '<div class="totals">' + kv('Reference', f.ref) + '</div>' : '')) +
        (f.reassure ? '<div class="notice">' + I('shield', 17) +
          '<span>' + f.reassure + '</span></div>' : '') +
        (f.recheck
          ? '<button class="btn btn-fill" type="button" data-action="recheckDeposit">Check again</button>'
          : (f.retry === false ? '' :
             '<button class="btn btn-fill" type="button" data-goto="form">Try again</button>')) +
        '<button class="btn btn-ghost" type="button" data-close>' +
          (f.recheck ? 'Close and wait' : 'Close') + '</button>' +
      '</div>';
  }

  function failStep(title, sub) {
    return {
      title: title,
      sub: sub,
      noBack: true,
      body: function (s) { return failBody(s.fail); }
    };
  }

  function okStep(title, sub, headline, note, rows, cta) {
    return {
      title: title,
      sub: sub,
      noBack: true,
      body: function (s) {
        return doneBody(
          typeof headline === 'function' ? headline(s) : headline,
          typeof note === 'function' ? note(s) : note,
          typeof rows === 'function' ? rows(s) : rows,
          typeof cta === 'function' ? cta(s) : cta
        );
      }
    };
  }

  /* Shows enough of the address to recognise it, not enough to leak it
     to whoever is looking over the person's shoulder. */
  function maskEmail() {
    var e = ((API().session.get() || {}).email || '').trim();
    if (!e || e.indexOf('@') < 1) return 'Not set';
    var parts = e.split('@');
    var name = parts[0];
    var shown = name.length <= 2 ? name.charAt(0) : name.charAt(0) + '***' + name.charAt(name.length - 1);
    return shown + '@' + parts[1];
  }

  function kv(k, v, attrs) {
    return '<div class="kv"><span>' + k + '</span><b ' + (attrs || '') + '>' + v + '</b></div>';
  }

  window.NexModals = {

    /* ---------------- account switcher ---------------- */
    switch: {
      steps: {
        list: {
          title: 'Switch account',
          sub: 'Practise with virtual funds, or trade your real balance.',
          body: function () {
            var kind = API().account.kind(), b = API().account.balances();
            var canReal = API().account.realAvailable();
            var cur = API().account.currency();

            function row(id, name, note, value) {
              return '<button class="choice' + (kind === id ? ' selected' : '') + '" data-action="useAccount" data-kind="' + id + '">' +
                '<span class="dot"></span>' +
                '<span class="c-t"><b>' + name + '</b><span>' + note + '</span></span>' +
                '<span class="c-v num">' + value + '</span></button>';
            }

            /* Without an account there is no real balance to show, so the
               row does not pretend there is one. Showing $0.00 would be a
               number about money this visitor does not have. */
            return '<div class="choices">' +
              (canReal
                ? row('real', 'Real', cur + ' · live funds', F().amount(b.real))
                : row('real', 'Real', 'Create an account to trade real funds', 'Sign up')) +
              row('demo', 'Demo', cur + ' · practice funds', F().amount(b.demo)) +
            '</div><p class="hint" style="margin:14px 2px 0">' +
              (canReal
                ? 'Open positions stay with the account they were taken on.'
                : 'Everything here is the demo balance: virtual funds, real prices.') +
            '</p>';
          }
        },
        done: okStep(
          'Account switched',
          'The terminal is now trading this balance.',
          function () { return 'Trading the ' + API().account.kind() + ' account'; },
          function () {
            return API().account.kind() === 'demo'
              ? 'Virtual funds, real prices. Nothing here touches your real balance.'
              : 'Real funds. Every contract you place from here costs actual money.';
          },
          function () {
            return kv('Account', API().account.kind()) +
              kv('Balance', F().money(API().account.balance()));
          })
      }
    },

    /* ---------------- notifications ---------------- */
    alerts: {
      steps: {
        list: {
          title: 'Notifications',
          sub: 'Account and platform activity.',
          body: function () {
            var tx = API().transactions.list().slice(0, 6);
            if (!tx.length) {
              return '<div class="empty" style="padding:30px 10px">' + I('bell', 24) +
                '<b>Nothing new</b><span>Trade and payment activity will show here.</span></div>';
            }
            return '<div class="list" style="margin:0">' + tx.map(function (t) {
              return '<div class="trow"><span class="ico ' + (t.amount >= 0 ? 'pos' : 'neg') + '">' +
                I(t.amount >= 0 ? 'up' : 'down', 16) + '</span>' +
                '<span class="t"><b>' + t.kind + (t.ref ? ' · ' + t.ref : '') + '</b>' +
                '<span>' + F().ago(t.t) + '</span></span>' +
                '<span class="p"><span class="num ' + (t.amount >= 0 ? 'pos' : 'neg') + '">' +
                F().signed(t.amount) + '</span></span></div>';
            }).join('') + '</div>';
          }
        }
      }
    },

    /* ---------------- automated run settings ---------------- */
    autorun: {
      steps: {
        form: {
          title: 'Automated run',
          sub: 'The run stops on its own when any of these is hit.',
          body: function () {
            var a = API().prefs.auto();
            return '<div class="modal-form">' +
              '<div class="pair">' +
                field('autoRuns', 'Number of runs', 'value="' + a.runs + '" inputmode="numeric"') +
                field('autoMult', 'Stake × on loss', 'value="' + a.multiplier + '" inputmode="decimal"') +
              '</div>' +
              '<div class="pair">' +
                field('autoTP', 'Take profit', 'value="' + a.takeProfit + '" inputmode="decimal"') +
                field('autoSL', 'Stop loss', 'value="' + a.stopLoss + '" inputmode="decimal"') +
              '</div>' +
              '<div class="notice">' + I('shield', 17) +
                '<span>Doubling stake after a loss grows exposure fast: six losses at ×2 stakes 63 times your opening amount.</span></div>' +
              act('Save settings', 'saveAuto') +
            '</div>';
          }
        },
        done: okStep(
          'Run settings saved',
          'They apply to the next automated run you start.',
          'Settings saved',
          'The run will stop on its own when any one of these is reached.',
          function () {
            var a = API().prefs.auto();
            return kv('Runs', a.runs) +
              kv('Stake × on loss', a.multiplier) +
              kv('Take profit', F().money(a.takeProfit)) +
              kv('Stop loss', F().money(a.stopLoss));
          })
      }
    },

    /* ---------------- keyboard shortcuts ---------------- */
    shortcuts: {
      steps: {
        list: {
          title: 'Keyboard shortcuts',
          sub: 'Available on the terminal.',
          body: function () {
            var rows = [['D', 'Open deposit'], ['Esc', 'Close dialog'], ['?', 'This list'],
              ['Scroll', 'Zoom the chart'], ['Drag', 'Pan the chart']];
            return '<div class="totals">' + rows.map(function (r) {
              return '<div class="kv"><span>' + r[1] + '</span><b><kbd>' + r[0] + '</kbd></b></div>';
            }).join('') + '</div>';
          }
        }
      }
    },

    /* ---------------- profile ---------------- */
    profile: {
      steps: {
        form: {
          title: 'Profile and name',
          sub: 'Your name must match the ID you verify with.',
          body: function () {
            var who = API().session.get() || {};
            var parts = (who.name || '').trim().split(/\s+/);
            var first = parts[0] || '';
            var last = parts.slice(1).join(' ');
            return '<div class="modal-form">' +
              field('firstName', 'First name',
                'value="' + first + '" autocomplete="given-name" placeholder="First name"') +
              field('lastName', 'Last name',
                'value="' + last + '" autocomplete="family-name" placeholder="Last name"') +
              field('displayName', 'Display name',
                'value="' + (who.displayName || '') + '" placeholder="How other traders see you"',
                'Shown in support chat and copy trading.') +
              act('Save changes', 'saveProfile') +
            '</div>';
          }
        },
        done: okStep(
          'Profile saved',
          'Your details are up to date.',
          'Profile updated',
          function (s) {
            return 'You are now shown as ' + (s.savedName || 'your new name') +
              ' across the platform.';
          })
      }
    },

    /* ---------------- password ---------------- */
    password: {
      steps: {
        form: {
          title: 'Update password',
          sub: 'You stay signed in on this device.',
          body: function () {
            return '<div class="modal-form">' +
              secret('currentPassword', 'Current password', '••••••••') +
              secret('newPassword', 'New password', 'At least 8 characters', true) +
              secret('confirmPassword', 'Confirm new password', 'Repeat new password') +
              '<ul class="rules" id="pwRules">' +
                '<li data-rule="len">At least 8 characters</li>' +
                '<li data-rule="case">An upper and a lower case letter</li>' +
                '<li data-rule="digit">A number</li>' +
                '<li data-rule="symbol">A symbol</li>' +
              '</ul>' +
              act('Update password', 'savePassword') +
            '</div>';
          }
        },
        done: okStep(
          'Password changed',
          'You stay signed in on this device.',
          'Password updated',
          'Anywhere else you were signed in has been signed out. Use the new password next time you log in.')
      }
    },

    /* ---------------- identity ---------------- */
    verify: {
      steps: {
        list: {
          title: 'Verify identity',
          sub: 'Reviewed within an hour. Needed before your first withdrawal.',
          body: function () {
            if (API().kyc.verified()) {
              return '<div class="empty" style="padding:26px 10px">' + I('check', 24) +
                '<b>Identity verified</b><span>Withdrawals are open on this account.</span></div>';
            }
            return '<div class="modal-form"><div class="list" style="margin:0">' +
              '<div class="row"><span class="ico pos">' + I('check', 18) + '</span>' +
                '<span class="t"><b>Email address</b><span>' + maskEmail() + '</span></span>' +
                '<span class="badge ok">Done</span></div>' +
              '<button class="row" data-goto="upload" data-set="doc:Government ID">' +
                '<span class="ico">' + I('idcard', 18) + '</span>' +
                '<span class="t"><b>Government ID</b><span>Passport, national ID or licence</span></span>' +
                '<span class="badge warn">Required</span></button>' +
              '<button class="row" data-goto="upload" data-set="doc:Proof of address">' +
                '<span class="ico">' + I('card', 18) + '</span>' +
                '<span class="t"><b>Proof of address</b><span>Bill or statement, last 3 months</span></span>' +
                '<span class="badge warn">Required</span></button>' +
            '</div></div>';
          }
        },
        upload: {
          title: 'Upload document',
          sub: 'JPG, PNG or PDF under 8 MB. All four corners visible.',
          body: function (state) {
            var doc = state.doc || 'Document';
            var two = doc === 'Government ID';
            function picker(slot, label) {
              var id = 'doc_' + slot;
              return '<div class="picker" data-slot="' + slot + '">' +
                '<label class="dropzone" for="' + id + '">' +
                  I('up', 22) +
                  '<b>' + label + '</b>' +
                  '<span>Take a photo or choose a file from this device</span>' +
                  '<span class="btn btn-ghost">Choose file</span>' +
                '</label>' +
                '<input type="file" id="' + id + '" class="filepick" hidden ' +
                  'accept="image/png,image/jpeg,image/webp,application/pdf" capture="environment" ' +
                  'data-slot="' + slot + '">' +
                '<div class="pick-out"></div>' +
              '</div>';
            }
            return '<div class="modal-form">' +
              (two
                ? picker(doc + ' front', 'Front of your ID') + picker(doc + ' back', 'Back of your ID')
                : picker(doc, doc)) +
              '<div class="notice">' + I('shield', 17) +
                '<span>Your documents are used only to verify identity and are never shown to other traders.</span></div>' +
              '<button class="btn btn-fill" type="button" data-action="verify" id="verifySubmit" disabled>' +
                'Submit for review</button>' +
            '</div>';
          }
        },
        done: okStep(
          'Documents received',
          'Nothing more is needed from you right now.',
          'Submitted for review',
          'Most checks clear within the hour. We will let you know either way, and you can keep trading while it runs.',
          function () {
            return kv('Status', '<span class="badge warn">In review</span>') +
              kv('Usually takes', 'Under an hour') +
              kv('Unlocks', 'Withdrawals');
          })
      }
    },

    /* ---------------- deposit ---------------- */
    deposit: {
      steps: {
        choose: {
          title: 'Deposit funds',
          sub: 'Funds land in the account you are trading. No fee from Nexas.',
          body: function () {
            var c = API().geo.country();
            var money = c.cur || 'USD';
            var lo = c.min || 10;
            var hi = c.rate ? Math.round(1200 * c.rate / 1000) * 1000 : 1200;
            return method('mpesa', 'phone', 'M-Pesa',
                'Instant · ' + money + ' ' + F().count(lo) + ' – ' + F().count(hi)) +
              method('card', 'card', 'Card', 'Visa and Mastercard · secured by Paystack') +
              methodOff('coin', 'USDT', 'Crypto deposits are not open yet');
          }
        },
        form: {
          title: function (s) { return 'Deposit with ' + (NAMES[s.method] || 'M-Pesa'); },
          sub: 'Funds usually appear within two minutes.',
          body: function (s) {
            var m = s.method || 'mpesa', inner;

            var logo = '';
            if (m === 'mpesa') {
              logo = brandMark('assets/mpesa.png', 'M-Pesa');
              inner = phoneField('mpesaPhone', 'M-Pesa number',
                'You will receive an STK push on this number. Enter your PIN to confirm.');
            } else if (m === 'card') {
              /* No card fields here by design: taking a PAN on our own form
                 would drag this page into PCI scope for no benefit. One
                 short line is all this step needs — the rest is Paystack's
                 job, and the whole sheet fits without scrolling. */
              logo = brandMark('assets/cards.png', 'Visa and Mastercard', 'assets/cards-ink.png');
              inner = '<div class="handoff">' +
                  '<span class="handoff-mark">' + I('lock', 18) + '</span>' +
                  '<div class="handoff-t">' +
                    '<p>Card details are entered on Paystack\'s secure checkout. ' +
                    'Nexas never sees your card number.</p>' +
                  '</div>' +
                '</div>';
            } else {
              inner = '<div class="field"><label for="network">Network</label>' +
                '<select class="input" id="network"><option>TRC-20 (Tron)</option><option>ERC-20 (Ethereum)</option><option>BEP-20 (BNB Chain)</option></select></div>' +
                '<div class="field"><label>Deposit address</label>' +
                '<div class="input num address"><span>TQ7xNv9k2Hm4Lp8rYd3Wc6Ze1Bs5Fa0Gu</span>' +
                '<button type="button" data-copy-text="TQ7xNv9k2Hm4Lp8rYd3Wc6Ze1Bs5Fa0Gu" ' +
                'data-copy-note="Deposit address copied">Copy</button></div>' +
                '<span class="hint">Send only USDT on the selected network. Other assets are unrecoverable.</span></div>';
            }

            var pay = payCur(m);
            var start = pay.quick[1];
            var floor = pay.min || pay.quick[0];

            return '<div class="modal-form">' +
              logo +
              '<div class="field"><label for="amount">Amount</label>' +
                '<div class="input-wrap"><input class="input num" id="amount" value="' + start +
                  '" inputmode="decimal">' +
                '<span class="suffix">' + pay.cur + '</span></div>' +
                '<div class="quick">' + pay.quick.map(function (n) {
                  return '<button type="button" data-amount="' + n + '">' + F().count(n) + '</button>';
                }).join('') + '</div>' +
                '<span class="hint">Minimum ' + F().count(floor) + ' ' + pay.cur + '</span></div>' +
              inner +
              (m === 'card'
                /* Not a link to a hosted page: that page is a fixed form
                   that knows nothing about this deposit, so whatever is
                   paid through it arrives with no reference and can never
                   be matched to an account. The button runs the same
                   action M-Pesa does — the server opens a transaction for
                   this exact amount and hands back the checkout URL. */
                ? act(I('lock', 16) + 'Continue to Paystack', 'deposit', 'btn-pos') +
                  '<span class="hint" style="text-align:center">Paystack collects the card details. Nexas never sees them.</span>'
                : act('Confirm deposit', 'deposit', 'btn-pos')) +
            '</div>';
          }
        },
        pending: {
          title: 'Waiting for payment',
          sub: 'Leave this open until it clears.',
          noBack: true,
          body: function (s) {
            return waitingBody(
              s.method === 'mpesa' ? 'Check your phone' : 'Authorising with your bank',
              s.method === 'mpesa'
                ? 'An M-Pesa prompt for ' + s.payLabel + ' has been sent to +' + s.payTo +
                  '. Enter your PIN to approve it.'
                : 'Confirming ' + s.payLabel + ' with the card issuer.');
          }
        },
        failed: failStep('Deposit'),
        success: {
          title: 'Deposit received',
          sub: 'The funds are in your trading balance.',
          noBack: true,
          body: function (s) {
            return doneBody('Payment confirmed',
              s.payLabel + ' received and credited.',
              kv('Paid', s.payLabel) +
              kv('Credited', F().money(s.credited)) +
              kv('New balance', F().money(API().account.balance())) +
              kv('Reference', '<span class="num">' + s.ref + '</span>'));
          }
        }
      }
    },

    /* ---------------- contract result ----------------
       What the old card under the chart used to say, shown once the
       contract is actually settled and there is something to report. */
    result: {
      steps: {
        main: {
          title: function (s) {
            var c = s.contract || {};
            return c.status === 'won' ? 'Contract won'
              : c.status === 'sold' ? 'Sold early' : 'Contract lost';
          },
          sub: function (s) { return (s.contract || {}).symbolName || ''; },
          noBack: true,
          body: function (s) {
            var c = s.contract || {};
            var won = c.status === 'won';
            var sold = c.status === 'sold';
            var cls = c.profit >= 0 ? 'pos' : 'neg';

            return '<div class="outcome ' + cls + '">' +
                '<span class="label">' + API().contracts.label(c) + '</span>' +
                '<b class="num">' + F().signedMoney(c.profit) + '</b>' +
                '<span class="outcome-sub">' +
                  (won ? 'Paid ' + F().money(c.payout)
                    : sold ? 'Closed at ' + F().money(c.value)
                    : 'Stake not returned') +
                '</span>' +
              '</div>' +
              '<div class="modal-form">' +
                '<div class="totals">' +
                  kv('Stake', F().money(c.stake)) +
                  kv('Duration', F().ticks(c.ticks)) +
                  kv('Entry', '<span class="num">' + F().price(c.entrySpot) + '</span>') +
                  kv('Exit', '<span class="num">' + F().price(c.exitSpot) + '</span>') +
                  kv('Balance', F().money(API().account.balance())) +
                '</div>' +
                '<button class="btn btn-fill" type="button" data-close>Done</button>' +
              '</div>';
          }
        }
      }
    },

    /* ---------------- automated run result ---------------- */
    runResult: {
      steps: {
        main: {
          title: 'Run finished',
          sub: function (s) { return s.reason || ''; },
          noBack: true,
          body: function (s) {
            var r = s.run || {};
            var cls = r.pnl >= 0 ? 'pos' : 'neg';
            return '<div class="outcome ' + cls + '">' +
                '<span class="label">' + (r.done || 0) + ' of ' + (r.total || 0) + ' contracts</span>' +
                '<b class="num">' + F().signedMoney(r.pnl || 0) + '</b>' +
                '<span class="outcome-sub">Session result</span>' +
              '</div>' +
              '<div class="modal-form">' +
                '<div class="totals">' +
                  kv('Contracts placed', r.done || 0) +
                  kv('Opening stake', F().money(r.base || 0)) +
                  kv('Take profit', F().money(r.takeProfit || 0)) +
                  kv('Stop loss', F().money(r.stopLoss || 0)) +
                  kv('Balance', F().money(API().account.balance())) +
                '</div>' +
                '<button class="btn btn-fill" type="button" data-close>Done</button>' +
              '</div>';
          }
        }
      }
    },

    /* ---------------- refer and earn ---------------- */
    refer: {
      steps: {
        main: {
          title: 'Refer and earn',
          sub: 'Every referral who funds an account raises the payout on your own winning contracts. Nothing is paid out to you in cash.',
          body: function () {
            var R = API().referrals, link = R.link();
            var tier = R.tier(), next = R.next(), funded = R.funded();
            function stat(label, value, cls) {
              return '<div class="ref-stat"><span class="label">' + label + '</span>' +
                '<b class="num ' + (cls || '') + '">' + value + '</b></div>';
            }
            var progress = next
              ? '<div class="tier-next">' +
                  '<div class="tier-bar"><i style="width:' +
                    Math.round(Math.min(1, funded / next.funded) * 100) + '%"></i></div>' +
                  '<span>' + (next.funded - funded) + ' more funded ' +
                  (next.funded - funded === 1 ? 'referral' : 'referrals') + ' takes you to +' +
                  (next.boost * 100).toFixed(1) + '%</span>' +
                '</div>'
              : '<div class="tier-next"><span>You are on the top tier.</span></div>';

            return '<div class="ref-hero">' +
                stat('Payout boost', '+' + (tier.boost * 100).toFixed(1) + '%', 'pos') +
                stat('Funded', funded) +
                stat('Referrals', R.count()) +
              '</div>' +
              progress +
              '<div class="modal-form">' +
                '<div class="notice">' + I('spark', 17) +
                  '<span>A boost lifts what every winning contract pays you. Even/Odd at +' +
                  (tier.boost * 100).toFixed(1) + '% pays ' +
                  F().amount(API().contracts.payoutFor('even_odd', 10)) +
                  ' on a 10 stake instead of 19.53. It makes trading cheaper; it does not make it profitable.</span>' +
                '</div>' +
              '</div>' +
              '<div class="modal-form" style="padding-top:0">' +
                '<div class="field"><label>Your referral link</label>' +
                  '<div class="reflink">' +
                    '<i>' + I('link', 16) + '</i>' +
                    '<span class="num">' + link + '</span>' +
                    '<button type="button" data-copy-text="' + link + '" ' +
                      'data-copy-note="Referral link copied" aria-label="Copy referral link">' +
                      I('copy', 16) + '</button>' +
                  '</div>' +
                  '<span class="hint">Code ' + R.code() + ' is tied to your account.</span>' +
                '</div>' +
                '<button class="btn btn-fill" type="button" data-share="' + link + '">' +
                  I('send', 17) + 'Share referral link</button>' +
                '<button class="row ref-all" data-goto="list">' +
                  '<span class="ico">' + I('user', 18) + '</span>' +
                  '<span class="t"><b>All referrals</b><span>' + R.count() +
                    ' people joined with your link</span></span>' + I('chev', 16) +
                '</button>' +
                '<button class="row ref-all" data-goto="tiers">' +
                  '<span class="ico">' + I('sliders', 18) + '</span>' +
                  '<span class="t"><b>How the tiers work</b><span>Every level and what it pays</span></span>' +
                  I('chev', 16) +
                '</button>' +
              '</div>';
          }
        },
        list: {
          title: 'Your referrals',
          sub: 'A referral counts once that person funds their account.',
          body: function () {
            var R = API().referrals, rows = R.list();
            if (!rows.length) {
              return '<div class="empty" style="padding:30px 10px">' + I('gift', 24) +
                '<b>No referrals yet</b><span>Share your link to get started.</span></div>';
            }
            return '<div class="list" style="margin:0">' + rows.map(function (r) {
              return '<div class="trow">' +
                '<span class="ico ' + (r.funded ? 'pos' : '') + '">' +
                  I(r.funded ? 'check' : 'clock', 16) + '</span>' +
                '<span class="t"><b>' + r.name + '</b>' +
                  '<span>Joined ' + F().ago(r.joined) + '</span></span>' +
                '<span class="p"><span class="num ' + (r.funded ? 'pos' : '') + '">' +
                  (r.funded ? 'counts' : '—') + '</span>' +
                  '<span class="sub">' + (r.funded ? 'funded' : 'not funded yet') + '</span></span>' +
              '</div>';
            }).join('') + '</div>';
          }
        },
        tiers: {
          title: 'Boost tiers',
          sub: 'Your tier is set by how many referrals have funded an account.',
          body: function () {
            var R = API().referrals, now = R.tier(), funded = R.funded();
            return '<div class="list" style="margin:0">' + R.tiers.map(function (t) {
              var on = t.funded === now.funded;
              return '<div class="trow' + (on ? ' on' : '') + '">' +
                '<span class="ico ' + (on ? 'live' : '') + '">' +
                  (t.funded ? t.funded : I('check', 15)) + '</span>' +
                '<span class="t"><b>+' + (t.boost * 100).toFixed(1) + '% payout</b>' +
                  '<span>' + (t.funded === 0 ? 'No funded referrals yet'
                    : t.funded + '+ funded referrals') + '</span></span>' +
                '<span class="p"><span class="sub">' +
                  (on ? 'you are here' : funded >= t.funded ? 'reached' : 'locked') +
                '</span></span></div>';
            }).join('') + '</div>' +
            '<p class="hint" style="margin:14px 2px 0">The top tier stays under the house margin on ' +
            'every contract, so a boost lowers the cost of trading rather than removing it.</p>';
          }
        }
      }
    },

    /* ---------------- withdraw ---------------- */
    withdraw: {
      steps: {
        choose: {
          title: 'Withdraw funds',
          sub: 'Reviewed and paid within one hour.',
          body: function () {
            return '<div class="balance-strip"><span class="label">Available</span>' +
              '<b class="num">' + F().money(API().account.balance()) + '</b></div>' +
              method('mpesa', 'phone', 'M-Pesa', 'To the number on your profile') +
              methodOff('coin', 'USDT', 'Crypto payouts are not open yet');
          }
        },
        form: {
          title: function (s) { return 'Withdraw to ' + (NAMES[s.method] || 'M-Pesa'); },
          sub: 'Minimum $10. One free withdrawal per day.',
          body: function (s) {
            var inner = s.method === 'usdt'
              ? '<div class="field"><label for="wNetwork">Network</label>' +
                '<select class="input" id="wNetwork"><option>TRC-20 (Tron)</option><option>ERC-20 (Ethereum)</option></select></div>' +
                field('wAddress', 'Wallet address', 'placeholder="T..."', 'Check carefully. Transfers cannot be reversed.')
              : phoneField('wPhone', 'M-Pesa number',
                  'Must match the number registered to your verified name.');

            /* The sheet works in the viewer's own money from the first
               figure: the field, the fee and the total are all display
               units, so nothing here is converted twice. The USD figures
               behind them (10 minimum, 1 fee) are converted once, here. */
            var feeLocal = Math.round(API().money.toDisplay(1) * 100) / 100;
            var startLocal = Math.round(API().money.toDisplay(100));

            return '<div class="modal-form">' +
              '<div class="field"><label for="wAmount">Amount</label>' +
                '<div class="input-wrap"><input class="input num" id="wAmount" value="' + startLocal +
                  '" inputmode="decimal">' +
                '<span class="suffix">' + API().account.currency() + '</span></div>' +
                '<span class="hint">Minimum ' + F().money(10) + '</span></div>' +
              inner +
              '<div class="totals">' + kv('Network fee', F().localMoney(feeLocal)) +
                kv('You receive', F().localMoney(Math.max(0, startLocal - feeLocal)),
                   'data-total="wAmount" data-fee="' + feeLocal + '"') + '</div>' +
              (API().kyc.verified() ? '' :
                '<div class="notice">' + I('shield', 17) +
                '<span>Identity verification is required before your first payout.</span></div>') +
              act('Request withdrawal', 'withdraw', 'btn-pos') +
            '</div>';
          }
        },
        pending: {
          title: 'Sending your payout',
          sub: 'This usually clears in under a minute.',
          noBack: true,
          body: function (s) {
            return waitingBody('Payout in progress',
              'We are sending ' + F().money(s.sent) + ' to your ' +
              (NAMES[s.method] || 'M-Pesa') + ' account.');
          }
        },
        failed: failStep('Withdrawal'),
        success: {
          title: 'Payout sent',
          sub: 'Your provider will confirm by SMS.',
          noBack: true,
          body: function (s) {
            return doneBody('Withdrawal complete',
              F().money(s.sent) + ' is on its way.',
              kv('Amount', F().money(s.sent)) +
              kv('Network fee', F().money(1)) +
              kv('New balance', F().money(API().account.balance())) +
              kv('Reference', '<span class="num">' + s.ref + '</span>'));
          }
        },
        kyc: {
          title: 'Verification required',
          sub: 'A one-time check before the first payout leaves your account.',
          body: function () {
            return '<div class="modal-form">' +
              '<div class="notice">' + I('shield', 17) +
                '<span>Your funds stay in your account. Verification usually clears within the hour.</span></div>' +
              '<button class="btn btn-fill" type="button" data-open="verify">Verify identity</button>' +
              '<button class="btn btn-ghost" type="button" data-close>Later</button>' +
            '</div>';
          }
        }
      }
    }
  };
})();
