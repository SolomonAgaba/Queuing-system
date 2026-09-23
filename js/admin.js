(function () {
  "use strict";

  var state = { format: "side-by-side", slideDurationMs: 8000, lowerThird: { everyMs: 120000, visibleMs: 10000 }, slides: [] };

  var FORMATS = [
    { id: "side-by-side", label: "Side-by-side", desc: "Token board and ad box shown together, always" },
    { id: "lbar", label: "L-bar / squeezeback", desc: "Board scaled down, framed by an ad border" },
    { id: "lower-third", label: "Lower-third", desc: "Board full screen, banner slides up periodically" }
  ];

  var formatOptionsEl = document.getElementById("format-options");
  var lowerThirdSettingsEl = document.getElementById("lower-third-settings");
  var ltEveryEl = document.getElementById("lt-every");
  var ltVisibleEl = document.getElementById("lt-visible");
  var slideDurationEl = document.getElementById("slide-duration");
  var slidesListEl = document.getElementById("slides-list");
  var slideTemplate = document.getElementById("slide-template");
  var saveStatusEl = document.getElementById("save-status");

  function uid() { return "s-" + Date.now() + "-" + Math.floor(Math.random() * 10000); }

  // ---------- Load existing config ----------

  fetch("/api/ads")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      state = Object.assign({ format: "side-by-side", slideDurationMs: 8000, lowerThird: { everyMs: 120000, visibleMs: 10000 }, slides: [] }, data);
      if (!state.slides.length) { addSlide(); }
      render();
    })
    .catch(function () {
      addSlide();
      render();
    });

  // ---------- Format selector ----------

  function renderFormatOptions() {
    formatOptionsEl.innerHTML = "";
    FORMATS.forEach(function (f) {
      var el = document.createElement("div");
      el.className = "format-option" + (state.format === f.id ? " selected" : "");
      el.innerHTML = f.label + '<span class="fmt-desc">' + f.desc + "</span>";
      el.addEventListener("click", function () {
        state.format = f.id;
        render();
      });
      formatOptionsEl.appendChild(el);
    });
    lowerThirdSettingsEl.hidden = state.format !== "lower-third";
  }

  // ---------- Slides ----------

  function addSlide() {
    state.slides.push({ id: uid(), title: "", body: "", image: "", qrTarget: "" });
  }

  function buildQrSvg(text) {
    if (!text) { return ""; }
    try {
      var qr = window.qrcode(0, "M");
      qr.addData(text);
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 0 });
    } catch (e) { return ""; }
  }

  function renderSlides() {
    slidesListEl.innerHTML = "";
    state.slides.forEach(function (slide, index) {
      var node = slideTemplate.content.cloneNode(true);
      var card = node.querySelector(".slide-card");

      node.querySelector(".slide-number").textContent = "Slide " + (index + 1);

      var titleEl = node.querySelector(".f-title");
      titleEl.value = slide.title;
      titleEl.addEventListener("input", function () { slide.title = titleEl.value; });

      var bodyEl = node.querySelector(".f-body");
      bodyEl.value = slide.body;
      bodyEl.addEventListener("input", function () { slide.body = bodyEl.value; });

      var imgPreview = node.querySelector(".f-image-preview");
      if (slide.image) { imgPreview.src = slide.image; imgPreview.hidden = false; }

      var imgInput = node.querySelector(".f-image-input");
      imgInput.addEventListener("change", function () {
        var file = imgInput.files[0];
        if (!file) { return; }
        var formData = new FormData();
        formData.append("image", file);
        fetch("/api/ads/upload", { method: "POST", body: formData })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res.url) {
              slide.image = res.url;
              imgPreview.src = res.url;
              imgPreview.hidden = false;
            } else {
              alert(res.error || "Upload failed");
            }
          })
          .catch(function () { alert("Upload failed"); });
      });

      var qrInput = node.querySelector(".f-qr");
      var qrPreview = node.querySelector(".f-qr-preview");
      qrInput.value = slide.qrTarget;
      qrPreview.innerHTML = buildQrSvg(slide.qrTarget);
      qrInput.addEventListener("input", function () {
        slide.qrTarget = qrInput.value;
        qrPreview.innerHTML = buildQrSvg(slide.qrTarget);
      });

      node.querySelector(".remove-slide").addEventListener("click", function () {
        state.slides = state.slides.filter(function (s) { return s.id !== slide.id; });
        render();
      });

      slidesListEl.appendChild(node);
    });
  }

  // ---------- Render all ----------

  function render() {
    renderFormatOptions();
    renderSlides();
    slideDurationEl.value = Math.round((state.slideDurationMs || 8000) / 1000);
    ltEveryEl.value = Math.round(((state.lowerThird || {}).everyMs || 120000) / 1000);
    ltVisibleEl.value = Math.round(((state.lowerThird || {}).visibleMs || 10000) / 1000);
  }

  document.getElementById("add-slide").addEventListener("click", function () {
    addSlide();
    render();
  });

  slideDurationEl.addEventListener("change", function () {
    state.slideDurationMs = Math.max(1, Number(slideDurationEl.value) || 8) * 1000;
  });
  ltEveryEl.addEventListener("change", function () {
    state.lowerThird.everyMs = Math.max(1, Number(ltEveryEl.value) || 120) * 1000;
  });
  ltVisibleEl.addEventListener("change", function () {
    state.lowerThird.visibleMs = Math.max(1, Number(ltVisibleEl.value) || 10) * 1000;
  });

  // ---------- Save ----------

  document.getElementById("save-all").addEventListener("click", function () {
    saveStatusEl.textContent = "Saving...";
    fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        saveStatusEl.textContent = res.ok ? "Saved \u2014 screens will pick this up within 30 seconds" : (res.error || "Save failed");
        setTimeout(function () { saveStatusEl.textContent = ""; }, 4000);
      })
      .catch(function () {
        saveStatusEl.textContent = "Save failed \u2014 check the server is running";
      });
  });
})();
