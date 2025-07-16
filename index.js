const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

// Mulai Bot
async function start() {
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    version
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    const jid = m.key.remoteJid
    const msg = m.message

    // .stiker command
    if ((msg.imageMessage || msg.videoMessage) && (msg.imageMessage?.caption?.toLowerCase().startsWith('.stiker') || msg.videoMessage?.caption?.toLowerCase().startsWith('.stiker'))) {
      const media = await sock.downloadMediaMessage(m, 'buffer')
      await sock.sendMessage(jid, { sticker: { url: media }})
    }

    // .brat command
    const text = msg.conversation || msg.extendedTextMessage?.text
    if (text && text.toLowerCase().startsWith('.brat ')) {
      const isi = text.slice(6).trim()
      const filePath = path.join(__dirname, 'brat.png')

      // Gunakan ImageMagick untuk buat gambar dari teks
      spawnSync('convert', [
        '-size', '512x512',
        'xc:white',
        '-fill', 'black',
        '-gravity', 'NorthWest',
        '-font', 'Arial',
        '-pointsize', '22',
        '-annotate', '+20+20', isi,
        filePath
      ])

      await sock.sendMessage(jid, { sticker: { url: filePath }})
      fs.unlinkSync(filePath)
    }
  })
}

start()