import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Map from "ol/Map.js";
import View from "ol/View.js";
import ImageLayer from "ol/layer/Image";
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
import { getEnabledCadastralLayers } from "../../config/cadastralLayers";
import { getEnabledMapProviders } from "../../config/mapProviders";
import { getCampaignTerrainCrops, getPoligonoMappale, importCadastralRows } from "../../services/catastoService";

const DEFAULT_CENTER = [9.3, 45.08];
function getComuneLabel(rows) {
  const comuni = [
    ...new Set((rows || []).map((row) => row.comune).filter(Boolean)),
  ];
  if (comuni.length === 0) return "";
  if (comuni.length === 1) return comuni[0];
  return `${comuni[0]} + ${comuni.length - 1} altri comuni`;
}

function buildRowKey(row) {
  return row.parcelKey || `${row.comune}|${row.provincia || ""}|${row.foglio}|${row.mappale}`;
}

const normalizeName = (value = "") => value.trim().replace(/\s+/g, " ").toLowerCase();
const getCropName = (row) => (row.crop || row.utilizzo || "Terreno").split(" - ")[0].trim();
const GROUP_COLORS = ["#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#be123c"];
function colorForGroup(value = "") {
  const hash = [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
  return GROUP_COLORS[hash % GROUP_COLORS.length];
}

async function resolveRowHighlight(row) {
  try {
    const data = await getPoligonoMappale(row);
    const coords4326 = data?.polygon4326;
    const bbox4326 = data?.bbox4326;
    if (!coords4326 || !bbox4326) return null;

    const polygon3857 = coords4326.map(([lon, lat]) => fromLonLat([lon, lat]));
    const extent3857 = [
      fromLonLat([bbox4326[0], bbox4326[1]])[0],
      fromLonLat([bbox4326[0], bbox4326[1]])[1],
      fromLonLat([bbox4326[2], bbox4326[3]])[0],
      fromLonLat([bbox4326[2], bbox4326[3]])[1],
    ];

    return {
      ...row,
      key: buildRowKey(row),
      polygon3857,
      polygon4326: coords4326,
      extent3857,
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

const EvidenziaMappaliScreen = ({ importData, farmlands = [], onImported, onBack }) => {
  const mappaliRows = importData?.rows || [];
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const enabledMapProviders = getEnabledMapProviders();
  const enabledCadastralLayers = getEnabledCadastralLayers();
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState(fromLonLat(DEFAULT_CENTER));
  const [mapZoom, setMapZoom] = useState(15);
  const [geocodeError, setGeocodeError] = useState("");
  const [highlightRows, setHighlightRows] = useState([]);
  const [activeRowKey, setActiveRowKey] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);
  const [newFarmlandName, setNewFarmlandName] = useState("");
  const [sessionFarmlandNames, setSessionFarmlandNames] = useState([]);
  const [campaignTerrainCrops, setCampaignTerrainCrops] = useState({});
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [mapProvider, setMapProvider] = useState(
    enabledMapProviders[0]?.key || "osm",
  );
  const [cadastralLayerKey, setCadastralLayerKey] = useState(
    enabledCadastralLayers[0]?.key || "none",
  );

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
      }

      const uniqueRows = [
        ...new globalThis.Map(
          mappaliRows.map((row) => [buildRowKey(row), row]),
        ).values(),
      ];
      const resolvedHighlights = (
        await Promise.all(
          uniqueRows.map((row) =>
            resolveRowHighlight(row).catch(() => null),
          ),
        )
      ).filter(Boolean);

      setHighlightRows(resolvedHighlights);
      setAssignments({});
      if (resolvedHighlights.length > 0) {
        setActiveRowKey(resolvedHighlights[0].key);
      }
      setLoading(false);
    };

    fetchComuneCenter();
  }, [farmlands, importData, mappaliRows, navigate]);

  useEffect(() => {
    if (loading || !mapRef.current) return;

    const provider =
      enabledMapProviders.find((item) => item.key === mapProvider) ||
      enabledMapProviders[0];

    const baseLayer = new TileLayer({
      visible: true,
      preload: Infinity,
      source: provider?.url
        ? new XYZ({
            url: provider.url,
            attributions: provider.attribution,
            crossOrigin: "anonymous",
          })
        : new OSM({ attributions: provider?.attribution }),
    });

    const layers = [baseLayer];

    const activeRow = highlightRows.find((row) => row.key === activeRowKey);
    const cadastralLayer = enabledCadastralLayers.find(
      (item) => item.key === cadastralLayerKey,
    );

    if (activeRow && cadastralLayer) {
      layers.push(
        new ImageLayer({
          opacity: 0.85,
          source: new ImageWMS({
            url: cadastralLayer.url,
            projection: cadastralLayer.sourceProjection,
            params: {
              LAYERS: cadastralLayer.layers,
              VERSION: cadastralLayer.version,
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

    const features = highlightRows.map((row) => {
      const parcelAssignments = mappaliRows
        .filter((item) => item.parcelKey === row.key)
        .flatMap((item) => assignments[item.rowKey] || [])
        .filter(Boolean);
      const groupToken = parcelAssignments[0]?.type === "existing"
        ? parcelAssignments[0].farmlandId
        : parcelAssignments[0]?.name;
      const color = groupToken ? colorForGroup(groupToken) : "#d62828";
      const assignedNames = [...new Set(parcelAssignments.map((assignment) =>
        assignment.type === "existing"
          ? companyFarmlands.find((item) => item.id === assignment.farmlandId)?.name || "Terreno"
          : assignment.name,
      ).filter(Boolean))];
      const feature = new Feature({
        geometry: new Polygon([row.polygon3857]),
      });

      feature.setId(row.key);
      feature.set("rowKey", row.key);
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
            text: `${row.foglio}/${row.mappale}${assignedNames.length ? `\n${assignedNames.join(", ")}` : ""}`,
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
    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (item) => item);
      const row = highlightRows.find((item) => item.key === feature?.get("rowKey"));
      if (row) {
        setSelectedRow(row);
        setActiveRowKey(row.key);
        setNewFarmlandName("");
      }
    });

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [
    activeRowKey,
    assignments,
    cadastralLayerKey,
    enabledCadastralLayers,
    enabledMapProviders,
    highlightRows,
    loading,
    mapCenter,
    mapProvider,
    mapZoom,
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

  const companyFarmlands = farmlands.filter(
    (item) => item.company_id === importData?.companyId ||
      item.ownerDisplayName?.trim().toLowerCase() === importData?.company?.name?.trim().toLowerCase(),
  );

  useEffect(() => {
    getCampaignTerrainCrops(importData.companyId, importData.campaignYear)
      .then(setCampaignTerrainCrops)
      .catch(() => setCampaignTerrainCrops({}));
  }, [importData.companyId, importData.campaignYear]);
  const missingGeometryCount = new Set(mappaliRows.map(buildRowKey)).size - highlightRows.length;

  const virtualFarmlandNames = [...new Set([
    ...sessionFarmlandNames,
    ...Object.values(assignments).flat()
      .filter((allocation) => allocation?.type === "new")
      .map((allocation) => allocation.name),
  ])].sort((left, right) => left.localeCompare(right));

  const getAssignmentName = (assignment) => assignment?.type === "existing"
    ? companyFarmlands.find((item) => item.id === assignment.farmlandId)?.name || "Terreno esistente"
    : assignment?.name || "";

  const terrainSummaries = Object.values(
    mappaliRows.reduce((summary, row) => {
      (assignments[row.rowKey] || []).forEach((allocation) => {
        const key = allocation.type === "existing"
          ? `existing:${allocation.farmlandId}`
          : `new:${normalizeName(allocation.name)}`;
        summary[key] ||= {
          key,
          name: getAssignmentName(allocation),
          parcels: new Set(),
          crops: new Set(),
          rows: 0,
          sau: 0,
        };
        summary[key].parcels.add(row.parcelKey);
        summary[key].crops.add(row.ageaCode || row.crop);
        summary[key].rows += 1;
        summary[key].sau += Number(allocation.area) || 0;
      });
      return summary;
    }, {}),
  );
  const selectedParcelRows = selectedRow
    ? mappaliRows.filter((row) => row.parcelKey === selectedRow.key)
    : [];

  const getAllocationKey = (allocation) => allocation.type === "existing"
    ? `existing:${allocation.farmlandId}`
    : `new:${normalizeName(allocation.name)}`;

  const addAllocation = (row, value) => {
    if (!value) return;
    const separatorIndex = value.indexOf(":");
    const type = value.slice(0, separatorIndex);
    const identifier = value.slice(separatorIndex + 1);
    const allocation = type === "existing"
      ? { type: "existing", farmlandId: identifier }
      : { type: "new", name: identifier };
    setAssignments((prev) => ({
      ...prev,
      [row.rowKey]: (prev[row.rowKey] || []).some(
        (item) => getAllocationKey(item) === getAllocationKey(allocation),
      ) ? prev[row.rowKey] : [
        ...(prev[row.rowKey] || []),
        {
          ...allocation,
          area: Math.max(
            0,
            Number(row.superficie) - (prev[row.rowKey] || []).reduce(
              (total, item) => total + (Number(item.area) || 0),
              0,
            ),
          ),
        },
      ],
    }));
  };

  const updateAllocationArea = (rowKey, allocationIndex, area) => {
    setAssignments((prev) => ({
      ...prev,
      [rowKey]: (prev[rowKey] || []).map((item, index) =>
        index === allocationIndex ? { ...item, area } : item,
      ),
    }));
  };

  const removeAllocation = (rowKey, allocationIndex) => {
    setAssignments((prev) => ({
      ...prev,
      [rowKey]: (prev[rowKey] || []).filter((_item, index) => index !== allocationIndex),
    }));
  };

  const invalidAllocationRows = mappaliRows.filter((row) => {
    const allocations = assignments[row.rowKey] || [];
    const total = allocations.reduce((sum, item) => sum + (Number(item.area) || 0), 0);
    return allocations.length === 0 || Math.abs(total - Number(row.superficie)) > 0.0001;
  });
  const cropByTerrain = {};
  let hasCropConflict = false;
  mappaliRows.forEach((row) => {
    (assignments[row.rowKey] || []).forEach((allocation) => {
      const key = getAllocationKey(allocation);
      const cropKey = row.ageaCode || normalizeName(row.crop);
      if (cropByTerrain[key] && cropByTerrain[key] !== cropKey) hasCropConflict = true;
      cropByTerrain[key] = cropKey;
      if (allocation.type === "existing") {
        const registered = campaignTerrainCrops[allocation.farmlandId];
        if (registered && (registered.ageaCode || normalizeName(registered.crop)) !== cropKey) {
          hasCropConflict = true;
        }
      }
    });
  });
  const unresolvedCount = invalidAllocationRows.length;
  const canImport = !loading && highlightRows.length > 0 && unresolvedCount === 0 && !hasCropConflict && missingGeometryCount === 0 && !importing;

  const isTerrainCompatible = (row, type, identifier) => {
    const key = type === "existing"
      ? `existing:${identifier}`
      : `new:${normalizeName(identifier)}`;
    const cropKey = row.ageaCode || normalizeName(row.crop);
    if (cropByTerrain[key] && cropByTerrain[key] !== cropKey) return false;
    if (type === "existing") {
      const registered = campaignTerrainCrops[identifier];
      if (registered && (registered.ageaCode || normalizeName(registered.crop)) !== cropKey) return false;
    }
    return true;
  };

  const addSessionFarmland = () => {
    const name = newFarmlandName.trim();
    if (!name) return;
    const existing = companyFarmlands.find(
      (farmland) => normalizeName(farmland.name) === normalizeName(name),
    );
    if (!existing && !virtualFarmlandNames.some((item) => normalizeName(item) === normalizeName(name))) {
      setSessionFarmlandNames((prev) => [...prev, name]);
    }
    setNewFarmlandName("");
  };

  const handleImport = async () => {
    setImporting(true);
    setImportError("");
    setImportSuccess("");
    try {
      const geometryByKey = Object.fromEntries(
        highlightRows.map((row) => [row.key, row.polygon4326]),
      );
      const result = await importCadastralRows({
        companyId: importData.companyId,
        campaignYear: importData.campaignYear,
        rows: mappaliRows.map((row) => ({
          ...row,
          allocations: assignments[row.rowKey] || [],
          polygon: geometryByKey[buildRowKey(row)],
        })),
      });
      setImportSuccess(`Importazione completata: ${result?.farmlands || 0} terreni, ${result?.crops || mappaliRows.length} colture.`);
      await onImported?.();
    } catch (error) {
      setImportError(error.message || "Importazione non riuscita.");
    } finally {
      setImporting(false);
    }
  };

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
          Evidenzia Mappali — {importData?.company?.name} ({importData?.campaignYear})
        </Typography>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="evidenzia-provider-label">Base map</InputLabel>
          <Select
            labelId="evidenzia-provider-label"
            value={mapProvider}
            label="Base map"
            onChange={(event) => setMapProvider(event.target.value)}
          >
            {enabledMapProviders.map((provider) => (
              <MenuItem key={provider.key} value={provider.key}>
                {provider.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="evidenzia-cadastral-label">Layer mappali</InputLabel>
          <Select
            labelId="evidenzia-cadastral-label"
            value={cadastralLayerKey}
            label="Layer mappali"
            onChange={(event) => setCadastralLayerKey(event.target.value)}
          >
            <MenuItem value="none">Nessuno</MenuItem>
            {enabledCadastralLayers.map((layer) => (
              <MenuItem key={layer.key} value={layer.key}>
                {layer.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" disabled={!canImport} onClick={handleImport}>
          {importing ? "Importazione..." : "Importa mappali"}
        </Button>
      </Paper>

      {importError && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{importError}</Alert>}
      {importSuccess && <Alert severity="success" sx={{ mx: 2, mt: 1 }}>{importSuccess}</Alert>}

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
            Seleziona un <strong>Layer mappali</strong> per vedere le
            particelle reali sulla mappa di sfondo tramite WMS.
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

      {!loading && (unresolvedCount > 0 || missingGeometryCount > 0) && (
        <Alert severity="warning" sx={{ mx: 2, mt: 1 }}>
          Da assegnare: {unresolvedCount}. Senza geometria: {missingGeometryCount}.
          Clicca i poligoni rossi e scegli un terreno o un nuovo nome.
        </Alert>
      )}
      {!loading && hasCropConflict && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }}>
          Un terreno non può avere colture diverse nella stessa campagna. Correggi le assegnazioni evidenziate.
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
          {highlightRows.map((row) => {
            const key = row.key;
            const isActive = key === activeRowKey;
            const terrainNames = [...new Set(
              mappaliRows
                .filter((item) => item.parcelKey === key)
                .flatMap((item) => (assignments[item.rowKey] || []).map(getAssignmentName))
                .filter(Boolean),
            )];

            return (
              <Chip
                key={key}
                label={`${row.comune} - F${row.foglio} - M${row.mappale}${terrainNames.length ? ` — ${terrainNames.join(", ")}` : ""}`}
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

      {!loading && terrainSummaries.length > 0 && (
        <Paper elevation={1} sx={{ p: 1.5, display: "flex", flexWrap: "wrap", gap: 1 }}>
          {terrainSummaries.map((item) => (
            <Chip
              key={item.key}
              sx={{ borderColor: colorForGroup(item.key) }}
              variant="outlined"
              label={`${item.name}: ${item.parcels.size} particelle, ${item.crops.size} colture, ${item.sau.toFixed(4)} ha`}
            />
          ))}
        </Paper>
      )}

      <Drawer anchor="right" open={Boolean(selectedRow)} onClose={() => setSelectedRow(null)} PaperProps={{ sx: { width: { xs: "100%", sm: 420 }, p: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Assegna mappale</Typography>
        <Typography sx={{ mb: 2 }}>{selectedRow?.comune} — Foglio {selectedRow?.foglio}, Mappale {selectedRow?.mappale}</Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Il CSV non contiene i confini interni delle colture: il mappale sarà salvato come copertura catastale, non come confine agronomico.
        </Alert>
        <Stack spacing={2}>
          {selectedParcelRows.map((row) => {
            const allocations = assignments[row.rowKey] || [];
            const allocatedTotal = allocations.reduce(
              (total, item) => total + (Number(item.area) || 0),
              0,
            );
            const allocationValid = Math.abs(allocatedTotal - Number(row.superficie)) <= 0.0001;
            return (
              <Paper key={row.rowKey} variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700 }}>{getCropName(row)}</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {row.ageaCode || "Senza codice AGEA"} — {row.superficie} ha
                </Typography>
                <Stack spacing={1} sx={{ mb: 1 }}>
                  {allocations.map((allocation, allocationIndex) => (
                    <Stack key={`${getAllocationKey(allocation)}-${allocationIndex}`} direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ flex: 1 }}>{getAssignmentName(allocation)}</Typography>
                      <TextField
                        size="small"
                        type="number"
                        label="Ettari"
                        value={allocation.area}
                        inputProps={{ min: 0, step: "0.0001" }}
                        onChange={(e) => updateAllocationArea(row.rowKey, allocationIndex, e.target.value)}
                        sx={{ width: 120 }}
                      />
                      <Button color="error" size="small" onClick={() => removeAllocation(row.rowKey, allocationIndex)}>Rimuovi</Button>
                    </Stack>
                  ))}
                </Stack>
                <FormControl fullWidth size="small" error={!allocationValid}>
                  <InputLabel id={`terrain-${row.lineNumber}`}>Aggiungi terreno</InputLabel>
                  <Select labelId={`terrain-${row.lineNumber}`} label="Aggiungi terreno" value="" onChange={(e) => addAllocation(row, e.target.value)}>
                    <MenuItem disabled>Terreni esistenti</MenuItem>
                    {companyFarmlands.map((farmland) => <MenuItem disabled={!isTerrainCompatible(row, "existing", farmland.id)} key={`existing:${farmland.id}`} value={`existing:${farmland.id}`}>{farmland.name || farmland.type || "Terreno"}</MenuItem>)}
                    <MenuItem disabled>Terreni da creare</MenuItem>
                    {virtualFarmlandNames.map((name) => <MenuItem disabled={!isTerrainCompatible(row, "new", name)} key={`new:${name}`} value={`new:${name}`}>{name}</MenuItem>)}
                  </Select>
                </FormControl>
                <Typography variant="caption" color={allocationValid ? "success.main" : "error.main"}>
                  Assegnati {allocatedTotal.toFixed(4)} di {Number(row.superficie).toFixed(4)} ha
                </Typography>
              </Paper>
            );
          })}
        </Stack>
        <Divider sx={{ my: 2 }}>oppure</Divider>
        <Stack spacing={2}>
          <TextField label="Nome nuovo terreno" value={newFarmlandName} onChange={(e) => setNewFarmlandName(e.target.value)} helperText="Usa lo stesso nome per raggruppare più mappali." />
          <Button variant="outlined" disabled={!newFarmlandName.trim()} onClick={addSessionFarmland}>Aggiungi terreno alla selezione</Button>
        </Stack>
      </Drawer>
    </Box>
  );
};

export default EvidenziaMappaliScreen;
