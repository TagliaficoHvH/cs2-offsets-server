// server.js
// Servidor proxy para entregar offsets de CS2 sin limitaciones de GitHub
// Usa Node.js + Express + node-fetch
// Guarda cache por 12 horas

import express from "express";
import fetch from "node-fetch";

const app = express();

let cache = {
  client_dll: null,
  offsets_cs: null,
  updated_at: 0,
};

// Función auxiliar para descargar un archivo del repositorio de GitHub
async function fetchFileFromGitHub(path) {
  const url = `https://api.github.com/repos/a2x/cs2-dumper/contents/output/${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`, // ⚠️ Guarda tu token en variable de entorno
      "User-Agent": "OffsetFetcher",
    },
  });

  if (!response.ok) {
    throw new Error(`Error al descargar ${path}: ${response.status}`);
  }

  const json = await response.json();
  return Buffer.from(json.content, "base64").toString("utf8");
}

// --- RUTA 1: client_dll.cs ---
app.get("/client_dll", async (req, res) => {
  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  if (cache.client_dll && now - cache.updated_at < TWELVE_HOURS) {
    console.log("✅ Sirviendo client_dll.cs desde caché");
    return res.send(cache.client_dll);
  }

  try {
    console.log("🔄 Descargando client_dll.cs desde GitHub...");
    cache.client_dll = await fetchFileFromGitHub("client_dll.cs");
    cache.updated_at = now;
    console.log("✅ client_dll.cs actualizado.");
    res.send(cache.client_dll);
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (cache.client_dll) {
      console.log("⚠️ Usando versión en caché de client_dll.cs");
      return res.send(cache.client_dll);
    }
    res.status(500).send(`Error: ${err.message}`);
  }
});

// --- RUTA 2: offsets.cs ---
app.get("/offsets", async (req, res) => {
  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  if (cache.offsets_cs && now - cache.updated_at < TWELVE_HOURS) {
    console.log("✅ Sirviendo offsets.cs desde caché");
    return res.send(cache.offsets_cs);
  }

  try {
    console.log("🔄 Descargando offsets.cs desde GitHub...");
    cache.offsets_cs = await fetchFileFromGitHub("offsets.cs");
    cache.updated_at = now;
    console.log("✅ offsets.cs actualizado.");
    res.send(cache.offsets_cs);
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (cache.offsets_cs) {
      console.log("⚠️ Usando versión en caché de offsets.cs");
      return res.send(cache.offsets_cs);
    }
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.listen(3000, () => {
  console.log("🌐 Servidor de offsets activo:");
  console.log(" - http://localhost:3000/client_dll");
  console.log(" - http://localhost:3000/offsets");
});
