import express from "express";
import fetch from "node-fetch";

const app = express();

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas

// Middleware de seguridad básico
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'CS2 Offset Server');
  next();
});

// ✅ FIX: cada archivo tiene su propio timestamp
let cache = {
  client_dll: { data: null, updated_at: 0 },
  offsets_cs:  { data: null, updated_at: 0 },
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

// ✅ FIX: refresco automático en background cada 6 horas
async function refreshCache() {
  console.log("🔄 Actualizando caché...");
  try {
    cache.client_dll.data       = await fetchFileFromGitHub("client_dll.cs");
    cache.client_dll.updated_at = Date.now();
    console.log("✅ client_dll actualizado");
  } catch (err) {
    console.error("❌ Error actualizando client_dll:", err.message);
  }

  try {
    cache.offsets_cs.data       = await fetchFileFromGitHub("offsets.cs");
    cache.offsets_cs.updated_at = Date.now();
    console.log("✅ offsets_cs actualizado");
  } catch (err) {
    console.error("❌ Error actualizando offsets_cs:", err.message);
  }
}

// Carga inicial + intervalo automático
refreshCache();
setInterval(refreshCache, CACHE_TTL);

// Endpoint para client_dll.cs
app.get("/client_dll", async (req, res) => {
  const now = Date.now();

  if (cache.client_dll.data && now - cache.client_dll.updated_at < CACHE_TTL) {
    return res.type('text/plain').send(cache.client_dll.data);
  }

  try {
    cache.client_dll.data       = await fetchFileFromGitHub("client_dll.cs");
    cache.client_dll.updated_at = Date.now();
    res.type('text/plain').send(cache.client_dll.data);
  } catch (err) {
    if (cache.client_dll.data) return res.type('text/plain').send(cache.client_dll.data);
    res.status(500).send(`Error: ${err.message}`);
  }
});

// Endpoint para offsets.cs
app.get("/offsets", async (req, res) => {
  const now = Date.now();

  if (cache.offsets_cs.data && now - cache.offsets_cs.updated_at < CACHE_TTL) {
    return res.type('text/plain').send(cache.offsets_cs.data);
  }

  try {
    cache.offsets_cs.data       = await fetchFileFromGitHub("offsets.cs");
    cache.offsets_cs.updated_at = Date.now();
    res.type('text/plain').send(cache.offsets_cs.data);
  } catch (err) {
    if (cache.offsets_cs.data) return res.type('text/plain').send(cache.offsets_cs.data);
    res.status(500).send(`Error: ${err.message}`);
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  const now = Date.now();
  res.status(200).json({
    status: "OK",
    cache: {
      client_dll: {
        cached: !!cache.client_dll.data,
        age_ms: cache.client_dll.updated_at ? now - cache.client_dll.updated_at : null,
      },
      offsets_cs: {
        cached: !!cache.offsets_cs.data,
        age_ms: cache.offsets_cs.updated_at ? now - cache.offsets_cs.updated_at : null,
      },
    },
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).send('Endpoint not found. Available: /client_dll, /offsets, /health');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor de offsets activo`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   • /client_dll`);
  console.log(`   • /offsets`);
  console.log(`   • /health`);
});