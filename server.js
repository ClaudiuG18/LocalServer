const express = require("express");
const app = express();

app.use(express.json());
let cmd = {
  cmd: {
    relay: Number,
    setpoint: Number,
    calibTemp: Number,
  },
};

let dataStore = {};

app.post("/api/esp", (req, res) => {
  console.log("Primesc de la ESP", req.body);

  const { id, temp, hum, setpoint, calibTemp, relay } = req.body;

  dataStore[id] = {
    id,
    temp,
    hum,
    setpoint,
    calibTemp,
    relay,
  };

  res.json({
    ok: true,
    cmd,
  });
});

app.post("/api/server", (req, res) => {
  const { id, cmd: incomingCmd } = req.body || {};

  // ✅ Update command if provided
  if (incomingCmd) {
    cmd = {
      cmd: {
        relay: incomingCmd.relay ?? cmd.cmd.relay,
        setpoint: incomingCmd.setPoint ?? cmd.cmd.setpoint,
        calibTemp: incomingCmd.calibTemp ?? cmd.cmd.calibTemp,
      },
    };

    console.log("Received command from app:", incomingCmd);
  }

  // ✅ Return current sensor data + command
  const result = Object.keys(dataStore).map((roomId) => ({
    id: roomId,
    ...dataStore[roomId],
  }));

  res.json({
    rooms: result,
    cmd,
  });
});

app.listen(8787, "0.0.0.0", () => {
  console.log("Server running on port 8787");
});
