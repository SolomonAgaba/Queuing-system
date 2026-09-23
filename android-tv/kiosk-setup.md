# Running this on the 65" Android TV screens

Recommended approach: **kiosk browser**, not a custom native app. See
README.md for the reasoning. Steps below.

## 1. Host the app

Put the contents of this folder on a small internal web server the TVs
can reach (a local machine, a Raspberry Pi, or a proper server —
doesn't need to be powerful). Something like:

    nginx / Apache serving this folder as static files, or
    `python3 -m http.server 8080` for a quick test

Note the URL, e.g. `http://192.168.1.50:8080/`

## 2. Install a kiosk browser on each Android TV

**Fully Kiosk Browser** (available on the Play Store / sideloadable)
is a common choice for exactly this use case — digital signage on
Android devices. In its settings:

- Set **Start URL** to your server's address from step 1
- Enable **Autostart on boot**
- Enable **Keep screen on**
- Enable **Auto reload on error** (recovers automatically if the
  network blips)
- Disable navigation bar / status bar for a clean fullscreen look
- Optionally set a **remote admin password** so you can push URL or
  settings changes to all screens from one place without touching
  each device

## 3. Point every screen at the same URL

Because the room-column layout self-adjusts based on how many doctors
are active that day, every screen shows the exact same page — no
per-screen configuration needed beyond installing the kiosk browser
and setting the same start URL.

## 4. Test before rolling out to all screens

Install on one device first, confirm it survives a reboot and
reconnects automatically after a brief network drop, then repeat the
same kiosk browser configuration on the rest.
