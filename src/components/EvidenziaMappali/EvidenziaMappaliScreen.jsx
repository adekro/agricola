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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InfoIcon from "@mui/icons-material/Info";
import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import { Vector as VectorLayer } from "ol/layer.js";
import { Vector as VectorSource } from "ol/source.js";
import { fromLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control.js";
import OSM from "ol/source/OSM";
import { Feature } from "ol";
import { Polygon, MultiPolygon } from "ol/geom";
import { Stroke, Fill, Style, Text as OlText } from "ol/style";
import { getPoligonoMappale } from "../../services/catastoService";

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
  "#FF5733",
  "#B533FF",
  "#33FF57",
];

const EvidenziaMappaliScreen = ({ mappaliRows, onBack }) => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

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
            comune: row.comune,
            foglio: row.foglio,
            mappale: row.mappale,
          });
          fetched.push({ ...data, index: i });
        } catch (err) {
          errs.push({
            index: i,
            comune: row.comune,
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

  // Build map when results are ready
  useEffect(() => {
    if (loading || !mapRef.current) return;
    if (results.length === 0) return;

    const features = [];
    const allCoords = [];

    results.forEach((result, idx) => {
      if (!result.geometry) return;

      let geom;
      if (result.geometry.type === "Polygon") {
        const coords = result.geometry.coordinates[0].map((c) =>
          fromLonLat([c[0], c[1]]),
        );
        geom = new Polygon([coords]);
        allCoords.push(...coords);
      } else if (result.geometry.type === "MultiPolygon") {
        const polygonCoords = result.geometry.coordinates.map((poly) =>
          poly[0].map((c) => fromLonLat([c[0], c[1]])),
        );
        geom = new MultiPolygon(polygonCoords.map((coords) => [coords]));
        polygonCoords.forEach((coords) => allCoords.push(...coords));
      }

      if (geom) {
        const color = COLORS[idx % COLORS.length];
        const feature = new Feature({ geometry: geom });
        feature.setStyle(
          new Style({
            fill: new Fill({ color: `${color}33` }),
            stroke: new Stroke({ color: color, width: 3 }),
            text: new OlText({
              text: `${result.foglio}/${result.mappale}`,
              font: "bold 12px sans-serif",
              fill: new Fill({ color: "#000" }),
              stroke: new Stroke({ color: "#fff", width: 3 }),
              offsetY: -15,
            }),
          }),
        );
        feature.set("label", `${result.foglio}/${result.mappale}`);
        features.push(feature);
      }
    });

    const baseLayer = new TileLayer({
      visible: true,
      preload: Infinity,
      source: new OSM(),
    });

    const vectorLayer = new VectorLayer({
      source: new VectorSource({ features }),
    });

    const map = new Map({
      layers: [baseLayer, vectorLayer],
      target: mapRef.current,
      view: new View({
        center:
          allCoords.length > 0
            ? allCoords[0]
            : fromLonLat([9.0953328, 45.4628246]),
        zoom: 15,
      }),
      controls: defaultControls({ attribution: true }),
    });

    // Fit view to all features
    if (features.length > 0) {
      const extent = vectorLayer.getSource().getExtent();
      map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 18 });
    }

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [loading, results]);

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
        {!loading && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              icon={<InfoIcon />}
              label={`${results.length} trovati`}
              color="success"
              size="small"
            />
            {errors.length > 0 && (
              <Chip
                label={`${errors.length} errori`}
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
            Caricamento mappali... ({progress.current}/{progress.total})
          </Typography>
        </Box>
      )}

      {/* Errors */}
      {!loading && errors.length > 0 && (
        <Alert severity="warning" sx={{ m: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            {errors.length} mappale/i non trovato/i:
          </Typography>
          {errors.map((err, i) => (
            <Typography key={i} variant="caption" display="block">
              {err.comune || "?"} - Foglio {err.foglio} - Mappale {err.mappale}:{" "}
              {err.message}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Map */}
      {!loading && results.length > 0 && (
        <Box ref={mapRef} id="evidenzia-mappa" sx={{ flex: 1, minHeight: 0 }} />
      )}

      {!loading && results.length === 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <Typography variant="h6" color="text.secondary">
            Nessun mappale trovato. Verifica i dati inseriti.
          </Typography>
        </Box>
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
                backgroundColor: `${COLORS[idx % COLORS.length]}22`,
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
