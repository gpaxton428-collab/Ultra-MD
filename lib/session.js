import fs from 'node:fs'
import path from 'node:path'

export const PREFIX = 'PAXTON~'

export const encode = credsJson => PREFIX + Buffer.from(credsJson, 'utf-8').toString('base64')

export const decode = id => {
   const raw = String(id || '').trim()
   if (!raw.startsWith(PREFIX)) throw new Error('Invalid SESSION_ID prefix')
   const json = Buffer.from(raw.slice(PREFIX.length), 'base64').toString('utf-8')
   JSON.parse(json) // validate
   return json
}

/**
 * If SESSION_ID is set and no local creds exist, write session/creds.json
 * so the bot logs in without pairing again (needed on hosts with wiped disks).
 */
export const restoreSession = (dir = 'session') => {
   const id = process.env.SESSION_ID
   if (!id) return false
   const file = path.join(path.resolve(dir), 'creds.json')
   if (fs.existsSync(file)) return false
   try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, decode(id))
      console.log('[session] restored from SESSION_ID')
      return true
   } catch (e) {
      console.error('[session] restore failed:', e.message)
      return false
   }
}
