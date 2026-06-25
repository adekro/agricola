import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile";
import ImageLayer from "ol/layer/Image";
import { Vector as VectorLayer } from "ol/layer";
import { Feature } from "ol";
import { Polygon } from "ol/geom";
import { defaults as defaultControls } from "ol/control.js";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { ImageWMS, Vector as VectorSource } from "ol/source";
import { Fill, Stroke, Style, Text as OlText } from "ol/style";
import { fromLonLat, get as getProjection } from "ol/proj";
import { register } from "ol/proj/proj4";
import proj4 from "proj4";
import { MAP_PROVIDERS } from "../../config/mapProviders";
import { createCadastralSource } from "../../lib/cadastralWms";
import { CADASTRAL_LAYERS } from "../../config/cadastralLayers";

const DEFAULT_CENTER = [9.3, 45.08];
const HIGHLIGHT_COLORS = [
  "#d62828",
  "#1d4ed8",
  "#0f9d58",
  "#f59e0b",
  "#7c3aed",
  "#db2777",
];

function getComuneLabel(rows) {
  const comuni = [
    ...new Set((rows || []).map((row) => row.comune).filter(Boolean)),
  ];
  if (comuni.length === 0) return "";
  if (comuni.length === 1) return comuni[0];
  return `${comuni[0]} + ${comuni.length - 1} altri comuni`;
}

function buildRowKey(row) {
  return `${row.comune}-${row.foglio}-${row.mappale}`;
}

function buildParcelFilter(mappale) {
  return `LABEL='${String(mappale).replace(/'/g, "''")}'`;
}

function buildFoglioFilter(foglio) {
  return `LABEL='${String(foglio).replace(/'/g, "''")}'`;
}

function buildCadastralWmsUrl({ layerName, filter, bbox, width, height }) {
  const query = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    SRS: "EPSG:6706",
    BBOX: bbox.join(","),
    WIDTH: String(width),
    HEIGHT: String(height),
    LAYERS: layerName,
    STYLES: "",
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
    CQL_FILTER: filter,
  });

  return `/api/cadastral-wms?${query.toString()}`;
}

function createPolygonFromExtent(extent) {
  const [minX, minY, maxX, maxY] = extent;
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ];
}

function cross(origin, a, b) {
  return (
    (a[0] - origin[0]) * (b[1] - origin[1]) -
    (a[1] - origin[1]) * (b[0] - origin[0])
  );
}

function computeConvexHull(points) {
  if (points.length < 3) {
    return points;
  }

  const sorted = [...points].sort((a, b) =>
    a[0] === b[0] ? a[1] - b[1] : a[0] - b[0],
  );

  const lower = [];
  sorted.forEach((point) => {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    ) {
      lower.pop();
    }
    lower.push(point);
  });

  const upper = [];
  sorted
    .slice()
    .reverse()
    .forEach((point) => {
      while (
        upper.length >= 2 &&
        cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
      ) {
        upper.pop();
      }
      upper.push(point);
    });

  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

function projectPixelToLonLat(x, y, bbox, width, height) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const lon = minLon + (x / width) * (maxLon - minLon);
  const lat = maxLat - (y / height) * (maxLat - minLat);
  return [lon, lat];
}

async function loadImageData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Errore caricamento overlay catastale");
  }

  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  context.drawImage(imageBitmap, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function extractGeometryFromMasks(parcelImageData, foglioImageData, bbox) {
  const width = parcelImageData.width;
  const height = parcelImageData.height;
  const parcelData = parcelImageData.data;
  const foglioData = foglioImageData?.data || null;
  const parcelPixels = [];
  const intersectionPixels = [];

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      const parcelAlpha = parcelData[index + 3];

      if (parcelAlpha === 0) {
        continue;
      }

      parcelPixels.push([x, y]);

      if (foglioData && foglioData[index + 3] > 0) {
        intersectionPixels.push([x, y]);
      }
    }
  }

  const relevantPixels =
    intersectionPixels.length > 0 ? intersectionPixels : parcelPixels;

  if (relevantPixels.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  relevantPixels.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  const bottomLeft = projectPixelToLonLat(minX, maxY, bbox, width, height);
  const topRight = projectPixelToLonLat(maxX, minY, bbox, width, height);
  const extent4326 = [bottomLeft[0], bottomLeft[1], topRight[0], topRight[1]];

  const hull = computeConvexHull(
    relevantPixels.map(([x, y]) =>
      projectPixelToLonLat(x, y, bbox, width, height),
    ),
  );

  const polygon4326 =
    hull.length >= 3 ? [...hull, hull[0]] : createPolygonFromExtent(extent4326);

  const polygon3857 = polygon4326.map(([lon, lat]) => fromLonLat([lon, lat]));
  const bottomLeft3857 = fromLonLat([extent4326[0], extent4326[1]]);
  const topRight3857 = fromLonLat([extent4326[2], extent4326[3]]);
  const extent3857 = [
    bottomLeft3857[0],
    bottomLeft3857[1],
    topRight3857[0],
    topRight3857[1],
  ];

  return {
    polygon3857,
    extent3857,
  };
}

async function resolveRowHighlight(row, comuneBbox) {
  const width = 1024;
  const height = 1024;
  const parcelUrl = buildCadastralWmsUrl({
    layerName: "CP.CadastralParcel",
    filter: buildParcelFilter(row.mappale),
    bbox: comuneBbox,
    width,
    height,
  });
  const foglioUrl = buildCadastralWmsUrl({
    layerName: "CP.CadastralZoning",
    filter: buildFoglioFilter(row.foglio),
    bbox: comuneBbox,
    width,
    height,
  });

  const [parcelImageData, foglioImageData] = await Promise.all([
    loadImageData(parcelUrl),
    loadImageData(foglioUrl).catch(() => null),
  ]);

  const geometry = extractGeometryFromMasks(
    parcelImageData,
    foglioImageData,
    comuneBbox,
  );

  if (!geometry) {
    return null;
  }

  return {
    ...row,
    key: buildRowKey(row),
    ...geometry,
  };
}

proj4.defs("EPSG:6706", "+proj=longlat +ellps=GRS80 +no_defs +type=crs");
register(proj4);
const cadastralProjection = getProjection("EPSG:6706");
if (cadastralProjection) {
  cadastralProjection.setExtent([5.93, 34.76, 18.99, 47.1]);
}

const EvidenziaMappaliScreen = ({ mappaliRows, onBack }) => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState(fromLonLat(DEFAULT_CENTER));
  const [mapZoom, setMapZoom] = useState(15);
  const [geocodeError, setGeocodeError] = useState("");
  const [highlightRows, setHighlightRows] = useState([]);
  const [activeRowKey, setActiveRowKey] = useState(null);
  const [mapProvider, setMapProvider] = useState("osm");
  const [showCadastral, setShowCadastral] = useState(true);

  useEffect(() => {
    if (!mappaliRows || mappaliRows.length === 0) {
      navigate("/");
      return;
    }

    const fetchComuneCenter = async () => {
      setLoading(true);
      setGeocodeError("");
      setHighlightRows([]);
      setActiveRowKey(null);

      const firstComune = mappaliRows[0]?.comune;
      if (!firstComune) {
        setMapCenter(fromLonLat(DEFAULT_CENTER));
        setMapZoom(15);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/geocode-comune?comune=${encodeURIComponent(firstComune)}`,
        );

        if (!response.ok) {
          throw new Error("Impossibile centrare il comune richiesto");
        }

        const data = await response.json();
        if (Number.isFinite(data.lon) && Number.isFinite(data.lat)) {
          setMapCenter(fromLonLat([data.lon, data.lat]));
          setMapZoom(16);

          if (Array.isArray(data.boundingbox) && data.boundingbox.length === 4) {
            const comuneBbox = [
              data.boundingbox[2],
              data.boundingbox[0],
              data.boundingbox[3],
              data.boundingbox[1],
            ];

            const resolvedHighlights = (
              await Promise.all(
                mappaliRows.map((row) =>
                  resolveRowHighlight(row, comuneBbox).catch(() => null),
                ),
              )
            ).filter(Boolean);

            setHighlightRows(resolvedHighlights);
            if (resolvedHighlights.length > 0) {
              setActiveRowKey(resolvedHighlights[0].key);
            }
          }
        } else {
          setMapCenter(fromLonLat(DEFAULT_CENTER));
          setMapZoom(15);
        }
      } catch {
        setMapCenter(fromLonLat(DEFAULT_CENTER));
        setMapZoom(15);
        setGeocodeError(
          "Non sono riuscito a centrare automaticamente il comune. La mappa resta navigabile manualmente.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchComuneCenter();
  }, [mappaliRows, navigate]);

  useEffect(() => {
    if (loading || !mapRef.current) return;

    const provider =
      MAP_PROVIDERS.find((item) => item.key === mapProvider) || MAP_PROVIDERS[0];

    const baseLayer = new TileLayer({
      visible: true,
      preload: Infinity,
      source: provider.url
        ? new XYZ({
            url: provider.url,
            attributions: provider.attribution,
            crossOrigin: "anonymous",
          })
        : new OSM({ attributions: provider.attribution }),
    });

    const layers = [baseLayer];

    if (showCadastral) {
      const cadastralConfig = CADASTRAL_LAYERS.find(
        (layer) => layer.key === "agenziaEntrateParcel",
      );

      if (cadastralConfig) {
        layers.push(
          new TileLayer({
            visible: true,
            opacity: 0.7,
            source: createCadastralSource(cadastralConfig),
          }),
        );
      }
    }

    const activeRow = highlightRows.find((row) => row.key === activeRowKey);
    if (activeRow) {
      layers.push(
        new ImageLayer({
          opacity: 0.85,
          source: new ImageWMS({
            url: "/api/cadastral-wms",
            projection: "EPSG:6706",
            params: {
              LAYERS: "CP.CadastralParcel",
              VERSION: "1.1.1",
              FORMAT: "image/png",
              TRANSPARENT: true,
              CQL_FILTER: buildParcelFilter(activeRow.mappale),
            },
            ratio: 1,
            crossOrigin: "anonymous",
          }),
          zIndex: 9,
        }),
      );
    }

    const features = highlightRows.map((row, index) => {
      const color = HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
      const feature = new Feature({
        geometry: new Polygon([row.polygon3857]),
      });

      feature.setId(row.key);
      feature.setStyle(
        new Style({
          fill: new Fill({
            color: row.key === activeRowKey ? `${color}44` : `${color}22`,
          }),
          stroke: new Stroke({
            color,
            width: row.key === activeRowKey ? 3 : 2,
          }),
          text: new OlText({
            text: `${row.foglio}/${row.mappale}`,
            font: "bold 12px sans-serif",
            fill: new Fill({ color: "#111827" }),
            stroke: new Stroke({ color: "#ffffff", width: 3 }),
            overflow: true,
          }),
        }),
      );

      return feature;
    });

    if (features.length > 0) {
      layers.push(
        new VectorLayer({
          source: new VectorSource({ features }),
          zIndex: 10,
        }),
      );
    }

    const map = new Map({
      layers,
      target: mapRef.current,
      view: new View({
        center: mapCenter,
        zoom: mapZoom,
      }),
      controls: defaultControls({ attribution: true }),
    });

    if (activeRow?.extent3857) {
      map.getView().fit(activeRow.extent3857, {
        padding: [80, 80, 80, 80],
        maxZoom: 19,
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [
    activeRowKey,
    highlightRows,
    loading,
    mapCenter,
    mapZoom,
    mapProvider,
    showCadastral,
  ]);

  const handleBack = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setTarget(undefined);
      mapInstanceRef.current = null;
    }
    onBack();
  }, [onBack]);

  const handleTagClick = useCallback((row) => {
    setActiveRowKey(row.key);

    if (mapInstanceRef.current && row.extent3857) {
      mapInstanceRef.current.getView().fit(row.extent3857, {
        padding: [80, 80, 80, 80],
        maxZoom: 19,
        duration: 300,
      });
    }
  }, []);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          zIndex: 10,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
          size="small"
        >
          Indietro
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
          Evidenzia Mappali
        </Typography>

        <ToggleButtonGroup
          size="small"
          value={mapProvider}
          exclusive
          onChange={(_, value) => value && setMapProvider(value)}
        >
          <ToggleButton value="osm">OSM</ToggleButton>
          <ToggleButton value="satellite">Satellite</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButton
          size="small"
          value="cadastral"
          selected={showCadastral}
          onChange={() => setShowCadastral((prev) => !prev)}
          sx={{ textTransform: "none" }}
        >
          {showCadastral ? "Catasto ON" : "Catasto OFF"}
        </ToggleButton>
      </Paper>

      {loading && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Apertura mappa catastale e ricerca overlay mappali...
          </Typography>
        </Box>
      )}

      {!loading && (
        <Box ref={mapRef} id="evidenzia-mappa" sx={{ flex: 1, minHeight: 0 }} />
      )}

      {!loading && (
        <Alert severity="info" sx={{ mx: 2, mt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Il layer WMS catastale mostra i dati reali disponibili.
          </Typography>
          <Typography variant="caption">
            Comune centrato: <strong>{getComuneLabel(mappaliRows)}</strong>.
            Attiva <strong>"Catasto ON"</strong> per vedere le particelle reali
            sulla mappa di sfondo tramite WMS.
          </Typography>
        </Alert>
      )}

      {!loading && geocodeError && (
        <Alert severity="warning" sx={{ mx: 2, mt: 1 }}>
          {geocodeError}
        </Alert>
      )}

      {!loading && highlightRows.length === 0 && (
        <Alert severity="warning" sx={{ mx: 2, mt: 1 }}>
          Non sono riuscito a ricavare un overlay preciso per i mappali
          richiesti. La mappa resta centrata sul comune con il layer catastale
          attivo.
        </Alert>
      )}

      {!loading && mappaliRows?.length > 0 && (
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            maxHeight: 100,
            overflow: "auto",
          }}
        >
          {mappaliRows.map((row, idx) => {
            const key = buildRowKey(row);
            const isActive = key === activeRowKey;

            return (
              <Chip
                key={`${key}-${idx}`}
                label={`${row.comune} - F${row.foglio} - M${row.mappale}`}
                size="small"
                color={isActive ? "primary" : "default"}
                variant={isActive ? "filled" : "outlined"}
                onClick={() => {
                  const match = highlightRows.find((item) => item.key === key);
                  if (match) {
                    handleTagClick(match);
                  }
                }}
              />
            );
          })}
        </Paper>
      )}
    </Box>
  );
};

export default EvidenziaMappaliScreen;
