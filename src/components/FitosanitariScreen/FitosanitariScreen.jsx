import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const COLUMN_STORAGE_KEY = "fitosanitari-visible-columns";
const PAGE_SIZE = 500;

const columns = [
  { id: "name", label: "Nome Prodotto", minWidth: 150 },
  { id: "activeSubstance", label: "Sostanza Attiva", minWidth: 150 },
  { id: "company", label: "Ragione Sociale", minWidth: 150 },
  { id: "registration", label: "N° Reg.", minWidth: 80 },
  { id: "status", label: "Stato" },
  { id: "registrationDate", label: "Data Reg." },
  { id: "crops", label: "Colture autorizzate", minWidth: 220 },
  { id: "doses", label: "Dose/ha", minWidth: 220 },
  { id: "maxTreatments", label: "Max trattamenti" },
  { id: "intervals", label: "Giorni tra trattamenti", minWidth: 170 },
  { id: "preharvest", label: "Tempo di carenza", minWidth: 150 },
  { id: "copper", label: "Rame (g/kg)" },
  { id: "extractionStatus", label: "Stato estrazione" },
  { id: "label", label: "Etichetta" },
  { id: "addTreatment", label: "Trattamento" },
];

const defaultVisibleColumns = columns.map((column) => column.id);

function loadVisibleColumns() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLUMN_STORAGE_KEY));
    const valid = saved?.filter((id) => columns.some((column) => column.id === id));
    return valid?.length
      ? [...new Set([...valid, "addTreatment"])]
      : defaultVisibleColumns;
  } catch {
    return defaultVisibleColumns;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function formatRange(min, max, unit, suffix = "") {
  if (min == null && max == null) return null;
  const value = min != null && max != null && min !== max ? `${min}-${max}` : min ?? max;
  return `${value}${unit ? ` ${unit}` : ""}${suffix}`;
}

function buildExtractionValues(extraction) {
  const uses = extraction?.phytosanitary_authorized_uses || [];
  return {
    crops: unique(uses.map((use) => use.crop_name)).join(", ") || "-",
    doses:
      unique(
        uses.map((use) => {
          const dose = formatRange(use.dose_min, use.dose_max, use.dose_unit);
          return dose ? `${use.crop_name}: ${dose}` : null;
        }),
      ).join("; ") || "-",
    maxTreatments:
      unique(
        uses.map((use) =>
          use.max_treatments != null ? `${use.crop_name}: ${use.max_treatments}` : null,
        ),
      ).join("; ") || "-",
    intervals:
      unique(
        uses.map((use) => {
          const interval = formatRange(
            use.interval_min_days,
            use.interval_max_days,
            null,
            " giorni",
          );
          return interval ? `${use.crop_name}: ${interval}` : null;
        }),
      ).join("; ") || "-",
    preharvest:
      unique(
        uses.map((use) =>
          use.preharvest_interval_days != null
            ? `${use.crop_name}: ${use.preharvest_interval_days} giorni`
            : null,
        ),
      ).join("; ") || "-",
  };
}

async function loadAllRows(table, select, configureQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (configureQuery) query = configureQuery(query);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

const FitosanitariScreen = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [extractions, setExtractions] = useState({});
  const [filter, setFilter] = useState("");
  const [cropFilter, setCropFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tutti");
  const [extractionStatusFilter, setExtractionStatusFilter] = useState("Tutti");
  const [visibleColumns, setVisibleColumns] = useState(loadVisibleColumns);
  const [loading, setLoading] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productRows, syncResult] = await Promise.all([
        loadAllRows(
          "phytosanitary_products",
          "num_registration,name,company_name,administrative_status,is_active,current_label_id,source_data,last_synced_at",
          (query) =>
            (showRevoked ? query : query.eq("is_active", true)).order("name"),
        ),
        supabase
          .from("phytosanitary_sync_runs")
          .select("dataset_file,status,completed_at,started_at")
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (syncResult.error) throw syncResult.error;
      const labelRows = productRows.length
        ? await loadAllRows(
            "phytosanitary_labels",
            `id,num_registration,ministry_label_id,extraction_status,copper_g_per_kg,
             phytosanitary_authorized_uses(crop_name,dose_min,dose_max,dose_unit,max_treatments,interval_min_days,interval_max_days,preharvest_interval_days)`,
            (query) =>
              query
                .in(
                  "num_registration",
                  productRows.map((product) => product.num_registration),
                )
                .order("extracted_at", { ascending: false }),
          )
        : [];
      const currentLabelIds = new Map(
        productRows.map((product) => [
          product.num_registration,
          String(product.current_label_id || ""),
        ]),
      );
      const extractionMap = {};
      for (const label of labelRows) {
        if (
          String(label.ministry_label_id) === currentLabelIds.get(label.num_registration) &&
          !extractionMap[label.num_registration]
        ) {
          extractionMap[label.num_registration] = label;
        }
      }
      setProducts(productRows);
      setExtractions(extractionMap);
      setLastSync(syncResult.data);
    } catch (loadError) {
      setError(loadError.message || "Impossibile caricare i fitosanitari da Supabase");
    } finally {
      setLoading(false);
    }
  }, [showRevoked]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const statuses = useMemo(
    () => [
      "Tutti",
      ...unique(products.map((product) => product.administrative_status)).sort(),
    ],
    [products],
  );

  const enrichedProducts = useMemo(
    () =>
      products.map((product) => {
        const extraction = extractions[product.num_registration];
        return {
          ...product,
          extraction,
          extractionValues: buildExtractionValues(extraction),
        };
      }),
    [products, extractions],
  );

  const filteredProducts = enrichedProducts.filter((product) => {
    const source = product.source_data || {};
    const extractionText = Object.values(product.extractionValues).join(" ");
    const searchable = [
      product.name,
      product.company_name,
      product.num_registration,
      product.administrative_status,
      source.sostanze_attive,
      extractionText,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesStatus =
      statusFilter === "Tutti" || product.administrative_status === statusFilter;
    const matchesExtractionStatus =
      extractionStatusFilter === "Tutti" ||
      (extractionStatusFilter === "Non estratto"
        ? !product.extraction
        : product.extraction?.extraction_status === extractionStatusFilter);
    return (
      searchable.includes(filter.toLowerCase()) &&
      product.extractionValues.crops.toLowerCase().includes(cropFilter.toLowerCase()) &&
      matchesStatus &&
      matchesExtractionStatus
    );
  });

  const handleColumnChange = (event) => {
    const value = event.target.value;
    setVisibleColumns([...new Set([...(value.length ? value : ["name"]), "addTreatment"])]);
  };

  const renderCell = (columnId, product) => {
    const source = product.source_data || {};
    switch (columnId) {
      case "name":
        return <strong>{product.name || "-"}</strong>;
      case "activeSubstance":
        return source.sostanze_attive || "-";
      case "company":
        return product.company_name || "-";
      case "registration":
        return product.num_registration;
      case "status":
        return (
          <Chip
            label={product.administrative_status || "-"}
            size="small"
            color={product.is_active ? "success" : "default"}
          />
        );
      case "registrationDate":
        return source.data_registrazione || "-";
      case "crops":
      case "doses":
      case "maxTreatments":
      case "intervals":
      case "preharvest":
        return product.extractionValues[columnId];
      case "copper":
        return product.extraction?.copper_g_per_kg ?? "-";
      case "extractionStatus":
        return product.extraction?.extraction_status || "Non estratto";
      case "label":
        return product.is_active ? (
          <Button
            component="a"
            href={`/api/fitosanitari-label?registration=${encodeURIComponent(product.num_registration)}`}
            size="small"
            variant="outlined"
          >
            PDF
          </Button>
        ) : (
          "-"
        );
      case "addTreatment":
        return (
          <Button
            size="small"
            variant="contained"
            onClick={() =>
              navigate("/notebook/operations", {
                state: {
                  initialType: "Trattamento fitosanitario",
                  initialPhytosanitaryRegistration: product.num_registration,
                },
              })
            }
          >
            Aggiungi alla coltura
          </Button>
        );
      default:
        return "-";
    }
  };

  const selectedColumns = columns.filter((column) =>
    visibleColumns.includes(column.id),
  );

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h5">Prodotti Fitosanitari</Typography>
        <Button variant="contained" onClick={loadData} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Ricarica"}
        </Button>
        <Button
          variant="outlined"
          onClick={() => setShowRevoked((current) => !current)}
          disabled={loading}
        >
          {showRevoked ? "Nascondi revocati" : "Mostra revocati"}
        </Button>
        {lastSync && (
          <Chip
            color="info"
            variant="outlined"
            label={`Aggiornato: ${new Date(lastSync.completed_at || lastSync.started_at).toLocaleString("it-IT")} · ${lastSync.dataset_file}`}
          />
        )}
      </Box>

      {error && <Typography color="error">{error}</Typography>}

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          sx={{ flexGrow: 1, minWidth: 220 }}
          placeholder="Cerca prodotti e dati estratti..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <TextField
          sx={{ minWidth: 200 }}
          placeholder="Filtra per coltura..."
          value={cropFilter}
          onChange={(event) => setCropFilter(event.target.value)}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="status-filter-label">Stato</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label="Stato"
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {statuses.map((status) => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 190 }}>
          <InputLabel id="extraction-filter-label">Estrazione</InputLabel>
          <Select
            labelId="extraction-filter-label"
            value={extractionStatusFilter}
            label="Estrazione"
            onChange={(event) => setExtractionStatusFilter(event.target.value)}
          >
            <MenuItem value="Tutti">Tutti</MenuItem>
            <MenuItem value="completed">Completata</MenuItem>
            <MenuItem value="review_required">Da revisionare</MenuItem>
            <MenuItem value="failed">Fallita</MenuItem>
            <MenuItem value="Non estratto">Non estratto</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel id="columns-label">Colonne visibili</InputLabel>
          <Select
            labelId="columns-label"
            multiple
            value={visibleColumns}
            label="Colonne visibili"
            onChange={handleColumnChange}
            renderValue={(selected) => `${selected.length} colonne`}
          >
            {columns.map((column) => (
              <MenuItem key={column.id} value={column.id}>
                <Checkbox checked={visibleColumns.includes(column.id)} />
                <ListItemText primary={column.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Typography variant="body2" color="text.secondary">
        {filteredProducts.length} prodotti trovati
      </Typography>

      <TableContainer component={Paper} sx={{ maxHeight: "70vh", overflowX: "auto" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {selectedColumns.map((column) => (
                <TableCell key={column.id} sx={{ minWidth: column.minWidth }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.slice(0, 100).map((product) => (
              <TableRow key={product.num_registration}>
                {selectedColumns.map((column) => (
                  <TableCell key={column.id}>{renderCell(column.id, product)}</TableCell>
                ))}
              </TableRow>
            ))}
            {!loading && filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={selectedColumns.length} align="center">
                  Nessun dato disponibile
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default FitosanitariScreen;
