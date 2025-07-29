import express from 'express';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';

const app = express();
app.use(express.json());

const sessionCache = new NodeCache(); // In-memory cache for active sessions

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('✅ SniffX_Pair API is Live');
});

app.post('/pair', async (req, res) => {
  const { number } = req.body;

  if (!number) {
    return res.status(400).json({ success: false, message: 'Phone number is required.' });
  }

  const sessionId = `session-${number}`;
  if (sessionCache.has(sessionId)) {
    return res.status(400).json({ success: false, message: 'Pairing already in process for this number.' });
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${number}`);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      getMessage: async () => ({ conversation: '🧠 Empty message placeholder' }),
    });

    sessionCache.set(sessionId, sock);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, pairCode } = update;

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        if (reason !== DisconnectReason.loggedOut) {
          console.log(`🔁 Reconnecting for ${number}`);
        } else {
          console.log(`❌ Logged out: ${number}`);
          sessionCache.del(sessionId);
        }
      }

      if (connection === 'open') {
        console.log(`✅ Connected: ${number}`);
        sessionCache.set(sessionId, sock);
      }

      if (pairCode) {
        console.log(`📟 Pair code for ${number}: ${pairCode}`);
        res.json({
          success: true,
          number,
          pair_code: pairCode,
          note: 'Use this code in WhatsApp app to pair your device.',
        });
      }
    });

    sock.ev.on('creds.update', saveCreds);

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error during pairing.', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ SniffX_Pair API running on port ${PORT}`);
});
