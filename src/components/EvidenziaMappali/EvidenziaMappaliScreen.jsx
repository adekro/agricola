import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Typography,
  Box,
  Alert,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile";
import { fromLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control.js";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { get as getProjection } from "ol/proj";
import { register } from "ol/proj/proj4";
import proj4 from "proj4";
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

const EvidenziaMappaliScreen = ({ mappaliRows, onBack }) => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [mapProvider, setMapProvider] = useState("osm");
  const [showCadastral, setShowCadastral] = useState(true);

  useEffect(() => {
    if (!mappaliRows || mappaliRows.length === 0) {
      navigate("/");
      return;
    }

    setLoading(false);
  }, [mappaliRows, navigate]);

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

    // Cadastral WMS background layer (REAL DATA)
    let cadastralLayer = null;
    if (showCadastral) {
      const cadastralConfig = CADASTRAL_LAYERS.find(
        (l) => l.key === "agenziaEntrateParcel",
      );
      if (cadastralConfig) {
        cadastralLayer = new TileLayer({
          visible: true,
          opacity: 0.7,
          source: createCadastralSource(cadastralConfig),
        });
        layers.push(cadastralLayer);
      }
    }

    const map = new Map({
      layers,
      target: mapRef.current,
      view: new View({
        center: fromLonLat([9.3, 45.08]),
        zoom: 15,
      }),
      controls: defaultControls({ attribution: true }),
    });

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [loading, mapProvider, showCadastral]);

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
          <Typography variant="body1" color="text.secondary">
            Apertura mappa catastale...
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
            Attiva <strong>"Catasto ON"</strong> per vedere le particelle reali
            sulla mappa di sfondo tramite WMS.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default EvidenziaMappaliScreen;
