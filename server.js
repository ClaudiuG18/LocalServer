const express = require("express");
const app = express();

app.use(express.json());
let cmd = {
  cmd: {
    relay: Number,
    setPoint: Number,
    calibTemp: Number,
  },
};

let dataStore = {};

app.post("/api/esp", (req, res) => {
  console.log("Primesc de la ESP", req.body);

  const { id, temp, hum } = req.body;

  dataStore[id] = {
    temp,
    hum,
    ts: Date.now(),
  };

  res.json({
    ok: true,
    cmd,
  });
});

app.post("/api/server", (req, res) => {
  res.json(dataStore);
  const { relay, setPoint, calibTemp } = req.body;
  cmd = {
    relay,
    setPoint,
    calibTemp,
  };

  console.log("Primesc comenzi de la app ", req.body);
});

app.listen(8787, "0.0.0.0", () => {
  console.log("Server running on port 8787");
});
