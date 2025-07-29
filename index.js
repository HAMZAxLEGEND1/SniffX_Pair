import express from 'express';
import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve HTML form on GET /
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SniffX Pairing</title>
      </head>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h2>Get Your WhatsApp Pairing Code</h2>
        <form method="POST" action="/pair">
          <input type="text" name="number" placeholder="Enter phone number" required />
          <button type="submit">Get Pair Code</button>
        </form>
        %RESULT%
      </body>
    </html>
  `);
});

// POST /pair
app.post('/pair', async (req, res) => {
  const number = req.body.number || req.body?.number?.trim();
  if (!number) return res.send('Phone number required');

  try {
    const { state, saveCreds } = await useMultiFileAuthState(`auth_info/${number}`);
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
      browser: ['SniffX', 'Chrome', '1.0.0'],
    });

    sock.ev.on('connection.update', async (update) => {
      const { pairingCode, connection } = update;

      if (connection === 'open') {
        console.log('✅ Connected:', number);
      }

      if (pairingCode) {
        const html = `
          <html>
            <body style="font-family: sans-serif; padding: 2rem;">
              <h2>Pairing Code for ${number}</h2>
              <pre style="font-size: 1.2rem; color: green;">${pairingCode}</pre>
              <a href="/">← Go Back</a>
            </body>
          </html>
        `;
        res.send(html);
        sock.end(); // Close connection after generating code
      }
    });

  } catch (err) {
    console.error(err);
    res.send(`<p style="color:red;">❌ Error: ${err.message}</p><a href="/">← Try Again</a>`);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
