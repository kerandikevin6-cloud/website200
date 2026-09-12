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
              '<span class="hint">Use eight characters or more, with a number and a symbol.</span>' +
              submit('Update password', 'Password updated') +
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
            return '<div class="modal-form">' +
              '<div class="dropzone">' + I('up', 22) +
                '<b>' + (state.doc || 'Document') + '</b>' +
                '<span>Take a photo or choose a file from this device</span>' +
                '<button class="btn btn-ghost" type="button" data-done="File picker is not wired up in this draft">Choose file</button>' +
              '</div>' +
              act('Submit for review', 'verify') +
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
            return method('mpesa', 'phone', 'M-Pesa', 'Instant · KES 100 – 150,000') +
              method('card', 'card', 'Card', 'Visa / Mastercard · 1–3 minutes') +
              method('usdt', 'coin', 'USDT', 'TRC-20 and ERC-20 · from $10');
          }
        },
        form: {
          title: function (s) { return 'Deposit with ' + (NAMES[s.method] || 'M-Pesa'); },
          sub: 'Funds usually appear within two minutes.',
          body: function (s) {
            var m = s.method || 'mpesa', inner;

            if (m === 'mpesa') {
              inner = field('mpesaPhone', 'M-Pesa number', 'value="+254 7.. ... ..." inputmode="tel"',
                'You will receive an STK push. Enter your PIN to confirm.');
            } else if (m === 'card') {
              inner = field('cardNumber', 'Card number', 'placeholder="4242 4242 4242 4242" inputmode="numeric"') +
                '<div class="pair">' +
                  field('cardExp', 'Expiry', 'placeholder="MM / YY" inputmode="numeric"') +
                  field('cardCvc', 'CVC', 'placeholder="123" inputmode="numeric"') +
                '</div>';
            } else {
              inner = '<div class="field"><label for="network">Network</label>' +
                '<select class="input" id="network"><option>TRC-20 (Tron)</option><option>ERC-20 (Ethereum)</option><option>BEP-20 (BNB Chain)</option></select></div>' +
                '<div class="field"><label>Deposit address</label>' +
                '<div class="input num address">TQ7xNv9k2Hm4Lp8rYd3Wc6Ze1Bs5Fa0Gu<button type="button" data-copy>Copy</button></div>' +
                '<span class="hint">Send only USDT on the selected network. Other assets are unrecoverable.</span></div>';
            }

            return '<div class="modal-form">' +
              '<div class="field"><label for="amount">Amount</label>' +
                '<div class="input-wrap"><input class="input num" id="amount" value="50" inputmode="decimal">' +
                '<span class="suffix">' + API().account.currency() + '</span></div>' +
                '<div class="quick">' + [10, 25, 50, 100, 250].map(function (n) {
                  return '<button type="button" data-amount="' + n + '">' + n + '</button>';
                }).join('') + '</div></div>' +
              inner +
              '<div class="totals">' + kv('Fee', F().money(0)) +
                kv('Credited to ' + API().account.kind(), F().money(50), 'data-total="amount"') + '</div>' +
              act('Confirm deposit', 'deposit') +
            '</div>';
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
              : field('wPhone', 'M-Pesa number', 'value="+254 7.. ... ..." inputmode="tel"',
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
