/* ============================================================
   Novi, modal definitions
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
  /* A name goes into an attribute here, and a name is whatever somebody
     typed. Quotes and angle brackets out, or a display name ending the
     value early takes the rest of the field with it. */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
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
  /* `all` opens the list to every dialling code rather than the seven
     we collect deposits from. A deposit can only be taken where the rail
     reaches, so that field stays narrow. A payout is sent by hand, so
     that one does not have to. */
  function phoneField(id, label, hint, all) {
    var cc = API().geo.code();
    var c = API().geo.country();
    /* The country is chosen here, not assumed. It used to be whatever
       the IP lookup had settled on, which for anyone it guessed wrongly
       meant a Kenyan code they could not change, on the one field where
       getting the country wrong means the money goes nowhere.

       The list is the countries we can actually send mobile money to,
       not all 195: offering Germany on an M-Pesa payout is offering
       something that cannot happen. */
    if (!all && !API().geo.countries[cc]) cc = 'KE';
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<div class="phone">' +
        '<span class="phone-cc" data-cc-picker="' + id + '" data-cc="' + cc + '"' +
          (all ? ' data-cc-all="1"' : '') + '></span>' +
        '<input type="hidden" id="' + id + 'Country" value="' + cc + '">' +
        '<input class="input num phone-input" id="' + id + '" type="tel" inputmode="numeric" ' +
          'autocomplete="tel-national" placeholder="' + c.sample + '">' +
      '</div>' +
      (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  }

  /* Just enough logo to confirm what is accepted. It sits above the
     form as a small chip rather than a banner, the white ground is
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

  /* The number on the account, and a way past it.

     Masked, because a deposit sheet is opened in public as often as
     anywhere else in the app, and unmasking it would serve nobody: the
     owner recognises their own number from the last three digits, and
     anybody else has no business reading the rest. */
  function savedNumber(masked, label, hint) {
    return '<div class="field">' +
      '<label>' + (label || 'M-Pesa number') + '</label>' +
      '<div class="input saved-num">' +
        I('phone', 17) +
        '<b class="num">' + (masked || 'On your account') + '</b>' +
        '<button type="button" class="saved-swap" data-set="newNumber:1" data-goto="form">' +
          'Use another' +
        '</button>' +
      '</div>' +
      '<span class="hint">' + (hint || 'The prompt goes to this number. ' +
        'Change it for good in Account.') + '</span>' +
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
  /* Every rail is quoted in dollars now, because the account is. What
     changes per rail is what the customer's bank or handset will
     actually be debited, which is shown as a separate line at the moment
     it applies rather than by pricing the whole product in it. */
  function payCur() {
    return { cur: 'USD', rate: 1, min: API().money.minDepositUsd(), quick: [5, 10, 25, 50, 100] };
  }

  /* What the phone or the card is actually debited, for a rail that
     cannot charge dollars. Null when there is nothing to convert.

     It is a live line rather than a footnote: the figure that leaves
     somebody's account is the one they check against their SMS, and a
     note pinned to the minimum while the field says something else is
     worse than no note at all. */
  function railChargeLine(methodId, usd) {
    if (methodId === 'usdt') return '';
    var c = API().geo.country();
    if (!c.cur || !c.rate || c.rate === 1) return '';
    return '<span class="hint" data-charge="amount" data-rate="' + c.rate +
      '" data-cur="' + c.cur + '">Charged as ' +
      F().localMoney(Math.round(usd * c.rate), c.cur) + '</span>';
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
     what happened, whose problem it is, and what to do next, in that
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

  /* ---------------- the result card ----------------
     Shared by the contract result and the automated run result, so the
     two endings are the same card with different figures in it: a ring
     with a mark in it, the headline, the money, the rows, and one
     button. Green when the session or the contract came out ahead, red
     when it did not — the ring, the headline and the figure all move
     together, so the colour is readable before a word of it is. */
  function heroRow(k, v) {
    return '<div class="hero-row"><span>' + k + '</span><b>' + v + '</b></div>';
  }
  function heroBody(o) {
    var tone = o.good ? 'good' : 'bad';
    return '<div class="hero-card ' + tone + '">' +
        '<div class="hero-mark">' + I(o.good ? 'check' : 'close', 34) + '</div>' +
        '<h2 class="hero-title">' + o.title + '</h2>' +
        '<div class="hero-amount num">' + o.amount + '</div>' +
        '<div class="hero-rows">' + o.rows + '</div>' +
        '<button class="hero-close" type="button" data-close>Close</button>' +
      '</div>';
  }
  /* What stopped the run, said as a headline rather than as the sentence
     the terminal passes through. The sentence is still what a toast
     carries when there is no dialog. */
  /* Every result card is headed the same way, Contract Won or Contract
     Lost, whether one contract settled or a run ended on its target or
     stop. "Session Closed in Profit" and "Target Profit Reached" read as
     a different kind of event from the same thing. */
  /* An automated run is headed by why it ended; a single manual trade
     by whether it won. */
  function runHeadline(r) {
    if (r.endKind === 'take_profit') return 'Target Profit Reached';
    if (r.endKind === 'stop_loss') return 'Stop Loss Reached';
    if (r.endKind === 'stopped') return 'Run Stopped';
    return (r.pnl || 0) >= 0 ? 'Contract Won' : 'Contract Lost';
  }
  function tickTally(w, l) {
    return '<span class="hero-w">' + w + 'W</span> / <span class="hero-l">' + l + 'L</span>';
  }

  /* The final step after verification: a deposit of the unlock amount.
     Shared by the verify screen and the withdrawal gate so the two say
     the same thing. */
  function fundStep() {
    var A = API().account;
    var need = A.unlockUsd;
    var left = Math.max(0, Math.round((need - A.deposited()) * 100) / 100);
    return '<div class="notice">' + I('shield', 17) +
        '<span><b>Final step: deposit ' + need + ' USD.</b> Withdrawals open once ' +
        need + ' USD has been deposited to your account' +
        (left < need ? ', ' + left + ' USD to go' : '') + '.</span></div>' +
      '<button class="btn btn-fill" type="button" data-open="deposit">Deposit ' + need + ' USD</button>';
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

            /* The flag is the fastest way to say which money this is.
               Both balances are held in dollars underneath, and the real
               one is now quoted that way on its face as well, so the
               figure on the card is the figure in the ledger. */
            function row(id, name, note, value, cc) {
              return '<button class="choice' + (kind === id ? ' selected' : '') + '" data-action="useAccount" data-kind="' + id + '">' +
                '<span class="dot"></span>' +
                (cc ? '<span class="c-flag">' + window.NexFlag(cc) + '</span>' : '') +
                '<span class="c-t"><b>' + name + '</b><span>' + note + '</span></span>' +
                '<span class="c-v num">' + value + '</span></button>';
            }

            /* Without an account there is no real balance to show, so the
               row does not pretend there is one. Showing $0.00 would be a
               number about money this visitor does not have. */
            return '<div class="choices">' +
              (canReal
                ? row('real', 'Real', cur + ' · live funds', F().amount(b.real), 'US')
                : row('real', 'Real', 'Create an account to trade real funds', 'Sign up', 'US')) +
              row('demo', 'Demo', cur + ' · practice funds', F().amount(b.demo), 'US') +
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

    /* ---------------- open a ticket ----------------
       The asking happens here rather than on the page behind it, which
       is the record of what has already been asked. */
    ticket: {
      steps: {
        form: {
          title: 'Open a ticket',
          sub: 'We answer within 30 minutes.',
          body: function () {
            return '<div class="modal-form">' +
              '<div class="field"><label for="tCat">What is this about</label>' +
                '<div id="tCatSel"></div></div>' +
              '<div class="field"><label for="tBody">What happened</label>' +
                '<textarea class="input ticket-text" id="tBody" rows="6" maxlength="2000" ' +
                  'placeholder="Dates, amounts and the number you used help us find it faster."></textarea>' +
                '<span class="hint" id="tCount">10 characters minimum</span></div>' +
              act('Send to support', 'sendTicket') +
            '</div>';
          }
        },
        done: okStep(
          'Ticket opened',
          'It is with the team.',
          function () { return 'We have it'; },
          function () {
            return 'Somebody is reading it now. The answer appears on this ' +
              'page, usually within half an hour.';
          },
          function () { return ''; })
      }
    },

    /* ---------------- what the scanner should look for ----------------
       Three contracts, three questions. Asking first is the difference
       between a scanner and a slot machine: the answer is only useful to
       somebody who had already decided what they were trading. */
    scan: {
      steps: {
        list: {
          title: 'Scan for',
          sub: 'Pick the contract, and the engine ranks every instrument for it.',
          body: function (s) {
            function row(id, name, note) {
              return '<button class="choice' + (s.family === id ? ' selected' : '') +
                  '" data-scanfamily="' + id + '">' +
                '<span class="dot"></span>' +
                '<span class="c-t"><b>' + name + '</b><span>' + note + '</span></span>' +
                I('chev', 16) + '</button>';
            }
            return '<div class="choices">' +
              row('even_odd', 'Even / Odd', 'Is the last digit even or odd') +
              row('matches', 'Matches / Differs', 'Does the last digit hit one number') +
              row('over_under', 'Over / Under', 'Is the last digit above or below a barrier') +
            '</div>';
          }
        }
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
          sub: 'The run keeps trading until it reaches the take profit or the stop loss.',
          body: function () {
            var a = API().prefs.auto();
            return '<div class="modal-form">' +
              field('autoMult', 'Stake × on loss', 'value="' + a.multiplier + '" inputmode="decimal"') +
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
            /* The legal name, not whatever is being shown around the app:
               these two fields are read against a document. */
            var parts = (who.legalName || who.name || '').trim().split(/\s+/);
            var first = parts[0] || '';
            var last = parts.slice(1).join(' ');
            var locked = !!who.nameLocked;

            /* Verified accounts cannot type over the name that was
               verified. Shown as fixed rather than hidden: a field that
               vanishes looks like a bug, and one that silently refuses to
               save is worse. */
            var lockNote = locked
              ? 'Fixed by your identity check. Contact support if it is wrong.'
              : '';
            var lockAttr = locked ? ' disabled' : '';

            return '<div class="modal-form">' +
              field('firstName', 'First name',
                'value="' + esc(first) + '" autocomplete="given-name" placeholder="First name"' + lockAttr) +
              field('lastName', 'Last name',
                'value="' + esc(last) + '" autocomplete="family-name" placeholder="Last name"' + lockAttr,
                lockNote) +
              field('displayName', 'Display name',
                'value="' + esc(who.displayName || who.name || '') + '" placeholder="How other traders see you"',
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

    /* ---------------- the deposit number ----------------
       Set at sign-up, changed here, and never shown in full again. The
       owner recognises their own from the last three digits, which is
       all this screen needs to do; anybody else reading over a shoulder
       gets nothing worth having. */
    phone: {
      steps: {
        form: {
          title: 'Deposit number',
          sub: 'Where the M-Pesa prompt is sent when you deposit.',
          body: function () {
            var who = API().session.get() || {};
            return '<div class="modal-form">' +
              (who.phoneSet
                ? '<div class="field"><label>On your account now</label>' +
                    '<div class="input saved-num">' + I('phone', 17) +
                      '<b class="num">' + who.phoneMasked + '</b></div>' +
                    '<span class="hint">Shown with the middle hidden. ' +
                      'Nobody, here or anywhere else, needs to read it in full.</span>' +
                  '</div>'
                : '<div class="notice">' + I('alert', 17) +
                    '<span>There is no number on your account yet. Add one and ' +
                    'deposits will be one tap.</span></div>') +
              phoneField('newPhone', who.phoneSet ? 'New number' : 'Your M-Pesa number',
                'Deposits are taken from this number, and it is where we reach you.') +
              act('Save number', 'savePhone') +
            '</div>';
          }
        },
        done: okStep(
          'Number saved',
          'Your next deposit goes to it.',
          'Deposit number updated',
          'Your next deposit prompt goes to this number. We will only ever ' +
          'show it back to you with the middle hidden.',
          function (s) {
            return kv('Now paying from', s.savedPhone || 'your new number');
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
          title: 'Verify your account',
          sub: 'Reviewed within an hour. Needed before your first withdrawal.',
          body: function () {
            /* What to send, kept in one place: the rejected branch shows
               the same list under a notice rather than a second copy of
               it that can drift. */
            function badge(doc) {
              return API().kyc.sent(doc) ? '<span class="badge ok">Sent</span>'
                : '<span class="badge warn">Required</span>';
            }
            function checklist() {
              return '<div class="modal-form"><div class="list" style="margin:0">' +
                '<div class="row"><span class="ico pos">' + I('check', 18) + '</span>' +
                  '<span class="t"><b>Email address</b><span>' + maskEmail() + '</span></span>' +
                  '<span class="badge ok">Done</span></div>' +
                '<button class="row" data-goto="upload" data-set="doc:Proof of address">' +
                  '<span class="ico">' + I('card', 18) + '</span>' +
                  '<span class="t"><b>Proof of address</b>' +
                    '<span>Bill or statement, last 3 months</span></span>' +
                  badge('Proof of address') + '</button>' +
                /* Front and back, two pictures: the upload step asks
                   for both when this is the document. */
                '<button class="row" data-goto="upload" data-set="doc:Government ID">' +
                  '<span class="ico">' + I('idcard', 18) + '</span>' +
                  '<span class="t"><b>Government ID</b>' +
                    '<span>National ID, passport or driving licence</span></span>' +
                  badge('Government ID') + '</button>' +
              '</div></div>';
            }

            var state = API().kyc.status();

            if (state === 'verified') {
              var A = API().account;
              if (!A.withdrawUnlocked()) {
                return '<div class="modal-form">' +
                  '<div class="empty" style="padding:18px 10px 8px">' + I('check', 24) +
                    '<b>Account verified</b><span>One last step before you can withdraw.</span></div>' +
                  fundStep() +
                '</div>';
              }
              return '<div class="empty" style="padding:26px 10px">' + I('check', 24) +
                '<b>Account verified</b><span>Withdrawals are open on this account.</span></div>';
            }

            /* Under review is a different answer from not started, and a
               customer who cannot tell them apart sends it again. */
            /* The list stays under it, so a second document (the ID after
               proof of address, or the other way round) can still be sent. */
            var missing = API().kyc.missing();
            if (state === 'pending' && missing.length) {
              return '<div class="modal-form"><div class="notice">' + I('alert', 17) +
                '<span>One more to send: your ' + missing[0].toLowerCase() + '. Both documents are ' +
                'needed before we can verify the account.</span></div></div>' + checklist();
            }
            if (state === 'pending') {
              return '<div class="modal-form"><div class="notice">' + I('clock', 17) +
                '<span>Under review. Your document is with us, most are checked ' +
                'within the hour, and the answer appears here.</span></div></div>' + checklist();
            }

            if (state === 'rejected') {
              return '<div class="modal-form"><div class="notice">' + I('alert', 17) +
                '<span>That document was not accepted. Send another and we will look ' +
                'again.</span></div></div>' + checklist();
            }

            return checklist();
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
              kv('Then', 'Deposit ' + API().account.unlockUsd + ' USD') +
              kv('Unlocks', 'Withdrawals');
          })
      }
    },

    /* ---------------- deposit ---------------- */
    deposit: {
      steps: {
        choose: {
          title: 'Deposit funds',
          sub: 'Funds land in the account you are trading. No fee from Novi.',
          body: function () {
            var lo = API().money.minDepositUsd();
            return method('mpesa', 'phone', 'M-Pesa',
                'Instant · USD ' + F().count(lo) + ' - ' + F().count(1200)) +
              method('card', 'card', 'Card', 'Visa and Mastercard · secured by Paystack') +
              method('usdt', 'coin', 'USDT', 'TRC-20 only · credited after one confirmation');
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
              /* The number the account was opened with, shown with its
                 middle taken out. Nobody should have to type twelve
                 digits at the one moment they are in a hurry, and a
                 mistyped digit here is a prompt sent to a stranger's
                 handset.

                 What is rendered is the masked form and nothing else —
                 the page has never been given the rest, and the deposit
                 goes out saying "the number on my account" rather than
                 carrying it. */
              var who = API().session.get() || {};
              inner = (who.phoneSet && !s.newNumber)
                ? savedNumber(who.phoneMasked)
                : phoneField('mpesaPhone', 'M-Pesa number',
                    'You will receive an STK push on this number. Enter your PIN to confirm.');
            } else if (m === 'card') {
              /* No card fields here by design: taking a PAN on our own form
                 would drag this page into PCI scope for no benefit. One
                 short line is all this step needs, the rest is Paystack's
                 job, and the whole sheet fits without scrolling. */
              logo = brandMark('assets/cards.png', 'Visa and Mastercard', 'assets/cards-ink.png');
              inner = '<div class="handoff">' +
                  '<span class="handoff-mark">' + I('lock', 18) + '</span>' +
                  '<div class="handoff-t">' +
                    '<p>Card details are entered on Paystack\'s secure checkout. ' +
                    'Novi never sees your card number.</p>' +
                  '</div>' +
                '</div>';
            } else {
              /* One network, no menu. A customer choosing a chain from a
                 list is a customer who can choose the wrong one, and USDT
                 sent over the wrong chain does not come back.

                 The address comes from the server rather than being
                 written into the page, so changing wallets is one
                 environment variable and not a deploy. */
              var served = (window.NexNet && window.NexNet.settings && window.NexNet.settings()) || {};
              var w = served.usdt || (window.NEXAS_CONFIG || {}).usdt || {};
              var addr = w.address || '';

              inner = !addr
                ? '<div class="notice">' + I('alert', 17) +
                    '<span>The deposit address is not available just now. ' +
                    'Try again in a moment.</span></div>'
                : '<div class="field"><label>Network</label>' +
                    '<div class="input" style="display:flex;align-items:center;gap:8px">' +
                      I('link', 16) + '<b>' + (w.network || 'TRC-20') + ' (Tron)</b></div>' +
                    '<span class="hint">The only network we accept. USDT sent on ' +
                      'any other chain cannot be recovered.</span></div>' +
                  '<div class="field"><label>Send USDT to</label>' +
                    '<div class="input num address"><span>' + addr + '</span>' +
                    '<button type="button" data-copy-text="' + addr + '" ' +
                    'data-copy-note="Deposit address copied">Copy</button></div></div>' +
                  '<div class="field"><label for="txHash">Transaction hash</label>' +
                    '<input class="input num" id="txHash" autocomplete="off" spellcheck="false" ' +
                      'placeholder="Paste it after you send">' +
                    '<span class="hint">From your wallet, once the transfer is out. ' +
                      'It is how we find your transfer and credit this account.</span></div>';
            }

            var pay = payCur();
            var start = pay.quick[1];
            var floor = pay.min || pay.quick[0];
            var charged = railChargeLine(m, start);

            return '<div class="modal-form">' +
              logo +
              '<div class="field"><label for="amount">Amount</label>' +
                '<div class="input-wrap"><input class="input num" id="amount" value="' + start +
                  '" inputmode="decimal">' +
                '<span class="suffix">' + pay.cur + '</span></div>' +
                '<div class="quick">' + pay.quick.map(function (n) {
                  return '<button type="button" data-amount="' + n + '">' + F().count(n) + '</button>';
                }).join('') + '</div>' +
                '<span class="hint">Minimum ' + F().count(floor) + ' ' + pay.cur + '</span>' +
                charged + '</div>' +
              inner +
              (m === 'card'
                /* Not a link to a hosted page: that page is a fixed form
                   that knows nothing about this deposit, so whatever is
                   paid through it arrives with no reference and can never
                   be matched to an account. The button runs the same
                   action M-Pesa does, the server opens a transaction for
                   this exact amount and hands back the checkout URL. */
                ? act(I('lock', 16) + 'Continue to Paystack', 'deposit', 'btn-pos') +
                  '<span class="hint" style="text-align:center">Paystack collects the card details. Novi never sees them.</span>'
                : m === 'usdt'
                  /* Says what it does. This button does not move money,
                     it tells us money has already moved, and a button
                     labelled "confirm deposit" on a chain transfer is a
                     promise the rail cannot keep. */
                  ? act('I have sent it', 'deposit', 'btn-pos') +
                    '<span class="hint" style="text-align:center">' +
                      'Checked against the chain and credited, usually within the hour.</span>'
                  : act('Confirm deposit', 'deposit', 'btn-pos')) +
            '</div>';
          }
        },
        /* A chain transfer has already left the customer's wallet by the
           time we hear about it. There is nothing to wait for on this
           screen and nothing for them to do, so it says so and lets them
           go rather than holding them on a spinner. */
        reported: {
          title: 'Transfer received',
          sub: 'We are checking it against the chain.',
          noBack: true,
          body: function (s) {
            return '<div class="modal-form">' +
              '<div class="empty" style="padding:22px 10px">' + I('check', 24) +
                '<b>We have it</b>' +
                '<span>Your transfer is with us. It is credited once it has a ' +
                'confirmation, usually within the hour, and the balance moves ' +
                'on its own.</span></div>' +
              '<div class="totals">' +
                kv('Amount', F().usd((s.credited || 0))) +
                kv('Reference', s.ref || '') +
              '</div>' +
              '<button class="btn btn-ghost" type="button" data-close>Close</button>' +
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
                ? 'An M-Pesa prompt for ' + s.payLabel + ' has been sent to ' +
                  (s.payToLabel || ('+' + s.payTo)) + '. Enter your PIN to approve it.'
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

    /* ---------------- the celebration shell ----------------
       One card, used by both endings: a contract settling by hand and a
       whole automated run stopping. A ring with a mark in it, what
       happened, the money, the figures, and one way out.

       No title bar over it. The headline is the content here, and a
       second copy of it in a head with a close button beside it made the
       card read as a form rather than as a result. The backdrop and
       Escape still close it; so does the button, which is the whole
       width of the card because it is the only thing to do. */
    /* ---------------- contract result ----------------
       What the old card under the chart used to say, shown once the
       contract is actually settled and there is something to report. */
    result: {
      steps: {
        main: {
          title: function (s) {
            var c = s.contract || {};
            return (c.status === 'won' || (c.status === 'sold' && c.profit >= 0)) ? 'Contract won' : 'Contract lost';
          },
          hero: true,
          noBack: true,
          body: function (s) {
            var c = s.contract || {};
            var won = c.status === 'won';
            var sold = c.status === 'sold';
            var good = c.profit >= 0;

            return heroBody({
              good: good,
              title: (won || (sold && good)) ? 'Contract Won' : 'Contract Lost',
              amount: F().signedUsd(c.profit),
              /* Three rows: what was risked, how long it ran, where the
                 balance stands now. The entry and exit spots used to sit
                 between them — five decimal places of working that
                 nobody reads after the fact, pushing the one figure that
                 matters down the card. They are still on the contract,
                 and History still shows them. */
              rows:
                heroRow('Contract:', API().contracts.label(c)) +
                heroRow('Duration:', F().ticks(c.ticks)) +
                heroRow('Wins / Losses:', tickTally(c.tickWins || 0, c.tickLosses || 0)) +
                heroRow('Stake:', F().money(c.stake)) +
                heroRow(won ? 'Payout:' : sold ? 'Closed at:' : 'Returned:',
                  won ? F().money(c.payout) : sold ? F().money(c.value) : F().money(0)) +
                heroRow('Balance:', F().money(API().account.balance()))
            });
          }
        }
      }
    },

    /* ---------------- automated run result ---------------- */
    runResult: {
      steps: {
        main: {
          title: function (s) { return runHeadline(s.run || {}); },
          hero: true,
          noBack: true,
          body: function (s) {
            var r = s.run || {};
            var w = r.tickWins || 0;
            var l = r.tickLosses || 0;
            var ticks = w + l;
            var rate = ticks ? (w / ticks * 100) : 0;

            return heroBody({
              good: (r.pnl || 0) >= 0,
              title: runHeadline(r),
              amount: F().signedUsd(r.pnl || 0),
              rows:
                heroRow('Total Trades:', ticks) +
                heroRow('Wins / Losses:', tickTally(w, l)) +
                heroRow('Win Rate:', rate.toFixed(1) + '%')
            });
          }
        }
      }
    },

    /* ---------------- copy-trading key ---------------- */
    copyKey: {
      steps: {
        main: {
          title: 'Activate with key',
          sub: 'Enter the activation key support gave you.',
          body: function () {
            return '<div class="modal-form">' +
              field('copyKey', 'Activation key',
                'autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX"',
                'Each key works once, on one account.') +
              act('Activate', 'copyKey') +
              '<button class="btn btn-ghost" type="button" data-close>Cancel</button>' +
            '</div>';
          }
        },
        done: okStep(
          'Copy trading active',
          null,
          'Key accepted',
          'Copy trading is now on for this account. Pick a strategy to follow.')
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
                  (r.funded ? 'counts' : '') + '</span>' +
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
              method('card', 'card', 'Card', 'Back to the card you deposited with') +
              method('usdt', 'coin', 'USDT', 'TRC-20, ERC-20 or BEP-20');
          }
        },
        form: {
          title: function (s) { return 'Withdraw to ' + (NAMES[s.method] || 'M-Pesa'); },
          sub: function () {
            return 'Minimum ' + F().localMoney(API().money.minWithdrawDisplay()) +
              '. One free withdrawal per day.';
          },
          body: function (s) {
            var inner;
            if (s.method === 'usdt') {
              inner = '<div class="field"><label for="wNetwork">Network</label>' +
                '<select class="input" id="wNetwork"><option>TRC-20 (Tron)</option>' +
                '<option>ERC-20 (Ethereum)</option><option>BEP-20 (BNB Chain)</option></select></div>' +
                field('wAddress', 'Wallet address', 'placeholder="T..."',
                  'Check carefully. Transfers cannot be reversed.');
            } else if (s.method === 'card') {
              /* Bank, name and account number. A payout is a transfer
                 into an account, not a reverse card charge: somebody who
                 deposited by phone has no card to send it back to, and
                 somebody who did deposit by card may have closed it since.

                 Deliberately not the card number. We never ask for a PAN
                 on our own form, and we could not use one for a payout
                 anyway. */
              inner = field('wBank', 'Bank', 'placeholder="Equity, KCB, Co-operative"') +
                field('wCardName', 'Name on the account', 'placeholder="As it appears at the bank"') +
                field('wAccount', 'Account number', 'inputmode="numeric" placeholder="0123456789"',
                  'Payouts are sent to an account in your own name. A mismatch is the ' +
                  'one thing that delays a transfer.');
            } else {
              /* The number on the account, the same one the deposit
                 sheet pays from, masked the same way. A payout to a
                 number typed in a hurry is the mistake that cannot be
                 taken back, and the number already on file is the one
                 that funded the account.

                 Every dialling code behind "Use another", not only the
                 seven the deposit rails cover: a payout is sent by a
                 person, so where it can go is not limited by what we can
                 collect. */
              var who = API().session.get() || {};
              inner = (who.phoneSet && !s.newNumber)
                ? savedNumber(who.phoneMasked, 'Mobile money number',
                    'Where the payout is sent. It must be registered to your ' +
                    'verified name. Change it for good in Account.')
                : phoneField('wPhone', 'Mobile money number',
                    'Must match the number registered to your verified name.', true);
            }

            /* The sheet works in the viewer's own money from the first
               figure to the last: the field, the minimum and the total
               are all display units, so nothing here is converted twice.

               There is no fee row any more. Nothing on the server takes a
               cut, so a "network fee" line was a figure we invented that
               made the customer expect less than we actually send, and at
               a 100 KES floor a one-dollar fee ate the whole payout. */
            var minLocal = API().money.minWithdrawDisplay();
            var startLocal = Math.max(minLocal, Math.round(API().money.toDisplay(
              Math.min(API().account.balance(), 100))));

            return '<div class="modal-form">' +
              '<div class="field"><label for="wAmount">Amount</label>' +
                '<div class="input-wrap"><input class="input num" id="wAmount" value="' + startLocal +
                  '" inputmode="decimal">' +
                '<span class="suffix">' + API().account.currency() + '</span></div>' +
                '<span class="hint">Minimum ' + F().localMoney(minLocal) + '</span></div>' +
              inner +
              '<div class="totals">' + kv('Available', F().money(API().account.balance())) +
                kv('You receive', F().localMoney(startLocal),
                   'data-total="wAmount" data-fee="0"') + '</div>' +
              (!API().kyc.verified()
                ? '<div class="notice">' + I('shield', 17) +
                  '<span>Identity verification is required before your first payout.</span></div>'
                : !API().account.withdrawUnlocked()
                  ? '<div class="notice">' + I('shield', 17) +
                    '<span>Deposit ' + API().account.unlockUsd + ' USD to unlock withdrawals.</span></div>'
                  : '') +
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
        fund: {
          title: 'One last step',
          sub: 'Your account is verified. A first deposit opens withdrawals.',
          body: function () {
            return '<div class="modal-form">' + fundStep() +
              '<button class="btn btn-ghost" type="button" data-close>Later</button>' +
            '</div>';
          }
        },
        kyc: {
          title: 'Verification required',
          sub: 'A one-time check before the first payout leaves your account.',
          body: function () {
            /* Somebody who already sent a document is waiting on us, not
               on themselves, and telling them to start over is how a
               queue gets a second copy of the same bill. */
            if (API().kyc.status() === 'pending') {
              return '<div class="modal-form">' +
                '<div class="notice">' + I('clock', 17) +
                  '<span>Your document is with us. Most are checked within the hour, ' +
                  'and your withdrawal opens the moment it clears.</span></div>' +
                '<button class="btn btn-ghost" type="button" data-close>Close</button>' +
              '</div>';
            }
            return '<div class="modal-form">' +
              '<div class="notice">' + I('shield', 17) +
                '<span>Your funds stay in your account. Verification usually clears within the hour.</span></div>' +
              '<button class="btn btn-fill" type="button" data-open="verify">' +
                (API().kyc.status() === 'rejected' ? 'Send another document' : 'Verify my account') + '</button>' +
              '<button class="btn btn-ghost" type="button" data-close>Later</button>' +
            '</div>';
          }
        }
      }
    }
  };
})();
