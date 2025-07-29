const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/pair', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./session_${phoneNumber}`);
    const sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      browser: ['Chrome', 'Linux', '110.0']
    });

    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(phoneNumber.trim(), "HMZALGND");
      res.json({ pairingCode: code });
    } else {
      res.status(400).json({ error: 'Number already registered' });
    }

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
