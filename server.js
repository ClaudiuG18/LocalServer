const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

let dataStore = {};
let cmdStore = {};

app.get("/api", (req, resp) => {
  resp.json({ app: "merge" });
});

app.post("/api/esp", (req, res) => {
  console.log("Primesc de la ESP", req.body);

  const { id, temp, hum, setpoint, calibTemp } = req.body;

  const espCmd = cmdStore[id] || {};

  const sp = Number(espCmd.setpoint ?? setpoint ?? 20);
  const calibT = Number(espCmd.calibTemp ?? calibTemp ?? 0);
  const hyst = Number(espCmd.hyst ?? 0.3);

  const adjustedTemp = Number(temp) + calibT;

  let relayState = dataStore[id]?.relay || 0;
  if (adjustedTemp < sp - hyst) {
    relayState = 1;
  } else if (adjustedTemp > sp + hyst) {
    relayState = 0;
  }

  dataStore[id] = {
    id,
    temp: adjustedTemp,
    hum,
    setpoint: sp,
    calibTemp: calibT,
    relay: relayState,
  };

  console.log(
    `ESP ${id} | tempBruta: ${temp} | calibT: ${calibT} | adjustedTemp: ${adjustedTemp.toFixed(1)} | sp: ${sp} | relay: ${relayState}`
  );

  res.json({
    ok: true,
    cmd: {
      relay: relayState,
      setpoint: sp,
      calibTemp: calibT,
      hyst: hyst,
    },
  });
});

app.post("/api/server", (req, res) => {
  const { id, cmd: incomingCmd } = req.body || {};

  if (incomingCmd && id) {
    cmdStore[id] = {
      ...(cmdStore[id] || {}),
      ...(incomingCmd.relay !== undefined && { relay: incomingCmd.relay }),
      ...(incomingCmd.setpoint !== undefined && { setpoint: incomingCmd.setpoint }),
      ...(incomingCmd.calibTemp !== undefined && { calibTemp: incomingCmd.calibTemp }),
      ...(incomingCmd.hyst !== undefined && { hyst: incomingCmd.hyst }),
    };

    console.log(`Command for ${id}:`, cmdStore[id]);
  }

  const rooms = Object.values(dataStore);

  console.log("Rooms trimise la app:", JSON.stringify(rooms));
  console.log("dataStore:", JSON.stringify(dataStore));
  console.log("Rooms:", rooms.length);

  res.json({ rooms, cmd: id ? cmdStore[id] : {} });
});

app.listen(8787, "0.0.0.0", () => {
  console.log("Server running on port 8787");
});