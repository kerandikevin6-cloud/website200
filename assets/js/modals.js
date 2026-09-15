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
  var PAYSTACK = 'https://paystack.shop/pay/vbpsa6pq5q';

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
    if (methodId === 'usdt' || !c.cur) return { cur: API().account.currency(), rate: 1, quick: [10, 25, 50, 100, 250] };
    return { cur: c.cur, rate: c.rate, quick: c.quick };
  }
  function localAmount(v, cur) {
    return window.NexFmt.count(Math.round(v)) + ' ' + cur;
  }

  /* The waiting and done screens are shared by deposit and withdraw, so
     both rails behave the same while we are still on mock money. */
  function waitingBody(headline, note) {
    return '<div class="await">' +
      '<div class="await-orb"><i></i><i></i><i></i></div>' +
      '<b>' + headline + '</b>' +
      '<span>' + note + '</span>' +
      '<button class="btn btn-ghost" type="button" data-close>Cancel</button>' +
    '</div>';
  }
  function doneBody(headline, note, rows) {
    return '<div class="done">' +
      '<span class="done-mark">' + I('check', 30) + '</span>' +
      '<b>' + headline + '</b>' +
      '<span>' + note + '</span>' +
      '</div>' +
      '<div class="modal-form">' +
        '<div class="totals">' + rows + '</div>' +
        '<button class="btn btn-fill" type="button" data-close>Done</button>' +
      '</div>';
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
            function row(id, name, note) {
              return '<button class="choice' + (kind === id ? ' selected' : '') + '" data-action="useAccount" data-kind="' + id + '">' +
                '<span class="dot"></span>' +
                '<span class="c-t"><b>' + name + '</b><span>' + note + '</span></span>' +
                '<span class="c-v num">' + F().amount(b[id]) + '</span></button>';
            }
            return '<div class="choices">' +
              row('real', 'Real', 'USD · live funds') +
              row('demo', 'Demo', 'USD · practice funds') +
            '</div><p class="hint" style="margin:14px 2px 0">Open positions stay with the account they were taken on.</p>';
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
        }
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
            return '<div class="modal-form">' +
              field('firstName', 'First name', 'value="Amara" autocomplete="given-name"') +
              field('lastName', 'Last name', 'value="Kimani" autocomplete="family-name"') +
              field('displayName', 'Display name', 'value="Amara K."', 'Shown in live chat and copy trading.') +
              submit('Save changes', 'Name updated') +
            '</div>';
          }
        }
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
        }
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
                '<span class="t"><b>Email address</b><span>am***a@mail.com</span></span>' +
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
        }
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
            var lo = c.rate ? Math.round(1 * c.rate / 10) * 10 : 1;
            var hi = c.rate ? Math.round(1200 * c.rate / 1000) * 1000 : 1200;
            return method('mpesa', 'phone', 'M-Pesa',
                'Instant · ' + money + ' ' + F().count(lo) + ' – ' + F().count(hi)) +
              method('card', 'card', 'Card', 'Visa, Mastercard, Verve · secured by Paystack') +
              method('usdt', 'coin', 'USDT', 'TRC-20 and ERC-20 · from $10');
          }
        },
        form: {
          title: function (s) { return 'Deposit with ' + (NAMES[s.method] || 'M-Pesa'); },
          sub: 'Funds usually appear within two minutes.',
          body: function (s) {
            var m = s.method || 'mpesa', inner;

            if (m === 'mpesa') {
              inner = phoneField('mpesaPhone', 'M-Pesa number',
                'You will receive an STK push on this number. Enter your PIN to confirm.');
            } else if (m === 'card') {
              /* No card fields here by design. Taking a PAN on our own form
                 would drag this page into PCI scope for no benefit, so the
                 details are only ever typed on Paystack's checkout. */
              inner = '<div class="handoff">' +
                  '<span class="handoff-mark">' + I('lock', 19) + '</span>' +
                  '<div class="handoff-t">' +
                    '<b>You finish this payment on Paystack</b>' +
                    '<p>Your card number is entered on Paystack\'s own secure checkout. ' +
                    'Nexas never sees or stores it. You will be brought back here once ' +
                    'the payment clears.</p>' +
                  '</div>' +
                '</div>' +
                '<div class="handoff-marks">' +
                  '<span>Visa</span><span>Mastercard</span><span>Verve</span><span>3-D Secure</span>' +
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

            return '<div class="modal-form">' +
              '<div class="field"><label for="amount">Amount</label>' +
                '<div class="input-wrap"><input class="input num" id="amount" value="' + start +
                  '" inputmode="decimal">' +
                '<span class="suffix">' + pay.cur + '</span></div>' +
                '<div class="quick">' + pay.quick.map(function (n) {
                  return '<button type="button" data-amount="' + n + '">' + F().count(n) + '</button>';
                }).join('') + '</div></div>' +
              inner +
              '<div class="totals">' +
                kv('Fee', localAmount(0, pay.cur)) +
                (pay.rate === 1 ? '' :
                  kv('Rate', '1 USD = ' + F().count(pay.rate) + ' ' + pay.cur)) +
                kv('Credited to ' + API().account.kind(), F().money(start / pay.rate),
                   'data-total="amount" data-fx="' + pay.rate + '"') +
              '</div>' +
              (m === 'card'
                ? '<a class="btn btn-fill" href="' + PAYSTACK + '" target="_blank" rel="noopener noreferrer">' +
                    I('lock', 16) + 'Continue to Paystack</a>' +
                  '<span class="hint" style="text-align:center">Opens Paystack in a new tab</span>'
                : act('Confirm deposit', 'deposit')) +
            '</div>';
          }
        },
        pending: {
          title: 'Waiting for payment',
          sub: 'Leave this open until it clears.',
          body: function (s) {
            return waitingBody(
              s.method === 'mpesa' ? 'Check your phone' : 'Authorising with your bank',
              s.method === 'mpesa'
                ? 'An M-Pesa prompt for ' + s.payLabel + ' has been sent to +' + s.payTo +
                  '. Enter your PIN to approve it.'
                : 'Confirming ' + s.payLabel + ' with the card issuer.');
          }
        },
        success: {
          title: 'Deposit received',
          sub: 'The funds are in your trading balance.',
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
              method('usdt', 'coin', 'USDT', 'TRC-20 · network fee applies');
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

            return '<div class="modal-form">' +
              '<div class="field"><label for="wAmount">Amount</label>' +
                '<div class="input-wrap"><input class="input num" id="wAmount" value="100" inputmode="decimal">' +
                '<span class="suffix">' + API().account.currency() + '</span></div></div>' +
              inner +
              '<div class="totals">' + kv('Network fee', F().money(1)) +
                kv('You receive', F().money(99), 'data-total="wAmount" data-fee="1"') + '</div>' +
              (API().kyc.verified() ? '' :
                '<div class="notice">' + I('shield', 17) +
                '<span>Identity verification is required before your first payout.</span></div>') +
              act('Request withdrawal', 'withdraw') +
            '</div>';
          }
        },
        pending: {
          title: 'Sending your payout',
          sub: 'This usually clears in under a minute.',
          body: function (s) {
            return waitingBody('Payout in progress',
              'We are sending ' + F().money(s.sent) + ' to your ' +
              (NAMES[s.method] || 'M-Pesa') + ' account.');
          }
        },
        success: {
          title: 'Payout sent',
          sub: 'Your provider will confirm by SMS.',
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
