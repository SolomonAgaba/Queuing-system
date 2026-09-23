const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const ADS_FILE = path.join(DATA_DIR, "ads.json");
const MOCK_TOKENS_FILE = path.join(DATA_DIR, "mock-tokens.json");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(ADS_FILE)) {
  fs.writeFileSync(
    ADS_FILE,
    JSON.stringify({ format: "side-by-side", slideDurationMs: 8000, slides: [] }, null, 2)
  );
}

const app = express();
app.use(express.json({ limit: "2mb" }));

// Serve the whole project (index.html, admin.html, css, js, config.json) as static files
app.use(express.static(ROOT));
// Serve uploaded ad graphics
app.use("/uploads", express.static(UPLOADS_DIR));

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per image
  fileFilter: function (req, file, cb) {
    var ok = /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype);
    cb(ok ? null : new Error("Only PNG, JPEG, WEBP, or GIF images are allowed"), ok);
  }
});

// ---------- Ad configuration ----------

app.get("/api/ads", function (req, res) {
  res.json(JSON.parse(fs.readFileSync(ADS_FILE, "utf8")));
});

app.post("/api/ads", function (req, res) {
  var body = req.body;
  if (!body || !Array.isArray(body.slides)) {
    return res.status(400).json({ error: "Expected { format, slides: [] }" });
  }
  fs.writeFileSync(ADS_FILE, JSON.stringify(body, null, 2));
  res.json({ ok: true });
});

app.post("/api/ads/upload", upload.single("image"), function (req, res) {
  if (!req.file) { return res.status(400).json({ error: "No file uploaded" }); }
  var ext = path.extname(req.file.originalname) || "";
  var finalName = req.file.filename + ext;
  fs.renameSync(req.file.path, path.join(UPLOADS_DIR, finalName));
  res.json({ url: "/uploads/" + finalName });
});

// ---------- Token data (LOCAL TESTING ONLY) ----------
// Replace this stub with the real sync service described in
// backend-reference/. It exists only so the display and admin pages
// have something to render before that service is built.

app.get("/api/tokens", function (req, res) {
  res.json(JSON.parse(fs.readFileSync(MOCK_TOKENS_FILE, "utf8")));
});

var PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log("Display server running: http://localhost:" + PORT);
  console.log("Admin panel:            http://localhost:" + PORT + "/admin.html");
});
