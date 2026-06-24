import { getCopernicusToken } from "./copernicus-token.js";

const STATS_URL =
  process.env.VITE_COPERNICUS_STATS_URL ||
  process.env.COPERNICUS_STATS_URL ||
  "https://sh.dataspace.copernicus.eu/api/v1/statistics";

const SATELLITE_COLLECTION =
  process.env.VITE_COPERNICUS_COLLECTION ||
  process.env.COPERNICUS_COLLECTION ||
  "sentinel-2-l2a";

const DEFAULT_LOOKBACK_DAYS = Number(
  process.env.VITE_COPERNICUS_LOOKBACK_DAYS ||
    process.env.COPERNICUS_LOOKBACK_DAYS ||
    30,
);
const DEFAULT_CLOUD_COVER = Number(
  process.env.VITE_COPERNICUS_MAX_CLOUD_COVER ||
    process.env.COPERNICUS_MAX_CLOUD_COVER ||
    20,
);

function isValidLonLatPair(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const [lon, lat] = coord;
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

function normalizePolygonCoordinates(rawCoordinates) {
  if (!Array.isArray(rawCoordinates) || rawCoordinates.length < 4) {
    return null;
  }

  if (!rawCoordinates.every(isValidLonLatPair)) {
    return null;
  }

  const coordinates = [...rawCoordinates];
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    coordinates.push([first[0], first[1]]);
  }

  return coordinates;
}

function buildTimeRange(from, to) {
  const now = new Date();
  const endDate = to ? new Date(to) : now;
  const startDate = from
    ? new Date(from)
    : new Date(endDate.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  if (startDate >= endDate) {
    return null;
  }

  return {
    from: startDate.toISOString(),
    to: endDate.toISOString(),
  };
}

function mean(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function safeRatio(numerator, denominator) {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return null;
  }

  return numerator / denominator;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, value));
}

function toIndexCard(label, description, value, status) {
  return {
    label,
    description,
    value: value === null ? null : Number(value.toFixed(3)),
    status,
  };
}

function computeStatus(label, value) {
  if (value === null) return "Dato non disponibile";

  if (label === "NDVI") {
    if (value < 0) return "Acqua/Neve";
    if (value < 0.2) return "Terreno nudo";
    if (value < 0.5) return "Vegetazione debole";
    return "Vegetazione sana";
  }

  if (label === "EVI")
    return value > 0.4 ? "Vegetazione fitta" : "Vegetazione moderata";
  if (label === "GNDVI") return value > 0.5 ? "Ottimale" : "Monitorare";
  if (label === "NDWI")
    return value > 0 ? "Acqua presente" : "Assenza acqua superficiale";
  if (label === "MNDWI") return value > 0 ? "Acqua rilevata" : "Suolo asciutto";
  if (label === "NDMI")
    return value > 0.2 ? "Buona idratazione" : "Stress idrico possibile";
  if (label === "NBR") return value > 0.1 ? "Sano" : "Stress/Bruciato";
  if (label === "NDBI") return value < 0 ? "Naturale" : "Infrastrutture";
  if (label === "BSI")
    return value > 0.2 ? "Terreno esposto" : "Copertura vegetale";

  return "OK";
}

function parseBandMeans(statisticsResponse) {
  const intervals = statisticsResponse && statisticsResponse.data
    ? statisticsResponse.data
    : [];
  const outputBandMap = {
    B0: "B02",
    B1: "B03",
    B2: "B04",
    B3: "B08",
    B4: "B11",
    B5: "B12",
  };

  const bands = {
    B02: [],
    B03: [],
    B04: [],
    B08: [],
    B11: [],
    B12: [],
  };

  intervals.forEach((item) => {
    const outputs =
      item &&
      item.outputs &&
      item.outputs.default &&
      item.outputs.default.bands
        ? item.outputs.default.bands
        : {};
    Object.entries(outputBandMap).forEach(([outputBandName, targetBandName]) => {
      const outputBand = outputs[outputBandName];
      const value =
        outputBand && outputBand.stats ? outputBand.stats.mean : undefined;
      if (Number.isFinite(value)) {
        bands[targetBandName].push(value);
      }
    });
  });

  return {
    B02: mean(bands.B02),
    B03: mean(bands.B03),
    B04: mean(bands.B04),
    B08: mean(bands.B08),
    B11: mean(bands.B11),
    B12: mean(bands.B12),
  };
}

function hasValidBandData(item) {
  const outputBands =
    item &&
    item.outputs &&
    item.outputs.default &&
    item.outputs.default.bands
      ? item.outputs.default.bands
      : {};

  return Object.values(outputBands).some((band) =>
    Number.isFinite(band && band.stats ? band.stats.mean : undefined),
  );
}

function getLatestAcquisitionDate(statisticsResponse) {
  const intervals = statisticsResponse && statisticsResponse.data
    ? statisticsResponse.data
    : [];
  const validIntervals = intervals.filter(hasValidBandData);

  if (!validIntervals.length) {
    return null;
  }

  const latestInterval = validIntervals.reduce((latest, current) => {
    const latestTo =
      latest && latest.interval && latest.interval.to ? latest.interval.to : 0;
    const currentTo =
      current && current.interval && current.interval.to
        ? current.interval.to
        : 0;
    const latestTime = new Date(latestTo).getTime();
    const currentTime = new Date(currentTo).getTime();
    return currentTime > latestTime ? current : latest;
  });

  return latestInterval && latestInterval.interval && latestInterval.interval.to
    ? latestInterval.interval.to
    : null;
}

function computeIndicesFromBands(bands) {
  const { B02, B03, B04, B08, B11, B12 } = bands;

  const ndvi = safeRatio(B08 - B04, B08 + B04);
  const evi = safeRatio(2.5 * (B08 - B04), B08 + 6 * B04 - 7.5 * B02 + 1);
  const gndvi = safeRatio(B08 - B03, B08 + B03);
  const ndwi = safeRatio(B03 - B08, B03 + B08);
  const mndwi = safeRatio(B03 - B11, B03 + B11);
  const ndmi = safeRatio(B08 - B11, B08 + B11);
  const nbr = safeRatio(B08 - B12, B08 + B12);
  const ndbi = safeRatio(B11 - B08, B11 + B08);
  const bsi = safeRatio(B11 + B04 - (B08 + B02), B11 + B04 + B08 + B02);

  const normalized = {
    ndvi: clamp(ndvi, -1, 1),
    evi: clamp(evi, -1, 1),
    gndvi: clamp(gndvi, -1, 1),
    ndwi: clamp(ndwi, -1, 1),
    mndwi: clamp(mndwi, -1, 1),
    ndmi: clamp(ndmi, -1, 1),
    nbr: clamp(nbr, -1, 1),
    ndbi: clamp(ndbi, -1, 1),
    bsi: clamp(bsi, -1, 1),
  };

  return {
    ndvi: toIndexCard(
      "NDVI",
      "Stato di salute della vegetazione",
      normalized.ndvi,
      computeStatus("NDVI", normalized.ndvi),
    ),
    evi: toIndexCard(
      "EVI",
      "Indice di vegetazione potenziato",
      normalized.evi,
      computeStatus("EVI", normalized.evi),
    ),
    gndvi: toIndexCard(
      "GNDVI",
      "Agricoltura di precisione",
      normalized.gndvi,
      computeStatus("GNDVI", normalized.gndvi),
    ),
    ndwi: toIndexCard(
      "NDWI",
      "Indice dell'acqua",
      normalized.ndwi,
      computeStatus("NDWI", normalized.ndwi),
    ),
    mndwi: toIndexCard(
      "MNDWI",
      "Indice acqua modificato",
      normalized.mndwi,
      computeStatus("MNDWI", normalized.mndwi),
    ),
    ndmi: toIndexCard(
      "NDMI",
      "Umidita delle piante",
      normalized.ndmi,
      computeStatus("NDMI", normalized.ndmi),
    ),
    nbr: toIndexCard(
      "NBR",
      "Indice di bruciatura",
      normalized.nbr,
      computeStatus("NBR", normalized.nbr),
    ),
    ndbi: toIndexCard(
      "NDBI",
      "Indice aree edificate",
      normalized.ndbi,
      computeStatus("NDBI", normalized.ndbi),
    ),
    bsi: toIndexCard(
      "BSI",
      "Indice suolo nudo",
      normalized.bsi,
      computeStatus("BSI", normalized.bsi),
    ),
  };
}

function buildStatisticsPayload({ coordinates, timeRange, cloudCoverage }) {
  const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B02", "B03", "B04", "B08", "B11", "B12", "dataMask"],
      units: "REFLECTANCE"
    }],
    output: [
      { id: "default", bands: 6, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8" }
    ]
  };
}
function evaluatePixel(sample) {
  return {
    default: [
      sample.B02,
      sample.B03,
      sample.B04,
      sample.B08,
      sample.B11,
      sample.B12
    ],
    dataMask: [sample.dataMask]
  };
}
`;

  return {
    input: {
      bounds: {
        properties: {
          crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
        },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      },
      data: [
        {
          type: SATELLITE_COLLECTION,
          dataFilter: {
            timeRange,
            maxCloudCoverage: cloudCoverage,
          },
        },
      ],
    },
    aggregation: {
      timeRange,
      aggregationInterval: { of: "P5D" },
      resx: 10,
      resy: 10,
      evalscript,
    },
    calculations: {
      default: {
        statistics: {
          default: {
            percentiles: {
              k: [5, 50, 95],
            },
          },
        },
      },
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};
  const coordinates = normalizePolygonCoordinates(body.coordinates);
  const timeRange = buildTimeRange(body.dateFrom, body.dateTo);
  const cloudCoverage = Number.isFinite(body.maxCloudCoverage)
    ? body.maxCloudCoverage
    : DEFAULT_CLOUD_COVER;

  if (!coordinates) {
    return res.status(400).json({
      error: "Invalid polygon",
      message: "coordinates must be an array of valid [lon, lat] points",
    });
  }

  if (!timeRange) {
    return res.status(400).json({
      error: "Invalid date range",
      message: "dateFrom must be earlier than dateTo",
    });
  }

  try {
    const token = await getCopernicusToken();
    const payload = buildStatisticsPayload({
      coordinates,
      timeRange,
      cloudCoverage,
    });

    const response = await fetch(STATS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("Copernicus statistics response:", result);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Copernicus statistics request failed",
        message:
          (result &&
            result.error &&
            result.error.message) ||
          (result && result.message) ||
          "Unknown upstream error",
      });
    }

    const bandMeans = parseBandMeans(result);
    const indices = computeIndicesFromBands(bandMeans);
    const latestAcquisitionDate = getLatestAcquisitionDate(result);

    return res.status(200).json({
      source: "copernicus-statistics",
      timeRange,
      cloudCoverage,
      latestAcquisitionDate,
      indices,
      upstreamResponse: result,
    });
  } catch (error) {
    return res.status(502).json({
      error: "Copernicus integration error",
      message: error.message,
    });
  }
}
