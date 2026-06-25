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

async function resolveRowHighlight(row) {
  try {
    const response = await fetch(
      `/api/catasto-gml?comune=${encodeURIComponent(row.comune)}&foglio=${encodeURIComponent(row.foglio)}&mappale=${encodeURIComponent(row.mappale)}`,
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data?.geometry || !data.geometry.coordinates?.[0]) {
      return null;
    }

    // Convert GeoJSON coordinates (EPSG:4326) to map projection (EPSG:3857)
    const coords4326 = data.geometry.coordinates[0];
    const polygon3857 = coords4326.map(([lon, lat]) => fromLonLat([lon, lat]));

    // Compute extent in 3857
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    polygon3857.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    return {
      ...row,
      key: buildRowKey(row),
      polygon3857,
      extent3857: [minX, minY, maxX, maxY],
      source: data.source,
      validated: data.validated,
    };
  } catch {
    return null;
  }
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

          if (
            Array.isArray(data.boundingbox) &&
            data.boundingbox.length === 4
          ) {
            const comuneBbox = [
              data.boundingbox[2],
              data.boundingbox[0],
              data.boundingbox[3],
              data.boundingbox[1],
            ];

            const resolvedHighlights = (
              await Promise.all(
                mappaliRows.map((row) =>
                  resolveRowHighlight(row).catch(() => null),
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
      MAP_PROVIDERS.find((item) => item.key === mapProvider) ||
      MAP_PROVIDERS[0];

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
              CQL_FILTER: `LABEL='${String(activeRow.mappale).replace(/'/g, "''")}'`,
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
  }, [activeRowKey, highlightRows, loading, mapCenter, mapZoom, mapProvider]);

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
