const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// =====================================================
// DATA
// =====================================================

// Ultimele date raportate de fiecare ESP
let dataStore = {};

// Comenzi trimise de website către ESP
// Comanda este ștearsă după ce este livrată ESP-ului.
let cmdStore = {};

// =====================================================
// TEST
// =====================================================

app.get("/api", (req, res) => {
  res.json({
    app: "merge",
  });
});

// =====================================================
// ESP → SERVER
// =====================================================

app.post("/api/esp", (req, res) => {
  console.log("Primesc de la ESP:", req.body);

  const { id, temp, rawTemp, hum, setpoint, calibTemp, hyst, relay } = req.body;

  // ---------------------------------------------------
  // Verificare ID
  // ---------------------------------------------------

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Missing ESP id",
    });
  }

  // ---------------------------------------------------
  // Verificăm dacă există o comandă de la website
  // ---------------------------------------------------

  const espCmd = cmdStore[id] || {};

  const commandSetpoint =
    espCmd.setpoint !== undefined ? Number(espCmd.setpoint) : Number(setpoint);

  const commandCalibTemp =
    espCmd.calibTemp !== undefined
      ? Number(espCmd.calibTemp)
      : Number(calibTemp);

  // ---------------------------------------------------
  // Salvăm datele REALE raportate de ESP
  // ---------------------------------------------------

  dataStore[id] = {
    id,

    temp: Number(temp),
    rawTemp: Number(rawTemp),
    hum: Number(hum),

    setpoint: Number(setpoint),
    calibTemp: Number(calibTemp),
    hyst: Number(hyst),

    relay: Number(relay),

    lastUpdate: Date.now(),
  };

  // ---------------------------------------------------
  // LOG
  // ---------------------------------------------------

  console.log(
    `ESP ${id} | ` +
      `temp: ${temp} | ` +
      `rawTemp: ${rawTemp} | ` +
      `hum: ${hum} | ` +
      `setpoint: ${setpoint} | ` +
      `calib: ${calibTemp} | ` +
      `hyst: ${hyst} | ` +
      `relay: ${relay}`,
  );

  // ---------------------------------------------------
  // COMANDA A FOST LIVRATĂ
  // ---------------------------------------------------
  //
  // Foarte important:
  //
  // Dacă website-ul a trimis o comandă,
  // o trimitem către ESP o singură dată.
  //
  // După ce ESP a primit răspunsul,
  // ștergem comanda.
  //
  // Astfel o valoare veche de pe server
  // nu poate suprascrie o valoare setată
  // ulterior din aplicația MAUI.
  // ---------------------------------------------------

  const hadCommand = Object.keys(espCmd).length > 0;

  if (hadCommand) {
    delete cmdStore[id];

    console.log(`Command delivered to ESP ${id} and removed from cmdStore.`);
  }

  // ---------------------------------------------------
  // RESPONSE → ESP
  // ---------------------------------------------------

  res.json({
    ok: true,

    cmd: {
      setpoint: commandSetpoint,
      calibTemp: commandCalibTemp,
    },
  });
});

// =====================================================
// WEBSITE → SERVER
// =====================================================

app.post("/api/server", (req, res) => {
  const { id, cmd: incomingCmd } = req.body || {};

  // ---------------------------------------------------
  // WEBSITE TRIMITE O COMANDĂ
  // ---------------------------------------------------

  if (incomingCmd && id) {
    // -----------------------------------------------
    // SETPOINT
    // -----------------------------------------------

    if (incomingCmd.setpoint !== undefined) {
      const value = Number(incomingCmd.setpoint);

      if (Number.isFinite(value)) {
        cmdStore[id] = {
          ...(cmdStore[id] || {}),
          setpoint: value,
        };
      }
    }

    // -----------------------------------------------
    // CALIBRATION
    // -----------------------------------------------

    if (incomingCmd.calibTemp !== undefined) {
      const value = Number(incomingCmd.calibTemp);

      if (Number.isFinite(value)) {
        cmdStore[id] = {
          ...(cmdStore[id] || {}),
          calibTemp: value,
        };
      }
    }

    console.log(`Command for ${id}:`, cmdStore[id]);
  }

  // ---------------------------------------------------
  // ROOMS
  // ---------------------------------------------------

  const rooms = Object.values(dataStore);

  console.log("Rooms trimise la app:", JSON.stringify(rooms));

  console.log("dataStore:", JSON.stringify(dataStore));

  console.log("Rooms:", rooms.length);

  // ---------------------------------------------------
  // RESPONSE → WEBSITE
  // ---------------------------------------------------

  res.json({
    rooms,

    cmd: id ? cmdStore[id] || {} : {},
  });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(8787, "0.0.0.0", () => {
  console.log("Server running on port 8787");
});
