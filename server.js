const express = require("express");
const app = express();

app.use(express.json());

let dataStore = {};
let cmdStore = {}; // ← cmd per ESP, not global

app.post("/api/esp", (req, res) => {
  console.log("Primesc de la ESP", req.body);

  const { id, temp, hum, setpoint, calibTemp, relay } = req.body;

  dataStore[id] = { id, temp, hum, setpoint, calibTemp, relay };

  // ✅ send only this ESP's cmd, default empty if none set
  const espCmd = cmdStore[id] || {};

  res.json({
    ok: true,
    cmd: espCmd,
  });
});

app.post("/api/server", (req, res) => {
  const { id, cmd: incomingCmd } = req.body || {};

  // ✅ update only the specific ESP's cmd
  if (incomingCmd && id) {
    cmdStore[id] = {
      relay: incomingCmd.relay ?? cmdStore[id]?.relay,
      setpoint: incomingCmd.setpoint ?? cmdStore[id]?.setpoint,
      calibTemp: incomingCmd.calibTemp ?? cmdStore[id]?.calibTemp,
    };

    console.log(`Command for ${id}:`, cmdStore[id]);
  }

  const rooms = Object.values(dataStore);

  res.json({ rooms, cmd: id ? cmdStore[id] : {} });
});

app.listen(8787, "0.0.0.0", () => {
  console.log("Server running on port 8787");
});
