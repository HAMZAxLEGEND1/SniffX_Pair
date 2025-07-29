import express from 'express';
import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.post('/pair', async (req, res) => {
  const number = req.body.number?.trim();
  if (!number) return res.status(400).json({ error: 'Phone number is required' });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(`auth_info/${number}`);
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['SniffX', 'Chrome', '1.0.0'],
    });

    let responded = false;

    sock.ev.on('connection.update', async (update) => {
      const { connection, pairingCode } = update;

      if (pairingCode && !responded) {
        responded = true;
        res.json({ pairingCode });
        sock.end(); // Close connection after code generated
      }

      if (connection === 'open') {
        console.log(`[✅] Connected: ${number}`);
      }

      if (update.connection === 'close' && !responded) {
        res.status(500).json({ error: 'Connection closed before code generated' });
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('✅ SniffX API Running. Use POST /pair with JSON { "number": "0300..." }');
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});
