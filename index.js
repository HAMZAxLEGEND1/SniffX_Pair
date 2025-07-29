import express from "express";
import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ SniffX_Pair API is Live");
});

app.get("/generate-code", async (req, res) => {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  let sent = false;

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;

    if (qr && !sent) {
      sent = true;
      res.json({ success: true, qr_code: qr });
    }

    if (connection === "open") {
      console.log("✅ WhatsApp Connected");
    }
  });

  sock.ev.on("creds.update", saveCreds);
});

app.listen(PORT, () => {
  console.log(`✅ SniffX_Pair API running on port ${PORT}`);
});
