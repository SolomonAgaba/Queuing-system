# Hospital waiting-area token display

A web-based display board for waiting-area screens: one column per
active doctor's room (up to 8 per row, wrapping to a second row), each
holding a fixed 10-token window that only scrolls, gently, when a room
has more than 10 people waiting.

Alongside it, a non-disruptive ad system (inspired by broadcast
formats — squeezeback/L-bar, lower-third, side-by-side) that never
fully hides the token board, plus an **admin panel** where staff can
manage ad text, upload graphics, and attach QR codes without touching
any files or code.

This package contains a working, testable app with sample data, plus
reference SQL for the backend sync service described in our design
conversation. **The display and admin panel run today**; **the real
token sync service still needs to be built** against your hospital's
live database once read-only access is granted (see "Backend" below).

## What's in this folder

```
index.html                 Waiting-area display page
admin.html                 Ad settings panel (staff-facing)
css/styles.css             Display styling, incl. all three ad formats
css/admin.css              Admin panel styling
js/app.js                  Display logic: token board + ad rendering
js/admin.js                Admin panel logic
js/mock-data.js            Sample token data (fallback if the API is down)
js/vendor/qrcode.js        Vendored QR code library (MIT, offline, no CDN needed)
config.json                Display tuning settings
server/
  server.js                 Node/Express server: static hosting + ad APIs
  package.json               Server dependencies
  data/ads.json              Current ad configuration (edited via admin.html)
  data/mock-tokens.json      Sample token data for the /api/tokens stub
  data/uploads/               Uploaded ad graphics land here
android-tv/kiosk-setup.md   How to deploy this to the actual screens
backend-reference/
  own_database_schema.sql    Schema for YOUR OWN database (not the hospital's)
  sync_service_reference.sql Read-only reference queries against the hospital DB
```

## Run it

```
cd server
npm install
npm start
```

Then open:

- `http://localhost:8080` — the waiting-area display (sample token
  data, seeded sample ads)
- `http://localhost:8080/admin.html` — the ad settings panel

Changes saved in the admin panel are picked up by the display within
`adsPollIntervalMs` (30 seconds by default, in `config.json`) — no
restart needed.

## The admin panel

Everything ad-related is managed here, no file editing required:

- **Format** — choose side-by-side, L-bar/squeezeback, or
  lower-third (see below).
- **Slides** — add as many as you like. Each has a title, a message,
  an optional uploaded graphic (drag in a PNG/JPG/WEBP/GIF, up to
  8MB), and an optional QR code — just paste the URL you want it to
  point to (a booking page, a form, more information) and the QR
  renders live, both in the admin preview and on the actual screens.
- **Timing** — how long each slide shows (side-by-side/L-bar), or how
  often and for how long the lower-third banner appears.

Uploaded graphics are saved on the server under
`server/data/uploads/` and served at `/uploads/<filename>`. Ad
configuration is saved to `server/data/ads.json`.

## The three ad formats

| Format | What it looks like | When to use it |
|---|---|---|
| `side-by-side` (default) | Token board takes ~75% of the screen; a permanent ad box sits alongside it | Safest default — ad and tokens are both always visible, nothing ever moves or covers anything |
| `lbar` | Token board scaled down slightly, framed by an L-shaped strip (right + bottom) carrying the ad creative and QR | More screen given to the ad without ever touching the token area |
| `lower-third` | Token board full screen; a semi-transparent banner slides up from the bottom periodically, holds, then slides away | Least visual footprint most of the time, brief prominent moments for the ad |

Switch formats any time from the admin panel — no code changes.

## Test it without the server

If you just want to preview the display styling with sample data and
don't need the admin panel or live ad editing, you can still run the
old static-only path:

```
python3 -m http.server 8080
```

`js/app.js` will fail to reach `/api/ads` and `/api/tokens` in that
mode and fall back to `js/mock-data.js` and a small built-in default
ad set, so you'll see something, just not whatever's in
`server/data/ads.json`. For real testing, use `npm start` instead.

## Architecture recap

This app is the **display + ad-management layer**. The token board
expects a `GET {apiEndpoint}` (default `/api/tokens`) returning:

```json
[
  { "room": "Rm 1", "tokens": ["A-101", "A-104", "A-107"] },
  { "room": "Rm 2", "tokens": ["A-102"] }
]
```

Right now that's served by the stub in `server.js` reading
`data/mock-tokens.json`. In production, replace it with the real sync
service, which:

1. Connects to the hospital's live database with a **read-only**
   login (`SELECT` only — no write/schema access needed at all).
2. Polls the tables listed in
   `backend-reference/sync_service_reference.sql` on a schedule
   (every 5-10s), ideally against a reporting/read replica if the
   hospital has one.
3. Writes tracking state into **your own separate database**
   (`backend-reference/own_database_schema.sql`) — never back into
   the hospital's database.
4. Serves the current token/room state from your own database instead
   of the mock-data stub.

Nothing in this package writes to, or creates anything in, the
hospital's live database. The ad system is entirely separate from
that concern — it only ever talks to this app's own server.

## Deploying to the actual screens

See `android-tv/kiosk-setup.md`. Short version: host this folder
(running via `npm start`) on an internal server, install a kiosk
browser (e.g. Fully Kiosk Browser) on each Android TV pointed at that
URL, set it to auto-start on boot. All screens show the same page —
manage ads once from `admin.html`, every screen picks it up.

## Open items carried over from design

Still need confirming with the hospital's systems team before the
real backend sync service can be finished:

1. **Read-only DB access** — a login with `SELECT` on `Visits`,
   `LabRequests`, `LabRequestDetails`, `LabResults`, `LabTests`,
   `DoctorVisits`, `Services`, `Rooms`, `Staff`.
2. **`ApprovedStatusID` value** that means "approved" in `LabResults`.
3. **Triage → Visit link** — whether `Triage.TreatmentNo` equals
   `Visits.VisitNo`.
4. **Where radiology orders are first recorded** (we only found the
   results table, `RadiologyReports`, not a request table).
5. **Whether a requesting doctor keeps the same room/`ServiceCode`
   for the whole day.**
6. **Reporting/read replica availability** — worth asking IT.

## Not yet included, worth planning for next

- The actual sync service implementation (the SQL in
  `backend-reference/` is reference-only pseudocode, not a runnable
  service).
- Authentication on `admin.html` and the `/api/ads*` endpoints — right
  now anyone who can reach the server can edit ads. Worth adding a
  login before this is reachable beyond a trusted internal network.
- Automatic deletion of replaced/removed ad images from
  `server/data/uploads/` (currently they just accumulate).
