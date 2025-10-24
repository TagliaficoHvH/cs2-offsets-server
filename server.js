import express from "express";
import fetch from "node-fetch";

const app = express();

let cache = {
  client_dll: null,
  offsets_cs: null,
  updated_at: 0,
};

async function fetchFileFromGitHub(path) {
  const url = `https://api.github.com/repos/a2x/cs2-dumper/contents/output/${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      "User-Agent": "OffsetFetcher",
    },
  });

  if (!response.ok) {
    throw new Error(`Error al descargar ${path}: ${response.status}`);
  }

  const json = await response.json();
  return Buffer.from(json.content, "base64").toString("utf8");
}

// Endpoint para client_dll.cs
app.get("/client_dll", async (req, res) => {
  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  if (cache.client_dll && now - cache.updated_at < TWELVE_HOURS) {
    return res.send(cache.client_dll);
  }

  try {
    cache.client_dll = await fetchFileFromGitHub("client_dll.cs");
    cache.updated_at = now;
    res.send(cache.client_dll);
  } catch (err) {
    if (cache.client_dll) return res.send(cache.client_dll);
    res.status(500).send(`Error: ${err.message}`);
  }
});

// Endpoint para offsets.cs
app.get("/offsets", async (req, res) => {
  const now = Date.now();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  if (cache.offsets_cs && now - cache.updated_at < TWELVE_HOURS) {
    return res.send(cache.offsets_cs);
  }

  try {
    cache.offsets_cs = await fetchFileFromGitHub("offsets.cs");
    cache.updated_at = now;
    res.send(cache.offsets_cs);
  } catch (err) {
    if (cache.offsets_cs) return res.send(cache.offsets_cs);
    res.status(500).send(`Error: ${err.message}`);
  }
});

// 🔑 Cambiado: usar el puerto que Render asigna
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor de offsets activo en http://localhost:${PORT}`);
});
