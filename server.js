import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import baileys from './lib/engine.js'
import { encode } from './lib/session.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3000)
const TTL = 10 * 60 * 1000
const MAX_ACTIVE = 5
const jobs = new Map() // id -> { status, code, session, error, sock, dir, ip, created }
const hits = new Map() // ip -> [timestamps]

const makeWASocket = baileys.makeWASocket || baileys.default?.default || baileys.default
const { useMultiFileAuthState, Browsers, fetchLatestBaileysVersion, DisconnectReason } = baileys

const MIME = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.js': 'text/javascript' }
const json = (res, code, obj) => {
   res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
   res.end(JSON.stringify(obj))
}
const body = req => new Promise(r => {
   let d = ''
   req.on('data', c => { d += c; if (d.length > 2048) req.destroy() })
   req.on('end', () => { try { r(JSON.parse(d || '{}')) } catch { r({}) } })
})
const limited = ip => {
   const now = Date.now()
   const list = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000)
   list.push(now); hits.set(ip, list)
   return list.length > 5
}
const cleanup = id => {
   const j = jobs.get(id); if (!j) return
   try { j.sock?.end(undefined) } catch { }
   try { fs.rmSync(j.dir, { recursive: true, force: true }) } catch { }
   jobs.delete(id)
}

async function startPairing(id, number) {
   const j = jobs.get(id)
   const { state, saveCreds } = await useMultiFileAuthState(j.dir)
   let version
   try { ({ version } = await fetchLatestBaileysVersion()) } catch { }
   const sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      browser: Browsers?.macOS ? Browsers.macOS('Chrome') : ['Mac OS', 'Chrome', '139.0.7258.164'],
      syncFullHistory: false,
      markOnlineOnConnect: false
   })
   j.sock = sock
   sock.ev.on('creds.update', saveCreds)

   let asked = false
   sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      try {
         if ((qr || connection === 'connecting') && !asked && !state.creds.registered) {
            asked = true
            await new Promise(r => setTimeout(r, 2500))
            const code = await sock.requestPairingCode(number)
            j.code = code?.match(/.{1,4}/g)?.join('-') || code
            j.status = 'code'
         }
         if (connection === 'open') {
            await new Promise(r => setTimeout(r, 4000)) // let creds flush
            const credsPath = path.join(j.dir, 'creds.json')
            const sessionId = encode(fs.readFileSync(credsPath, 'utf-8'))
            j.session = sessionId
            j.status = 'done'
            try {
               await sock.sendMessage(number + '@s.whatsapp.net', { text: sessionId })
               await sock.sendMessage(number + '@s.whatsapp.net', { text: '*Paxton-MD*\nKeep this SESSION_ID private. Anyone with it can control your WhatsApp.' })
            } catch { }
            try { sock.end(undefined) } catch { }
         }
         if (connection === 'close' && j.status !== 'done') {
            const status = lastDisconnect?.error?.output?.statusCode
            if (status === DisconnectReason?.restartRequired || status === 515) {
               return startPairing(id, number) // normal restart right after pairing
            }
            j.status = 'error'; j.error = 'Connection closed. Try again.'
         }
      } catch (e) {
         j.status = 'error'; j.error = e.message
      }
   })
}

const routes = async (req, res) => {
   const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
   const url = new URL(req.url, 'http://x')

   if (url.pathname === '/health') return json(res, 200, { ok: true })

   if (req.method === 'POST' && url.pathname === '/api/pair') {
      if (limited(ip)) return json(res, 429, { error: 'Too many attempts. Wait a few minutes.' })
      if (jobs.size >= MAX_ACTIVE) return json(res, 503, { error: 'Server busy. Try again shortly.' })
      const { number } = await body(req)
      const n = String(number || '').replace(/\D/g, '')
      if (n.length < 8 || n.length > 15) return json(res, 400, { error: 'Enter number with country code, digits only.' })
      const id = crypto.randomBytes(16).toString('hex')
      const dir = path.resolve('temp', 'gen-' + id)
      fs.mkdirSync(dir, { recursive: true })
      jobs.set(id, { status: 'starting', dir, ip, created: Date.now() })
      setTimeout(() => cleanup(id), TTL)
      startPairing(id, n).catch(e => { const j = jobs.get(id); if (j) { j.status = 'error'; j.error = e.message } })
      return json(res, 200, { id })
   }

   if (req.method === 'GET' && url.pathname.startsWith('/api/status/')) {
      const id = url.pathname.split('/').pop()
      const j = jobs.get(id)
      if (!j) return json(res, 404, { status: 'expired' })
      const out = { status: j.status, code: j.code, error: j.error }
      if (j.status === 'done') { out.session = j.session; setTimeout(() => cleanup(id), 30000) }
      return json(res, 200, out)
   }

   // static
   let rel = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
   const roots = rel.startsWith('/media/') ? [path.join(__dirname, rel)] : [path.join(__dirname, 'public', rel)]
   const file = path.normalize(roots[0])
   if (!file.startsWith(path.join(__dirname, 'public')) && !file.startsWith(path.join(__dirname, 'media', 'image'))) { res.writeHead(403); return res.end() }
   fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found') }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
      res.end(data)
   })
}

if (process.env.SESSION_WEB !== 'false') {
   http.createServer((req, res) => routes(req, res).catch(() => { res.writeHead(500); res.end() }))
      .listen(PORT, () => console.log(`[web] session generator on :${PORT}`))
}
