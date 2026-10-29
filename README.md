# Paxton MD WhatsApp Bot

A customized WhatsApp bot based on the NEOXR-BOT 5.0 ESM codebase.

**Branding**
- Bot name: Paxton MD
- Owner: `27797352930` (international format, digits only)
- Footer: `Powered by Paxton`
- Pairing-code label: `PAXTONMD`

## Requirements
- Node.js 20 or newer
- FFmpeg
- npm
- Internet access for dependencies and WhatsApp connectivity

## Termux setup
From the directory containing this project:

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts ffmpeg python make clang git -y
npm install
```

If `sharp` fails to install on Termux, follow the upstream project guidance for the compatible Sharp build for your Android architecture.

## Configure
Edit `config.json`:
- `owner`: owner WhatsApp number (digits only, no `+`)
- `owner_name`: owner label
- `pairing.number`: the WhatsApp account that will actually run the bot. This is separate from the owner number; change it only if the bot should log in using a different WhatsApp account.
- `pairing.code`: pairing-code label

Set API keys and database settings in `.env` if you use features that require them. Do not share `.env` or the `session/` directory publicly.

## Start
```bash
npm start
```

## Notes
- The first run may need WhatsApp pairing.
- Keep a private backup of `config.json`, `.env`, and `session/`.
- Some download/API commands depend on the upstream provider and may require a valid API key.
- This project retains the upstream source license and dependency attributions. See `LICENSE`.

## Session generator web
Starting the bot also starts a web page (port `PORT`, default 3000) where you enter your number, get a pairing code and receive a `SESSION_ID`.
Set `SESSION_ID` as an environment variable on hosts with wiped disks (Render, Heroku); the bot restores `session/creds.json` from it on boot. Set `SESSION_WEB=false` to disable the page.

## Deploy on Render
Push to a private GitHub repo, then New → Blueprint (uses `render.yaml`) or New → Web Service → Docker. Add env vars `API_KEY`, `DATABASE_URL`, `SESSION_ID`. Free web services sleep after inactivity; ping `/health` with an uptime monitor.
