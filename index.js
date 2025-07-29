import express from 'express';
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  requestPairingCode
} from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

app.post('/pair', async (req, res) => {
  const phone = req.body.phone;
  if (!phone || !phone.startsWith('+')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number. Use international format like +923001234567',
    });
  }

  try {
    const sessionPath = `./sessions/${phone.replace(/\+/g, '')}`;
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      browser: ['SniffX Bot', 'Chrome', '1.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    const code = await requestPairingCode(phone, sock); // example: "123-456"
    console.log(`✅ Pairing code for ${phone}: ${code}`);

    res.json({
      success: true,
      pairing_code: code,
      message: 'Enter this code in your WhatsApp device to link it.',
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Error generating pairing code',
      error: err.message || err.toString(),
    });
  }
});

app.get('/', (req, res) => {
  res.send('SniffX Pairing API by Mr Legend Hub 🧠');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SniffX Pairing API is running on http://localhost:${PORT}`);
});
