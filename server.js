const express = require("express");
const app = express();

app.use(express.json());

let dataStore = {};
let cmdStore = {};

app.post("/api/esp", (req, res) => {
  console.log("Primesc de la ESP", req.body);

  const { id, temp, hum, setpoint, calibTemp } = req.body;

  const espCmd = cmdStore[id] || {};

  // foloseste setpoint/calibTemp din app daca exista, altfel din ESP
  const sp = espCmd.setpoint ?? setpoint ?? 20;
  const calibT = espCmd.calibTemp ?? calibTemp ?? 0;
  const hyst = espCmd.hyst ?? 0.3;

  const adjustedTemp = temp + calibT;

  // logica termostat cu histereza
  let relayState = dataStore[id]?.relay || 0;
  if (adjustedTemp < sp - hyst) {
    relayState = 1; // prea frig → porneste
  } else if (adjustedTemp > sp + hyst) {
    relayState = 0; // destul de cald → opreste
  }

  // salveaza in store cu temp ajustata
  dataStore[id] = {
    id,
    temp,
    hum,
    setpoint: sp,
    calibTemp: calibT,
    relay: relayState,
  };

  console.log(
    `ESP ${id} | tempBruta: ${temp} | calibT: ${calibT} | adjustedTemp: ${adjustedTemp.toFixed(1)} | sp: ${sp} | relay: ${relayState}`,
  );

  res.json({
    ok: true,
    cmd: {
      ...espCmd,
      relay: relayState,
    },
  });
});

app.post("/api/server", (req, res) => {
  const { id, cmd: incomingCmd } = req.body || {};

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
