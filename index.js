const express = require("express");
const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const fs = require("fs");
const qrcode = require("qrcode");

const { state, saveState } = useSingleFileAuthState("./auth.json");
const app = express();
const port = process.env.PORT || 8080;

let sock;
let currentPairingCode = null;

// Pairing function
async function startBot(number) {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveState);

  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(number + "@s.whatsapp.net");
    currentPairingCode = code;
    console.log("Generated Pairing Code:", code);
  }
}

// GET /pair?number=03001234567
app.get("/pair", async (req, res) => {
  const number = req.query.number;

  if (!number || number.length < 10) {
    return res.status(400).json({ error: "Number is required in query like ?number=03001234567" });
  }

  try {
    await startBot(number);
    res.json({ pairing_code: currentPairingCode });
  } catch (err) {
    console.error("Error generating pairing code:", err);
    res.status(500).json({ error: "Failed to generate pairing code" });
  }
});

// Test default
app.get("/", (req, res) => {
  res.send("✅ SniffX API is Live. Use /pair?number=03001234567");
});

app.listen(port, () => {
  console.log(`SniffX API running on http://localhost:${port}`);
});
