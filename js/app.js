(function () {
  "use strict";

  var CONFIG = null;
  var boardEl = document.getElementById("token-board");
  var adSlotEl = document.getElementById("ad-slot");
  var appEl = document.getElementById("app");
  var activeAdIntervals = [];

  // ---------- Config ----------

  function loadConfig() {
    return fetch("config.json")
      .then(function (r) { return r.json(); })
      .catch(function () {
        console.warn("Could not load config.json, using built-in defaults.");
        return {
          hospitalName: "Hospital",
          apiEndpoint: "/api/tokens",
          adsEndpoint: "/api/ads",
          pollIntervalMs: 5000,
          adsPollIntervalMs: 30000,
          columnsPerRow: 8,
          rowsVisible: 10,
          rowHeightPx: 34,
          holdMs: 4000,
          scrollTransitionMs: 1800
        };
      });
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- Token board ----------

  function fetchRoomData() {
    return fetch(CONFIG.apiEndpoint)
      .then(function (r) {
        if (!r.ok) { throw new Error("API returned " + r.status); }
        return r.json();
      })
      .catch(function (err) {
        console.warn("Live token API unavailable (" + err.message + "), showing sample data instead.");
        return window.MOCK_ROOMS || [];
      });
  }

  function renderBoard(rooms) {
    boardEl.innerHTML = "";
    var cols = Math.min(rooms.length, CONFIG.columnsPerRow) || 1;
    boardEl.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";

    rooms.forEach(function (room) {
      var col = document.createElement("div");
      col.className = "room-col";

      var header = document.createElement("div");
      header.className = "room-header";
      header.textContent = room.room;
      col.appendChild(header);

      var viewport = document.createElement("div");
      viewport.className = "room-viewport";
      viewport.style.height = (CONFIG.rowsVisible * CONFIG.rowHeightPx) + "px";

      var track = document.createElement("div");
      track.className = "room-track";

      room.tokens.forEach(function (tok) {
        var item = document.createElement("div");
        item.className = "token-row";
        item.style.height = CONFIG.rowHeightPx + "px";
        item.textContent = tok;
        track.appendChild(item);
      });

      viewport.appendChild(track);
      col.appendChild(viewport);
      boardEl.appendChild(col);

      setupStepReveal(track, room.tokens.length);
    });
  }

  // Holds the visible 10 tokens, then (only if there are more than 10)
  // gently scrolls to reveal the hidden ones, holds again, loops back.
  function setupStepReveal(track, tokenCount) {
    if (tokenCount <= CONFIG.rowsVisible) { return; }

    var pages = Math.ceil(tokenCount / CONFIG.rowsVisible);
    var offsets = [];
    for (var p = 0; p < pages; p++) {
      var rowOffset = p * CONFIG.rowsVisible;
      if (rowOffset + CONFIG.rowsVisible > tokenCount) {
        rowOffset = tokenCount - CONFIG.rowsVisible;
      }
      offsets.push(rowOffset);
    }

    track.style.transition = "transform " + CONFIG.scrollTransitionMs + "ms ease-in-out";

    var idx = 0;
    setInterval(function () {
      idx = (idx + 1) % offsets.length;
      var px = offsets[idx] * CONFIG.rowHeightPx;
      track.style.transform = "translateY(-" + px + "px)";
    }, CONFIG.holdMs);
  }

  // ---------- Ads: fetch + QR ----------

  function fetchAds() {
    return fetch(CONFIG.adsEndpoint)
      .then(function (r) {
        if (!r.ok) { throw new Error("API returned " + r.status); }
        return r.json();
      })
      .catch(function (err) {
        console.warn("Ad config unavailable (" + err.message + "), showing no ads.");
        return { format: "side-by-side", slideDurationMs: 8000, slides: [] };
      });
  }

  function buildQrSvg(text) {
    try {
      var qr = window.qrcode(0, "M");
      qr.addData(text);
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 0 });
    } catch (e) {
      console.warn("QR generation failed:", e);
      return "";
    }
  }

  function buildAdContent(slide) {
    var wrap = document.createElement("div");
    wrap.className = "ad-content";

    if (slide.image) {
      var img = document.createElement("img");
      img.className = "ad-image";
      img.src = slide.image;
      img.alt = "";
      wrap.appendChild(img);
    }

    var text = document.createElement("div");
    text.className = "ad-text";
    text.innerHTML =
      '<div class="ad-title">' + escapeHtml(slide.title) + "</div>" +
      '<div class="ad-body">' + escapeHtml(slide.body) + "</div>";
    wrap.appendChild(text);

    if (slide.qrTarget) {
      var qrWrap = document.createElement("div");
      qrWrap.className = "ad-qr";
      qrWrap.innerHTML = buildQrSvg(slide.qrTarget);
      wrap.appendChild(qrWrap);
    }

    return wrap;
  }

  // ---------- Ad formats ----------

  function clearAdIntervals() {
    activeAdIntervals.forEach(clearInterval);
    activeAdIntervals = [];
  }

  function startRotator(containers, slides, durationMs) {
    if (!slides.length) { return; }
    var i = 0;
    function show() {
      var slide = slides[i % slides.length];
      containers.forEach(function (c) {
        c.innerHTML = "";
        c.appendChild(buildAdContent(slide));
      });
      i++;
    }
    show();
    activeAdIntervals.push(setInterval(show, durationMs || 8000));
  }

  function startLowerThird(box, slides, cfg) {
    if (!slides.length) { return; }
    var i = 0;
    function cycle() {
      var slide = slides[i % slides.length];
      i++;
      box.innerHTML = "";
      box.appendChild(buildAdContent(slide));
      requestAnimationFrame(function () { box.classList.add("visible"); });
      setTimeout(function () { box.classList.remove("visible"); }, cfg.visibleMs || 10000);
    }
    cycle();
    activeAdIntervals.push(setInterval(cycle, cfg.everyMs || 120000));
  }

  function setupAds(adsConfig) {
    clearAdIntervals();
    adSlotEl.innerHTML = "";

    var format = adsConfig.format || "side-by-side";
    appEl.setAttribute("data-ad-format", format);
    var slides = adsConfig.slides || [];

    if (format === "lbar") {
      var right = document.createElement("div");
      right.className = "ad-box lbar-right";
      var bottom = document.createElement("div");
      bottom.className = "ad-box lbar-bottom";
      adSlotEl.appendChild(right);
      adSlotEl.appendChild(bottom);
      startRotator([right, bottom], slides, adsConfig.slideDurationMs);
    } else if (format === "lower-third") {
      var box = document.createElement("div");
      box.className = "ad-box";
      adSlotEl.appendChild(box);
      startLowerThird(box, slides, adsConfig.lowerThird || {});
    } else {
      // side-by-side (default)
      var sbs = document.createElement("div");
      sbs.className = "ad-box";
      adSlotEl.appendChild(sbs);
      startRotator([sbs], slides, adsConfig.slideDurationMs);
    }
  }

  // ---------- Polling ----------

  function refreshTokens() {
    fetchRoomData().then(renderBoard);
  }

  function refreshAds() {
    fetchAds().then(setupAds);
  }

  // ---------- Init ----------

  loadConfig().then(function (cfg) {
    CONFIG = cfg;
    document.getElementById("hospital-name").textContent = CONFIG.hospitalName;

    refreshTokens();
    setInterval(refreshTokens, CONFIG.pollIntervalMs);

    refreshAds();
    setInterval(refreshAds, CONFIG.adsPollIntervalMs || 30000);
  });
})();
