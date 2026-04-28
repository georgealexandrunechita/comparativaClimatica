const express = require('express');
const axios   = require('axios');
const NodeCache = require('node-cache');
const path    = require('path');

const app   = express();
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutos de TTL

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

// ── Ubicaciones fijas ──────────────────────────────────────────────────────
const LOCATIONS = [
  {
    id: 'vaslui',
    name: 'Vaslui',
    nameWiki: 'Vaslui',
    country: 'Rumanía',
    countryCode: 'RO',
    lat: 46.6407,
    lon: 27.7276,
    timezone: 'auto',
    flag: '🇷🇴',
    colorClass: 'loc-vaslui',
    description: 'Ciudad del noreste de Rumanía, capital del distrito homónimo'
  },
  {
    id: 'almonte',
    name: 'Almonte',
    nameWiki: 'Almonte, Huelva',
    country: 'España',
    countryCode: 'ES',
    lat: 37.2645,
    lon: -6.5175,
    timezone: 'auto',
    flag: '🇪🇸',
    colorClass: 'loc-almonte',
    description: 'Municipio de la provincia de Huelva, puerta del Parque de Doñana'
  },
  {
    id: 'north-pole',
    name: 'Polo Norte',
    nameWiki: 'North Pole',
    country: null,
    countryCode: null,
    lat: 89.9,
    lon: 0.0,
    timezone: 'UTC',
    flag: '🧊',
    colorClass: 'loc-north-pole',
    description: 'El punto más septentrional del planeta Tierra (90°N)'
  },
  {
    id: 'khartoum',
    name: 'Jartum',
    nameWiki: 'Khartoum',
    country: 'Sudán',
    countryCode: 'SD',
    lat: 15.5007,
    lon: 32.5599,
    timezone: 'auto',
    flag: '🌡️',
    colorClass: 'loc-khartoum',
    description: 'Capital de Sudán, una de las ciudades más calurosas del mundo'
  }
];

// ── Tablas de códigos WMO ──────────────────────────────────────────────────
const WMO_CODES = {
  0:  { label: 'Cielo despejado',           emoji: '☀️'  },
  1:  { label: 'Principalmente despejado',  emoji: '🌤️' },
  2:  { label: 'Parcialmente nublado',      emoji: '⛅'  },
  3:  { label: 'Nublado',                   emoji: '☁️'  },
  45: { label: 'Niebla',                    emoji: '🌫️' },
  48: { label: 'Niebla helada',             emoji: '🌫️' },
  51: { label: 'Llovizna ligera',           emoji: '🌦️' },
  53: { label: 'Llovizna moderada',         emoji: '🌦️' },
  55: { label: 'Llovizna intensa',          emoji: '🌧️' },
  61: { label: 'Lluvia ligera',             emoji: '🌧️' },
  63: { label: 'Lluvia moderada',           emoji: '🌧️' },
  65: { label: 'Lluvia intensa',            emoji: '🌧️' },
  71: { label: 'Nieve ligera',              emoji: '🌨️' },
  73: { label: 'Nieve moderada',            emoji: '❄️'  },
  75: { label: 'Nieve intensa',             emoji: '❄️'  },
  77: { label: 'Granizo de nieve',          emoji: '🌨️' },
  80: { label: 'Chubascos ligeros',         emoji: '🌦️' },
  81: { label: 'Chubascos moderados',       emoji: '🌧️' },
  82: { label: 'Chubascos fuertes',         emoji: '⛈️'  },
  85: { label: 'Aguanieve ligera',          emoji: '🌨️' },
  86: { label: 'Aguanieve intensa',         emoji: '🌨️' },
  95: { label: 'Tormenta eléctrica',        emoji: '⛈️'  },
  96: { label: 'Tormenta con granizo',      emoji: '⛈️'  },
  99: { label: 'Tormenta, granizo intenso', emoji: '⛈️'  },
};

function getWeatherInfo(code) {
  return WMO_CODES[code] || { label: 'Desconocido', emoji: '🌡️' };
}

function getTempClass(temp) {
  if (temp <= -15) return 'temp-arctic';
  if (temp <= 0)   return 'temp-cold';
  if (temp <= 12)  return 'temp-cool';
  if (temp <= 22)  return 'temp-mild';
  if (temp <= 32)  return 'temp-warm';
  return 'temp-hot';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── Fetch datos de una ubicación (con caché) ───────────────────────────────
async function fetchLocationData(loc) {
  const key = `loc:${loc.id}`;
  const hit = cache.get(key);
  if (hit) return { ...hit, location: loc, fromCache: true }; // loc siempre fresco

  const [weatherRes, wikiRes, countryRes] = await Promise.allSettled([

    // API 1 – Open-Meteo: tiempo actual + previsión 5 días
    axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude:        loc.lat,
        longitude:       loc.lon,
        current_weather: true,
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode',
        timezone:        loc.timezone,
        forecast_days:   5
      },
      timeout: 8000
    }),

    // API 2 – Wikipedia REST: resumen del artículo
    axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(loc.nameWiki)}`,
      { timeout: 8000 }
    ),

    // API 3 – REST Countries: datos del país (solo si tiene código)
    loc.countryCode
      ? axios.get(`https://restcountries.com/v3.1/alpha/${loc.countryCode}`, { timeout: 8000 })
      : Promise.resolve(null)
  ]);

  const weather = weatherRes.status === 'fulfilled'
    ? weatherRes.value.data : null;

  const wiki = (wikiRes.status === 'fulfilled' &&
                wikiRes.value.data?.type !== 'disambiguation')
    ? wikiRes.value.data : null;

  const country = (countryRes.status === 'fulfilled' && countryRes.value)
    ? countryRes.value.data[0] : null;

  const data = { location: loc, weather, wiki, country };
  if (weather) cache.set(key, data);
  return { ...data, fromCache: false };
}

// ── Rutas ──────────────────────────────────────────────────────────────────

// Página principal: comparativa de las 4 ubicaciones
app.get('/', async (req, res) => {
  try {
    const results = await Promise.all(LOCATIONS.map(fetchLocationData));
    res.render('index', { results, getWeatherInfo, getTempClass });
  } catch (err) {
    res.status(500).send(`<h2>Error cargando datos</h2><pre>${err.message}</pre>`);
  }
});

// Página de detalle de una ubicación
app.get('/location/:id', async (req, res) => {
  const loc = LOCATIONS.find(l => l.id === req.params.id);
  if (!loc) return res.redirect('/');
  try {
    const data = await fetchLocationData(loc);
    res.render('location', { ...data, getWeatherInfo, getTempClass, formatDate, LOCATIONS });
  } catch (err) {
    res.redirect('/');
  }
});

// Limpiar caché → recarga de página principal
app.post('/cache/clear', (req, res) => {
  cache.flushAll();
  res.redirect('/');
});

// Estadísticas de caché (JSON)
app.get('/cache/stats', (req, res) => {
  res.json({ stats: cache.getStats(), keys: cache.keys() });
});

// ── Arranque ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Comparativa Climática → http://localhost:${PORT}\n`);
});
