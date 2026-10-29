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

## Session
Get a SESSION_ID from the separate Paxton-Session generator, then set it as the `SESSION_ID` variable (or in `.env`). On boot the bot restores `session/creds.json` if none exists.

## Deploy on Render
Push to a private GitHub repo, New > Web Service > Docker, health check path `/health`. Add env vars `API_KEY`, `DATABASE_URL`, `SESSION_ID`. Ping the URL with an uptime monitor on the free tier.
