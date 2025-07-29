import { default as makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import express from 'express';
import P from 'pino';

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

async function startSocket(phoneNumber) {
  const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${phoneNumber}`);
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: 'silent' }),
    browser: ['SniffX', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(phoneNumber); // Must be in international format
    console.log('Pairing Code:', code);
    return code;
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to', lastDisconnect.error, ', reconnecting', shouldReconnect);
      if (shouldReconnect) startSocket(phoneNumber);
    } else if (connection === 'open') {
      console.log('opened connection ✅');
    }
  });

  return null;
}

// API endpoint
app.post('/pair', async (req, res) => {
  const phone = req.body.phone; // Format: +923001234567
  if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

  try {
    const code = await startSocket(phone);
    if (code) {
      return res.json({ success: true, code });
    } else {
      return res.json({ success: false, message: 'Already paired' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to get pairing code' });
  }
});

app.listen(port, () => {
  console.log(`✅ SniffX_Pair API is Live on Port ${port}`);
});
