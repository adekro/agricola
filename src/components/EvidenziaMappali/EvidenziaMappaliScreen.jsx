import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  CircularProgress,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InfoIcon from "@mui/icons-material/Info";
import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile";
import { Vector as VectorLayer } from "ol/layer.js";
import { Vector as VectorSource } from "ol/source.js";
import { fromLonLat, get as getProjection } from "ol/proj";
import { defaults as defaultControls } from "ol/control.js";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { register } from "ol/proj/proj4";
import proj4 from "proj4";
import { Feature } from "ol";
import { Polygon, MultiPolygon } from "ol/geom";
import { Stroke, Fill, Style, Text as OlText } from "ol/style";
import { getPoligonoMappale } from "../../services/catastoService";
import { MAP_PROVIDERS } from "../../config/mapProviders";
import { createCadastralSource } from "../../lib/cadastralWms";
import { CADASTRAL_LAYERS } from "../../config/cadastralLayers";

// Register EPSG:6706 projection for OpenLayers
proj4.defs("EPSG:6706", "+proj=longlat +ellps=GRS80 +no_defs +type=crs");
register(proj4);
const cadastralProjection = getProjection("EPSG:6706");
if (cadastralProjection) {
  cadastralProjection.setExtent([5.93, 34.76, 18.99, 47.1]);
}

const COLORS = [
  "#FF5733",
  "#33B5FF",
  "#75FF33",
  "#FF33F5",
  "#FFD733",
  "#33FFD7",
  "#8B33FF",
  "#FF8333",
  "#33FF8B",
  "#FF3383",
  "#D733FF",
  "#33D7FF",
  "#B533FF",
  "#33FF57",
];

/**
 * Try multiple WMS CQL_FILTER patterns to highlight a specific parcel.
 * Each pattern returns a CQL filter for WMS GetMap.
 */
function buildWmsCqlPatterns(foglio, mappale) {
  const f = String(foglio).replace(/^0+/, "");
  const m = String(mappale).replace(/^0+/, "");
  const patterns = [];

  // Pattern 1: foglio+mappale concatenati (es. 5166)
  patterns.push(`LABEL LIKE '%25${f}${m}%25'`);

  // Pattern 2: foglio . mappale (es. 5.166 o 5/166)
  patterns.push(`LABEL LIKE '%25${f}.${m}%25'`);

  // Pattern 3: mappale da solo (se è un numero piccolo)
  if (m.length <= 4) {
    patterns.push(`LABEL LIKE '%25${m.padStart(4, "0")}%25'`);
    patterns.push(`LABEL LIKE '%25${m.padStart(3, "0")}%25'`);
  }

  return patterns;
}

const EvidenziaMappaliScreen = ({ mappaliRows, onBack }) => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const highlightLayerRef = useRef(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [mapProvider, setMapProvider] = useState("osm");
  const [showCadastral, setShowCadastral] = useState(true);

  // Attempt to fetch each parcel from WFS
  useEffect(() => {
    if (!mappaliRows || mappaliRows.length === 0) {
      navigate("/");
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      const fetched = [];
      const errs = [];
      const total = mappaliRows.length;

      for (let i = 0; i < total; i++) {
        const row = mappaliRows[i];
        setProgress({ current: i + 1, total });
        try {
          const data = await getPoligonoMappale({
            foglio: row.foglio,
            mappale: row.mappale,
          });
          fetched.push({
            ...data,
            foglio: row.foglio,
            mappale: row.mappale,
            index: i,
          });
        } catch (err) {
          errs.push({
            index: i,
            foglio: row.foglio,
            mappale: row.mappale,
            message: err.message,
          });
        }
      }

      setResults(fetched);
      setErrors(errs);
      setLoading(false);
    };

    fetchAll();
  }, [mappaliRows, navigate]);

  // Build the map when results are ready
  useEffect(() => {
    if (loading || !mapRef.current) return;

    // Base map layer
    const provider =
      MAP_PROVIDERS.find((p) => p.key === mapProvider) || MAP_PROVIDERS[0];
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

    // Cadastral WMS background layer
    let cadastralLayer = null;
    if (showCadastral) {
      const cadastralConfig = CADASTRAL_LAYERS.find(
        (l) => l.key === "agenziaEntrateParcel",
      );
      if (cadastralConfig) {
        cadastralLayer = new TileLayer({
          visible: true,
          opacity: 0.6,
          source: createCadastralSource(cadastralConfig),
        });
        layers.push(cadastralLayer);
      }
    }

    // Vector features for parcels found via WFS
    const features = [];
    const allCoords = [];

    results.forEach((result, idx) => {
      if (!result.geometry) return;

      let geom;
      try {
        if (result.geometry.type === "Polygon") {
          const coords = (result.geometry.coordinates[0] || []).map((c) =>
            fromLonLat([c[0], c[1]]),
          );
          geom = new Polygon([coords]);
          allCoords.push(...coords);
        } else if (result.geometry.type === "MultiPolygon") {
          const polygonCoords = (result.geometry.coordinates || []).map(
            (poly) => (poly[0] || []).map((c) => fromLonLat([c[0], c[1]])),
          );
          if (polygonCoords.length > 0) {
            geom = new MultiPolygon(polygonCoords.map((coords) => [coords]));
            polygonCoords.forEach((coords) => allCoords.push(...coords));
          }
        }
      } catch (e) {
        console.error(
          "Error parsing geometry for",
          result.foglio,
          result.mappale,
          e,
        );
      }

      if (geom) {
        const color = COLORS[idx % COLORS.length];
        const feature = new Feature({ geometry: geom });
        feature.setStyle(
          new Style({
            fill: new Fill({ color: `${color}44` }),
            stroke: new Stroke({ color, width: 3 }),
            text: new OlText({
              text: `${result.foglio}/${result.mappale}`,
              font: "bold 13px Arial",
              fill: new Fill({ color: "#000" }),
              stroke: new Stroke({ color: "#fff", width: 4 }),
              offsetY: -18,
            }),
          }),
        );
        features.push(feature);
      }
    });

    const vectorSource = new VectorSource({ features });
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 10,
    });

    if (features.length > 0) {
      layers.push(vectorLayer);
    }

    const map = new Map({
      layers,
      target: mapRef.current,
      view: new View({
        center: allCoords.length > 0 ? allCoords[0] : fromLonLat([9.2, 45.1]),
        zoom: 15,
      }),
      controls: defaultControls({ attribution: true }),
    });

    // Fit to features if any
    if (features.length > 0) {
      const extent = vectorSource.getExtent();
      map.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 18 });
    }

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [loading, results, mapProvider, showCadastral]);

  const handleBack = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setTarget(undefined);
      mapInstanceRef.current = null;
    }
    onBack();
  }, [onBack]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
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
          onChange={(_, v) => v && setMapProvider(v)}
        >
          <ToggleButton value="osm">OSM</ToggleButton>
          <ToggleButton value="satellite">Satellite</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButton
          size="small"
          value="cadastral"
          selected={showCadastral}
          onChange={() => setShowCadastral((p) => !p)}
          sx={{ textTransform: "none" }}
        >
          {showCadastral ? "Catasto ON" : "Catasto OFF"}
        </ToggleButton>

        {!loading && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip
              icon={<InfoIcon />}
              label={`${results.length} trovati`}
              color={results.length > 0 ? "success" : "default"}
              size="small"
            />
            {errors.length > 0 && (
              <Chip
                label={`${errors.length} non trovati`}
                color="error"
                size="small"
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Loading progress */}
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
            Ricerca mappali... ({progress.current}/{progress.total})
          </Typography>
        </Box>
      )}

      {/* Map */}
      {!loading && (
        <Box ref={mapRef} id="evidenzia-mappa" sx={{ flex: 1, minHeight: 0 }} />
      )}

      {/* Errors */}
      {!loading && errors.length > 0 && (
        <Alert severity="warning" sx={{ mx: 2, mt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {errors.length} mappale/i non trovato/i (il WFS catastale ha dati
            limitati):
          </Typography>
          <Typography variant="caption">
            Attiva il layer "Catasto ON" sopra per vedere tutte le particelle
            sulla mappa di sfondo.
          </Typography>
          {errors.slice(0, 5).map((err, i) => (
            <Typography key={i} variant="caption" display="block">
              Foglio {err.foglio} - Mappale {err.mappale}: {err.message}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Legend */}
      {!loading && results.length > 0 && (
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
          {results.map((r, idx) => (
            <Chip
              key={idx}
              label={`${r.foglio}/${r.mappale}`}
              size="small"
              sx={{
                bgcolor: `${COLORS[idx % COLORS.length]}22`,
                borderColor: COLORS[idx % COLORS.length],
                border: `2px solid ${COLORS[idx % COLORS.length]}`,
                fontWeight: 600,
              }}
            />
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default EvidenziaMappaliScreen;
