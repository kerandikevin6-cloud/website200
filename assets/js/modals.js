/* ============================================================
   Nexas — modal definitions
   Each modal is a list of steps. A step returns markup for the
   sheet body; the engine in app.js handles the shell, the back
   and close controls, and step transitions.
     data-goto="stepId"      advance to another step
     data-set="method:usdt"  write a value into modal state
     data-done="message"     submit and close with a toast
   ============================================================ */
(function () {
  "use strict";

  var eye = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"></path><circle cx="12" cy="12" r="2.6"></circle></svg>';

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
      '<span class="ico">' + window.NexIcon(iconName, 19) + '</span>' +
      '<span class="t"><b>' + name + '</b><span>' + note + '</span></span>' +
      window.NexIcon('chev', 16) + '</button>';
  }
  function submit(label, done) {
    return '<button class="btn btn-fill" type="button" data-done="' + done + '">' + label + '</button>';
  }
  var NAMES = { mpesa: 'M-Pesa', card: 'Card', usdt: 'USDT' };

  window.NexModals = {

    /* ---------------- account switcher ---------------- */
    switch: {
      steps: {
        list: {
          title: 'Switch account',
          sub: 'Practise with virtual funds, or trade your real balance.',
          body: function () {
            return '<div class="choices">' +
              '<button class="choice selected" data-done="Staying on the real account">' +
                '<span class="dot"></span>' +
                '<span class="c-t"><b>Real</b><span>USD · live funds</span></span>' +
                '<span class="c-v num">2,480.00</span></button>' +
              '<button class="choice" data-done="Switched to the demo account">' +
                '<span class="dot"></span>' +
                '<span class="c-t"><b>Demo</b><span>USD · practice funds</span></span>' +
                '<span class="c-v num">10,000.00</span></button>' +
            '</div>' +
            '<p class="hint" style="margin:14px 2px 0">Open positions stay with the account they were taken on.</p>';
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
            return '<div class="modal-form">' +
              '<div class="list" style="margin:0">' +
                '<div class="row"><span class="ico" style="color:var(--pos);background:var(--pos-soft);border-color:transparent">' +
                  window.NexIcon('check', 18) + '</span>' +
                  '<span class="t"><b>Email address</b><span>am***a@mail.com</span></span>' +
                  '<span class="badge ok">Done</span></div>' +
                '<button class="row" data-goto="upload" data-set="doc:ID document">' +
                  '<span class="ico">' + window.NexIcon('idcard', 18) + '</span>' +
                  '<span class="t"><b>Government ID</b><span>Passport, national ID or licence</span></span>' +
                  '<span class="badge warn">Required</span></button>' +
                '<button class="row" data-goto="upload" data-set="doc:Proof of address">' +
                  '<span class="ico">' + window.NexIcon('card', 18) + '</span>' +
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
              '<div class="dropzone">' +
                window.NexIcon('up', 22) +
                '<b>' + (state.doc || 'Document') + '</b>' +
                '<span>Take a photo or choose a file from this device</span>' +
                '<button class="btn btn-ghost" type="button" data-done="Upload is not wired up in this draft">Choose file</button>' +
              '</div>' +
              submit('Submit for review', 'Submitted — we will email you within the hour') +
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
          sub: 'Funds land in your real account. No fee from Nexas.',
          body: function () {
            return method('mpesa', 'phone', 'M-Pesa', 'Instant · KES 100 – 150,000') +
              method('card', 'card', 'Card', 'Visa / Mastercard · 1–3 minutes') +
              method('usdt', 'coin', 'USDT', 'TRC-20 and ERC-20 · from $10');
          }
        },
        form: {
          title: function (state) { return 'Deposit with ' + (NAMES[state.method] || 'M-Pesa'); },
          sub: 'Funds usually appear within two minutes.',
          body: function (state) {
            var m = state.method || 'mpesa', inner = '';

            if (m === 'mpesa') {
              inner = field('mpesaPhone', 'M-Pesa number', 'value="+254 7.. ... ..." inputmode="tel"',
                'You will receive an STK push. Enter your PIN to confirm.');
            } else if (m === 'card') {
              inner = field('cardNumber', 'Card number', 'placeholder="4242 4242 4242 4242" inputmode="numeric" class="input num"') +
                '<div class="pair">' +
                field('cardExp', 'Expiry', 'placeholder="MM / YY" inputmode="numeric"') +
                field('cardCvc', 'CVC', 'placeholder="123" inputmode="numeric"') +
                '</div>';
            } else {
              inner = '<div class="field"><label for="network">Network</label>' +
                '<select class="input" id="network"><option>TRC-20 (Tron)</option><option>ERC-20 (Ethereum)</option><option>BEP-20 (BNB Chain)</option></select></div>' +
                '<div class="field"><label>Deposit address</label>' +
                '<div class="input num address">TQ7xNv9k2Hm4Lp8rYd3Wc6Ze1Bs5Fa0Gu' +
                '<button type="button" data-copy>Copy</button></div>' +
                '<span class="hint">Send only USDT on the selected network. Other assets are unrecoverable.</span></div>';
            }

            return '<div class="modal-form">' +
              '<div class="field"><label for="amount">Amount</label>' +
                '<div class="input-wrap"><input class="input num" id="amount" value="50" inputmode="decimal">' +
                '<span class="suffix">USD</span></div>' +
                '<div class="quick" data-amount-for="amount">' +
                  '<button type="button" data-amount="10">$10</button>' +
                  '<button type="button" data-amount="25">$25</button>' +
                  '<button type="button" data-amount="50">$50</button>' +
                  '<button type="button" data-amount="100">$100</button>' +
                  '<button type="button" data-amount="250">$250</button>' +
                '</div></div>' +
              inner +
              '<div class="totals"><div class="kv"><span>Fee</span><b>$0.00</b></div>' +
              '<div class="kv"><span>Credited</span><b data-total="amount">$50.00</b></div></div>' +
              submit('Confirm deposit', 'Deposit request sent') +
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
            return '<div class="balance-strip"><span class="label">Available</span><b class="num">2,480.00 USD</b></div>' +
              method('mpesa', 'phone', 'M-Pesa', 'To the number on your profile') +
              method('usdt', 'coin', 'USDT', 'TRC-20 · network fee applies');
          }
        },
        form: {
          title: function (state) { return 'Withdraw to ' + (NAMES[state.method] || 'M-Pesa'); },
          sub: 'Minimum $10. One free withdrawal per day.',
          body: function (state) {
            var inner = state.method === 'usdt'
              ? '<div class="field"><label for="wNetwork">Network</label>' +
                '<select class="input" id="wNetwork"><option>TRC-20 (Tron)</option><option>ERC-20 (Ethereum)</option></select></div>' +
                field('wAddress', 'Wallet address', 'placeholder="T..." class="input num"', 'Check carefully. Transfers cannot be reversed.')
              : field('wPhone', 'M-Pesa number', 'value="+254 7.. ... ..." inputmode="tel"', 'Must match the number registered to your verified name.');

            return '<div class="modal-form">' +
              '<div class="field"><label for="wAmount">Amount</label>' +
                '<div class="input-wrap"><input class="input num" id="wAmount" value="100" inputmode="decimal">' +
                '<span class="suffix">USD</span></div></div>' +
              inner +
              '<div class="totals"><div class="kv"><span>Network fee</span><b>$1.00</b></div>' +
              '<div class="kv"><span>You receive</span><b data-total="wAmount" data-fee="1">$99.00</b></div></div>' +
              '<div class="notice">' + window.NexIcon('shield', 17) +
                '<span>Identity verification is required before your first payout. ' +
                '<button type="button" class="link" data-open="verify">Verify now</button></span></div>' +
              submit('Request withdrawal', 'Withdrawal submitted for review') +
              '</div>';
          }
        }
      }
    }
  };
})();
