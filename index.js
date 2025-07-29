import express from "express";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

app.post("/pair", async (req, res) => {
  const phone = req.body.phone;

  if (!phone || !phone.startsWith("+")) {
    return res.status(400).json({ success: false, message: "Invalid phone number format (e.g., +923001234567)" });
  }

  const sessionFolder = path.join("sessions", phone.replace(/\+/g, ""));
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    generateHighQualityLinkPreview: true,
    browser: ["SniffX", "Chrome", "110.0.0.0"]
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, pairingCode } = update;

    if (qr) {
      console.log("QR Received. Scan in WhatsApp Web.");
    }

    if (pairingCode) {
      console.log("Pairing Code:", pairingCode);
      res.json({
        success: true,
        pairing_code: pairingCode,
        message: "Enter this code in your WhatsApp device to link it."
      });
    }

    if (connection === "open") {
      console.log("✅ Connected:", phone);
      await saveCreds();
    }

    if (connection === "close") {
      const reason = new Boom(update.lastDisconnect?.error)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log("Reconnecting...");
      }
    }
  });
});

app.listen(3000, () => {
  console.log("SniffX Pair API running on port 3000");
});
