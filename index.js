import express from "express";
import makeWASocket, { useSingleFileAuthState } from "@whiskeysockets/baileys";
import fs from "fs";

const { state, saveState } = useSingleFileAuthState("./auth.json");
const app = express();
const port = process.env.PORT || 8080;

let sock;
let currentPairingCode = null;

// Pairing logic
async function startBot(number) {
  return new Promise(async (resolve, reject) => {
    try {
      sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
      });

      sock.ev.on("creds.update", saveState);

      if (!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(number + "@s.whatsapp.net");
        currentPairingCode = code;
        console.log("✅ Pairing code generated:", code);
        resolve(code);
      } else {
        reject("Already registered");
      }
    } catch (err) {
      console.error("❌ Error in startBot:", err);
      reject(err);
    }
  });
}

app.get("/pair", async (req, res) => {
  const number = req.query.number;

  if (!number || !/^[0-9]{10,13}$/.test(number)) {
    return res.status(400).json({ error: "❌ Invalid or missing number. Use ?number=03001234567" });
  }

  try {
    const code = await startBot(number);
    if (!code) {
      return res.status(500).json({ error: "⚠️ Pairing code not available" });
    }
    return res.json({ pairing_code: code });
  } catch (err) {
    return res.status(500).json({ error: "❌ Failed to generate code", details: err.toString() });
  }
});

app.get("/", (req, res) => {
  res.send("✅ SniffX API is Live. Use /pair?number=03001234567");
});

app.listen(port, () => {
  console.log(`🚀 SniffX API running on http://localhost:${port}`);
});
