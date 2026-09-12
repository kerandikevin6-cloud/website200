/* ============================================================
   Nexas — chart
   Canvas price chart: line or candles, zoom and pan, a crosshair
   readout, and markers for the contracts currently running.
   Redraws on requestAnimationFrame and only while visible.
   ============================================================ */
(function () {
  "use strict";

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function Chart(canvas, opts) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.symbol = opts.symbol;
    this.type = 'line';        /* line | candle */
    this.agg = 1;              /* points per candle */
    this.count = 120;          /* visible points */
    this.offset = 0;           /* points scrolled back from the live edge */
    this.markers = [];
    this.cross = null;
    this.dirty = true;
    this.padR = 64;
    this.padB = 22;
    this.padT = 12;

    this._bind();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  Chart.prototype._bind = function () {
    var self = this, cv = this.cv;

    this._onResize = function () { self.resize(); };
    window.addEventListener('resize', this._onResize);

    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect();
      self.cross = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (self.drag) {
        var dx = self.cross.x - self.drag.x;
        var per = (r.width - self.padR) / self.count;
        var shift = Math.round(dx / per);
        if (shift) {
          self.offset = Math.max(0, Math.min(self.data().length - self.count, self.drag.offset + shift));
        }
      }
      self.dirty = true;
    });
    cv.addEventListener('pointerleave', function () { self.cross = null; self.dirty = true; });
    cv.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect();
      self.drag = { x: e.clientX - r.left, offset: self.offset };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointerup', function (e) {
      self.drag = null;
      try { cv.releasePointerCapture(e.pointerId); } catch (err) {}
    });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.zoom(e.deltaY > 0 ? 1.12 : 0.89);
    }, { passive: false });
  };

  Chart.prototype.data = function () {
    return window.NexAPI.feed.history(this.symbol);
  };

  Chart.prototype.setSymbol = function (s) { this.symbol = s; this.offset = 0; this.dirty = true; };
  Chart.prototype.setType = function (t) { this.type = t; this.dirty = true; };
  Chart.prototype.setAgg = function (n) { this.agg = n; this.dirty = true; };
  Chart.prototype.setMarkers = function (list) { this.markers = list || []; this.dirty = true; };
  Chart.prototype.zoom = function (factor) {
    var max = Math.min(this.data().length, 400);
    this.count = Math.max(30, Math.min(max, Math.round(this.count * factor)));
    this.offset = Math.max(0, Math.min(this.data().length - this.count, this.offset));
    this.dirty = true;
  };
  Chart.prototype.reset = function () { this.count = 120; this.offset = 0; this.dirty = true; };

  Chart.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = this.cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.w = r.width; this.h = r.height;
    this.cv.width = Math.round(r.width * dpr);
    this.cv.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dirty = true;
  };

  Chart.prototype._loop = function () {
    requestAnimationFrame(this._loop);
    if (document.hidden || !this.dirty) return;
    if (!this.w) this.resize();
    if (!this.w) return;
    this.dirty = false;
    this.draw();
  };

  Chart.prototype.visible = function () {
    var d = this.data();
    var end = d.length - this.offset;
    return d.slice(Math.max(0, end - this.count), end);
  };

  Chart.prototype.candles = function (points) {
    if (this.agg <= 1) return null;
    var out = [], i, j;
    for (i = 0; i < points.length; i += this.agg) {
      var slice = points.slice(i, i + this.agg);
      if (!slice.length) break;
      var o = slice[0].price, c = slice[slice.length - 1].price, hi = o, lo = o;
      for (j = 0; j < slice.length; j++) {
        hi = Math.max(hi, slice[j].price);
        lo = Math.min(lo, slice[j].price);
      }
      out.push({ t: slice[0].t, o: o, h: hi, l: lo, c: c });
    }
    return out;
  };

  Chart.prototype.draw = function () {
    var ctx = this.ctx, W = this.w, H = this.h;
    var points = this.visible();
    if (points.length < 2) return;

    var candles = this.type === 'candle' ? this.candles(points) : null;
    var min = Infinity, max = -Infinity, i;

    if (candles) {
      for (i = 0; i < candles.length; i++) { min = Math.min(min, candles[i].l); max = Math.max(max, candles[i].h); }
    } else {
      for (i = 0; i < points.length; i++) { min = Math.min(min, points[i].price); max = Math.max(max, points[i].price); }
    }
    var span = (max - min) || 1;
    min -= span * 0.14; max += span * 0.14; span = max - min;

    var w = W - this.padR, h = H - this.padB - this.padT;
    var self = this;
    function X(i) { return (i / (points.length - 1)) * w; }
    function Y(v) { return self.padT + (max - v) / span * h; }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = css('--chart-bg');
    ctx.fillRect(0, 0, W, H);
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    /* grid + price axis */
    for (var g = 0; g <= 4; g++) {
      var gy = this.padT + h * g / 4;
      ctx.strokeStyle = css('--chart-grid'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, Math.round(gy) + 0.5); ctx.lineTo(w, Math.round(gy) + 0.5); ctx.stroke();
      ctx.fillStyle = css('--chart-axis');
      ctx.fillText((max - span * g / 4).toFixed(2), w + 9, gy);
    }

    /* time axis */
    var fmt = window.NexFmt;
    ctx.textAlign = 'center';
    for (var k = 0; k <= 3; k++) {
      var idx = Math.round((points.length - 1) * k / 3);
      var tx = X(idx);
      ctx.fillStyle = css('--chart-axis');
      ctx.fillText(fmt.time(points[idx].t), Math.min(Math.max(tx, 26), w - 26), H - this.padB / 2 - 1);
    }
    ctx.textAlign = 'left';

    /* series */
    if (candles) {
      var cw = Math.max(2, (w / candles.length) * 0.62);
      for (i = 0; i < candles.length; i++) {
        var c = candles[i];
        var cx = (i + 0.5) / candles.length * w;
        var up = c.c >= c.o;
        ctx.strokeStyle = up ? css('--pos') : css('--neg');
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(cx) + 0.5, Y(c.h));
        ctx.lineTo(Math.round(cx) + 0.5, Y(c.l));
        ctx.stroke();
        var top = Y(Math.max(c.o, c.c)), bot = Y(Math.min(c.o, c.c));
        ctx.fillRect(cx - cw / 2, top, cw, Math.max(1, bot - top));
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(X(0), Y(points[0].price));
      for (i = 1; i < points.length; i++) ctx.lineTo(X(i), Y(points[i].price));
      ctx.strokeStyle = css('--chart-line');
      ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.lineTo(X(points.length - 1), H - this.padB);
      ctx.lineTo(X(0), H - this.padB);
      ctx.closePath();
      ctx.fillStyle = css('--chart-fill');
      ctx.fill();
    }

    /* contract markers: entry spot line, entry dot, settled outcome */
    var t0 = points[0].t, t1 = points[points.length - 1].t, tspan = (t1 - t0) || 1;
    function XT(t) { return Math.max(0, Math.min(w, (t - t0) / tspan * w)); }

    this.markers.forEach(function (m) {
      if (m.entryTime < t0 - 60000) return;
      var mx = XT(m.entryTime), my = Y(m.entrySpot);
      var live = m.status === 'open';
      var col = live ? css('--accent') : (m.profit >= 0 ? css('--pos') : css('--neg'));

      if (live) {
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, Math.round(my) + 0.5); ctx.lineTo(w, Math.round(my) + 0.5); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(mx, my - 5); ctx.lineTo(mx + 5, my); ctx.lineTo(mx, my + 5); ctx.lineTo(mx - 5, my);
      ctx.closePath();
      ctx.fillStyle = col; ctx.fill();

      if (!live && m.exitTime) {
        var ex = XT(m.exitTime), ey = Y(m.exitSpot);
        ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
      }
    });

    /* live price marker */
    var lastPt = points[points.length - 1];
    var ly = Y(lastPt.price);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = css('--chart-axis'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, Math.round(ly) + 0.5); ctx.lineTo(w, Math.round(ly) + 0.5); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(X(points.length - 1), ly, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = css('--chart-line'); ctx.fill();
    this._tag(lastPt.price.toFixed(2), ly, css('--surface'), css('--text'), css('--line'));

    /* crosshair readout */
    if (this.cross && this.cross.x < w && !this.drag) {
      var idx2 = Math.round((this.cross.x / w) * (points.length - 1));
      idx2 = Math.max(0, Math.min(points.length - 1, idx2));
      var p = points[idx2], px = X(idx2), py = Y(p.price);

      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(px) + 0.5, this.padT); ctx.lineTo(Math.round(px) + 0.5, H - this.padB); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, Math.round(py) + 0.5); ctx.lineTo(w, Math.round(py) + 0.5); ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = css('--accent'); ctx.fill();
      this._tag(p.price.toFixed(2), py, css('--accent'), '#fff', css('--accent'));

      /* time chip under the crosshair */
      var tl = fmt.time(p.t);
      ctx.font = '11px "IBM Plex Mono", monospace';
      var tw = ctx.measureText(tl).width + 14;
      var tx2 = Math.min(Math.max(px - tw / 2, 0), w - tw);
      ctx.fillStyle = css('--surface-3');
      ctx.fillRect(tx2, H - this.padB, tw, this.padB - 2);
      ctx.fillStyle = css('--text');
      ctx.textAlign = 'center';
      ctx.fillText(tl, tx2 + tw / 2, H - this.padB / 2 - 1);
      ctx.textAlign = 'left';
    }
  };

  Chart.prototype._tag = function (text, y, bg, fg, border) {
    var ctx = this.ctx, w = this.w - this.padR;
    var tw = Math.min(ctx.measureText(text).width + 14, this.padR - 6);
    var x = w + 4, ty = Math.max(2, Math.min(this.h - 24, y - 11));
    ctx.fillStyle = bg;
    ctx.fillRect(x, ty, tw, 22);
    ctx.strokeStyle = border; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, ty + 0.5, tw - 1, 21);
    ctx.fillStyle = fg;
    ctx.fillText(text, x + 7, ty + 11);
  };

  Chart.prototype.destroy = function () {
    window.removeEventListener('resize', this._onResize);
    this.dead = true;
  };

  window.NexChart = {
    create: function (canvas, opts) { return new Chart(canvas, opts || {}); }
  };
})();
