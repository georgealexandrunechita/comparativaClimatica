# Comparativa Climática Mundial

Aplicación web tipo mashup que muestra datos meteorológicos, geográficos y enciclopédicos de cuatro ubicaciones con climas muy contrastados:

| Ubicación | Descripción |
|-----------|-------------|
| 🇷🇴 Vaslui (Rumanía) | Ciudad del noreste de Europa, clima continental |
| 🇪🇸 Almonte (Huelva) | Municipio andaluz, clima mediterráneo cálido |
| 🧊 Polo Norte | El punto más frío del planeta, ~-30°C en invierno |
| 🌡️ Jartum (Sudán) | Capital de Sudán, una de las ciudades más calurosas del mundo |

---

## APIs utilizadas

### 1. Open-Meteo (`api.open-meteo.com`)
API meteorológica gratuita, sin autenticación.

| Ruta | Uso |
|------|-----|
| `GET /v1/forecast` | Tiempo actual + previsión de 5 días |

Parámetros: `latitude`, `longitude`, `current_weather=true`, `daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode`, `timezone`, `forecast_days=5`

---

### 2. Wikipedia REST API (`en.wikipedia.org/api/rest_v1`)
API pública de Wikipedia, sin autenticación.

| Ruta | Uso |
|------|-----|
| `GET /page/summary/{title}` | Resumen del artículo + imagen de portada |

Títulos consultados: `Vaslui`, `Almonte, Huelva`, `North Pole`, `Khartoum`

---

### 3. REST Countries (`restcountries.com/v3.1`)
API de datos geopolíticos de países, gratuita y sin autenticación.

| Ruta | Uso |
|------|-----|
| `GET /alpha/{code}` | Nombre, bandera, población, área, moneda, idiomas, zona horaria |

Códigos usados: `RO` (Rumanía), `ES` (España), `SD` (Sudán).
El Polo Norte no tiene país asociado, por lo que esta llamada se omite para esa ubicación.

---

## Relación entre las APIs

El objetivo es responder a la pregunta: **¿qué tan diferente puede ser el clima y la vida en distintos puntos del planeta?**

- **Open-Meteo** aporta el dato principal: la temperatura y condiciones meteorológicas en tiempo real.
- **REST Countries** contextualiza cada lugar mostrando datos del país (bandera, idioma, moneda, población).
- **Wikipedia** añade una descripción enciclopédica de cada ciudad o lugar.

Las tres APIs se complementan para que el usuario no solo vea números, sino que entienda *dónde está* cada lugar, *qué tiempo hace* allí ahora mismo y *qué es* ese lugar históricamente.

---

## API Keys necesarias

**Ninguna.** Las tres APIs son completamente gratuitas y de acceso abierto, sin registro ni autenticación requerida.

---

## Sistema de caché

Se usa el paquete `node-cache` con **TTL de 10 minutos**.

- **Clave de caché:** `loc:{id}` — por ejemplo `loc:vaslui`, `loc:almonte`
- Cuando los datos provienen de caché, la tarjeta muestra el badge **⚡ caché**
- El botón **↺ Refrescar datos** limpia toda la caché y fuerza nuevas peticiones a las APIs
- El endpoint `/cache/stats` devuelve estadísticas en JSON (hits, misses, claves activas)

---

## Instalación y uso

```bash
npm install
npm start
```

Acceder en: **http://localhost:3000**

Para desarrollo con recarga automática:
```bash
npm run dev
```

---

## Estructura del proyecto

```
├── server.js          # Servidor Express, lógica de APIs y caché
├── views/
│   ├── index.ejs      # Página principal: comparativa de las 4 ubicaciones
│   └── location.ejs   # Página de detalle de una ubicación
├── public/
│   └── style.css      # Estilos con codificación de color por temperatura
├── package.json
└── README.md
```

## Despliegue
Desplegado en Render:
 - https://comparativaclimatica.onrender.com/

