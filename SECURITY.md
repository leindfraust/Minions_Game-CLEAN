# Security Report / Indicators of Compromise

This repository is a decontaminated copy of **`icateNFT/Minions_Game`**. The
upstream project is malware. This file exists so analysts and affected users
can identify it, report it, and clean up after it.

- **Analyst report date:** 2026-10-12
- **Upstream repository:** https://github.com/icateNFT/Minions_Game
- **Upstream account created:** 2026-10-05, single commit, 0 stars
- **Verdict:** Remote Code Execution backdoor delivering an infostealer / RAT
  with live command-and-control.

---

## 1. Summary

The upstream repository presents itself as a Next.js + Phaser browser game
("Mote Mayhem: Lab Escape") with a detailed 164-test README. It ships a
backdoor that fires automatically, with no user action beyond `npm run dev`,
`npm run build` or `npm start`:

1. `src/app/layout.jsx` calls `initialize()` at **module scope**.
2. `src/services/init.js` spawns `node loader.js` as a **detached** child
   process with `stdio` discarded, `windowsHide: true`, and writes a `.pid`
   marker so it runs once per clone.
3. `src/services/loader.js` HTTPS-GETs a free JSON host, base64-decodes the
   `code` field, and executes it with `new Function`. Before doing so it
   monkey-patches `Module.prototype.require` to force `windowsHide` on every
   `child_process` spawn and to route `execSync` through a hidden `cmd.exe`,
   suppressing console windows.
4. The decoded payload is a 94 KB infostealer client that reports to a hardcoded
   C2 server and accepts remote commands.

The README of the upstream repository contains a fabricated "Security note"
claiming the backdoor had already been removed. Every claim in it was false.

---

## 2. Network Indicators of Compromise

### Command and control

| Type | Value | Notes |
| --- | --- | --- |
| C2 server | `http://103.170.217.184:8787` | Plain HTTP, IP literal, no DNS |
| C2 config key | `api_key` | Value observed: `your-api-key-here` (placeholder) |
| Poll interval | `300` seconds (config refresh) | `config_refresh_interval` |
| Task poll interval | 5 seconds | `setInterval` on `/api/download-tasks/` |

### Payload staging hosts (two-stage)

| Stage | URL | Purpose |
| --- | --- | --- |
| 1 | `https://api.npoint.io/555143a2c80db24ece90` | Returns `{"code": "<base64>"}` |
| 2 | `https://api.npoint.io/93c8db40cc3e4db05009` | Returns C2 config (`server_url`, `api_key`) |

Both are free anonymous JSON hosts on `api.npoint.io`. Anyone who obtains the
URL can also **replace** the served payload or config, which is a second
infection vector for anyone who already runs the loader.

### Third-party lookup used for geolocation

- `ip-api.com` JSON endpoints, used to derive victim country/region from the
  public IP.

### C2 API surface

Paths the client calls on the C2 server, useful for proxy and firewall logging:

```
/api/device-info
/api/upload-local-extension-settings
/api/clipboard-data
/api/clipboard-status/{id}
/api/keyboard-mouse-data
/api/keyboard-mouse-status/{id}
/api/file-system/scan
/api/filesystem-batch
/api/file-system/search
/api/file-system/index-start/{id}
/api/file-system/index-complete/{id}
/api/fs/index
/api/fs/index/create
/api/fs/index/stream
/api/fs/index/complete
/api/download-tasks/{id}
/api/download-upload/{id}
/api/registry/{id}
```

---

## 3. File Indicators of Compromise

SHA-256 of the files as published in the upstream repository, and of the
decoded payload.

| Artefact | SHA-256 |
| --- | --- |
| `src/services/loader.js` | `4D777D4DCC806C5B517A24DC668D67A5DFE51CD1206248423FAAC922AC27CA07` |
| `src/services/init.js` | `DFD17877122C08D4206E82FB3B58793F4063F4005CFDD7805B325BE2293D5822` |
| decoded payload (stage 1 `code`) | `07B775C9B9AC7B43F1E639BBA70D9227F41C85976788317A0940B75EDCA94619` |

### Host artefacts

- `src/services/.pid`, plain-text PID marker written next to the loader so the
  backdoor runs at most once per clone.
- Upload staging path on the C2: `uploads/<COMPUTER_NAME>/download/registry_<TIMESTAMP>.dat`
- Registry dumps are uploaded as `registry_TIMESTAMP.dat`.

---

## 4. `uiohook-napi` signature

`uiohook-napi` is a **legitimate** npm package (global keyboard/mouse hook for
Electron/Tauri apps). It is not malicious on its own, and it was present here
only to serve the backdoor. Report the *behaviour*, not the package.

**Dependency signature**, the payload's `require` targets, which exist for no
game purpose and were still declared in `package.json` upstream:

```
uiohook-napi  ^1.5.5
form-data     ^4.0.0
archiver      ^7.0.0
```

**Code signature**, the combination that identifies this loader:

```js
await import('uiohook-napi')                      // dynamic, avoids static analysis
uIOhook.on('keydown', event => { ... })           // keystroke capture
uIOhook.on('keyup',   event => { ... })           // keystroke capture
spawn("powershell.exe", ['-NoLogo','-NoProfile','-NonInteractive',
  '-ExecutionPolicy','Bypass','-Command','Get-Clipboard ...'])   // clipboard read
Module.prototype.require = function(id) { ... }  // hides spawned consoles
new Function("require","__dirname","__filename","module","exports", decodedCode)(...)
spawn('node', [LOADER], { stdio: ['ignore','ignore','ignore'],
  windowsHide: true, detached: true, shell: false })             // detached loader
```

**Named payload functions** (present verbatim in the decoded stage):

```
initializeUIohook            startKeyboardMouseMonitoring     uploadKeyboardMouseEvents
startClipboardMonitoring     uploadClipboardData              getClipboardContent
uploadChromeLocalExtensionSettings                           findChromeProfiles
indexFileSystem              scanAndBatchDirectory            uploadFileSystemBatch
uploadFileIndex              downloadRegistry                 pollDownloadTasks
handleDownloadTask           collectDeviceInfo                getPublicIP
```

**AV-evasion exclusion list.** The filesystem scanner deliberately skips
Windows system paths and `ProgramData` while scanning everything else,
including `AppData`:

```
/^[a-z]:\\windows\\/i            /\\programdata\\/i
/^[a-z]:\\\$recycle\.bin\\/i     /^[a-z]:\\temp\\/i
/^[a-z]:\\system volume information$/i
/\\appdata\\local\\temp\\/i     /\\appdata\\local\\cache\\/i
/\\appdata\\local\\inetcache\\/i /\\windows\\temp\\/i
```

---

## 5. Capabilities

| Capability | Implementation |
| --- | --- |
| Keylogging | `uiohook-napi` `keydown` / `keyup`, batched to `/api/keyboard-mouse-data` |
| Clipboard capture | `Get-Clipboard` via hidden PowerShell, streamed to `/api/clipboard-data` |
| Browser wallet theft | Chrome `User Data` profile discovery, `Extension Settings` exfil |
| Filesystem sweep | Batch scan + streaming index of documents, keys and wallet files |
| Registry dump | `downloadRegistry` uploads `registry_*.dat` |
| Victim profiling | Public IP, geolocation, network interfaces, device info |
| Remote tasking | 5s poll of `/api/download-tasks/`, writes arbitrary files or zips |
| Live control | Server-issued `START` / `STOP` toggles for monitoring subsystems |
| Anti-forensics | `.pid` single-run marker, discarded stdio, hidden consoles, path exclusions |

Exfiltration is gzipped and, for file batches, assembled with `archiver` and
uploaded as `form-data` multipart.

---

## 6. Detection

**Network:** alert on any outbound connection to `103.170.217.184:8787` or to
`api.npoint.io`. The C2 is a bare IP over plain HTTP, so it is trivially
blockable at the perimeter.

**Endpoint, processes:**

```powershell
# A hidden, parentless node process with no console window
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'loader\.js' }
```

**Endpoint, filesystem:**

```powershell
Get-ChildItem -Recurse -Force -Filter ".pid" -ErrorAction SilentlyContinue |
  Where-Object { $_.DirectoryName -match 'services' }
```

**Endpoint, content:** grep any project tree for
`api.npoint.io`, `new Function`, or `Module.prototype.require =`.

---

## 7. Remediation

Anyone who ran `npm install` followed by any of `npm run dev`, `npm run build`
or `npm start` from the upstream repository must assume full compromise of the
machine and every account used on it.

1. Kill the loader process (see detection above). Do not reboot first; that can
   clear volatile evidence.
2. Treat **every** credential that existed on the machine as stolen: passwords,
   session cookies, OAuth and refresh tokens, Discord/Telegram/Steam sessions,
   SSH and cloud keys, password-manager vaults, exchange and API keys.
3. Revoke all sessions from a **different, known-clean device**. Password
   changes made on the infected machine are not trustworthy.
4. Check for exchange crypto: a keylogger and clipboard monitor were active,
   so any pasted address may have been captured. Verify withdrawal allowlists.
5. Reimage rather than clean. The payload supports arbitrary remote file write,
   so persistence cannot be ruled out by inspection alone.

---

## 8. Reporting

- **VirusTotal**, upload `loader.js`, `init.js`, or the repo archive. Submit the
  decoded payload via *Submit file* (not URL submission; it is base64 in JSON).
- **MalwareBazaar** (abuse.ch), submit the decoded payload and reference C2
  `103.170.217.184:8787` and both `api.npoint.io` document IDs.
- **VirusTotal / urlscan**, the two `api.npoint.io` URLs are public; submitting
  them documents the staging infrastructure and may pull additional samples
  submitted by others.
- **GitHub**, report the repository for malware:
  https://github.com/icateNFT/Minions_Game/issues (report as a security issue),
  or via https://support.github.com/contact/report-abuse

---

## 9. What was removed in this copy

| Removed | Reason |
| --- | --- |
| `src/services/init.js` | Detached loader spawner |
| `src/services/loader.js` | Remote code fetch and `new Function` execution |
| `initialize()` import + module-scope call in `src/app/layout.jsx` | The trigger |
| `uiohook-napi`, `archiver`, `form-data` from `package.json` | Payload `require` targets only |
| `package-lock.json` | Resolved the above dependencies |

Game source is otherwise unmodified. Nothing in this repository fetches or
evaluates remote code.