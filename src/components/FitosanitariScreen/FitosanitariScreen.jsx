import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Alert,
  Stack,
} from "@mui/material";
import { supabase } from "../../lib/supabaseClient";
import useFarmlands from "../../hooks/useFarmlands";
import { notebookService } from "../../services/notebookService";

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
  const { companies, farmlands } = useFarmlands();
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
  const [quickProduct, setQuickProduct] = useState(null);
  const [quickCrops, setQuickCrops] = useState([]);
  const [quickError, setQuickError] = useState("");
  const [quickAuthorization, setQuickAuthorization] = useState(null);
  const [quickCopper, setQuickCopper] = useState(null);
  const [quickForm, setQuickForm] = useState({
    company_id: "",
    farmland_id: "",
    crop_history_id: "",
    operation_date: new Date().toISOString().slice(0, 16),
    quantity: "",
  });

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
      const registrations = productRows.map((product) => product.num_registration);
      const labelRows = (
        await Promise.all(
          Array.from(
            { length: Math.ceil(registrations.length / 100) },
            (_, index) =>
              loadAllRows(
                "phytosanitary_labels",
                `id,num_registration,ministry_label_id,extraction_status,copper_g_per_kg,
                 phytosanitary_authorized_uses(crop_name,dose_min,dose_max,dose_unit,max_treatments,interval_min_days,interval_max_days,preharvest_interval_days)`,
                (query) =>
                  query
                    .in("num_registration", registrations.slice(index * 100, (index + 1) * 100))
                    .order("extracted_at", { ascending: false }),
              ),
          ),
        )
      ).flat();
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
    if (!quickForm.farmland_id) {
      setQuickCrops([]);
      return;
    }
    notebookService
      .getCropHistory(quickForm.farmland_id)
      .then(setQuickCrops)
      .catch(() => setQuickCrops([]));
  }, [quickForm.farmland_id]);

  useEffect(() => {
    const checkAlerts = async () => {
      const crop = quickCrops.find((item) => item.id === quickForm.crop_history_id);
      const quantity = Number(quickForm.quantity);
      if (!quickProduct || !crop) {
        setQuickAuthorization(null);
        setQuickCopper(null);
        return;
      }
      const cropTerm = (crop.agea_label || crop.crop || "")
        .split(" - ")
        .pop()
        .trim()
        .split(/\s+/)[0];
      const authorized = await notebookService.isPhytosanitaryAuthorizedForCrop(
        { registration: quickProduct.num_registration },
        cropTerm,
      );
      setQuickAuthorization(authorized);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setQuickCopper("Inserisci la quantità in kg per calcolare il rame.");
        return;
      }
      const year = Number(String(quickForm.operation_date).slice(0, 4));
      const sau = await notebookService.getAnnualSau(quickForm.farmland_id, year);
      const surface = sau || Number(crop.area || 0);
      const copper = await notebookService.getPhytosanitaryCopperGPerKg({
        registration: quickProduct.num_registration,
      });
      setQuickCopper(
        copper == null || !surface
          ? "Manca la concentrazione di rame o la SAU per il calcolo."
          : (quantity * copper) / 1000 / surface,
      );
    };
    checkAlerts().catch(() => {
      setQuickAuthorization(null);
      setQuickCopper("Impossibile calcolare gli alert in questo momento.");
    });
  }, [quickProduct, quickCrops, quickForm]);

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

  const openQuickTreatment = (product) => {
    setQuickProduct(product);
    setQuickError("");
    setQuickForm({
      company_id: "",
      farmland_id: "",
      crop_history_id: "",
      operation_date: new Date().toISOString().slice(0, 16),
      quantity: "",
    });
  };

  const saveQuickTreatment = async () => {
    if (!quickForm.company_id || !quickForm.farmland_id || !quickForm.crop_history_id || !quickForm.quantity) {
      setQuickError("Azienda, terreno, coltura e quantità sono obbligatori.");
      return;
    }
    const crop = quickCrops.find((item) => item.id === quickForm.crop_history_id);
    try {
      await notebookService.saveOperation({
        operation_date: quickForm.operation_date,
        type: "Trattamento fitosanitario",
        company_id: quickForm.company_id,
        farmland_id: quickForm.farmland_id,
        crop_history_id: crop.id,
        crop: crop.crop,
        phytosanitary_registration: quickProduct.num_registration,
        quantity: Number(quickForm.quantity),
        unit_of_measure: "kg",
      });
      setQuickProduct(null);
    } catch (saveError) {
      setQuickError(saveError.message || "Impossibile salvare il trattamento.");
    }
  };

  const quickFarmlands = quickForm.company_id
    ? farmlands.filter((farmland) => farmland.company_id === quickForm.company_id)
    : [];

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
            onClick={() => openQuickTreatment(product)}
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

      <Dialog open={!!quickProduct} onClose={() => setQuickProduct(null)} fullWidth maxWidth="sm">
        <DialogTitle>Aggiungi trattamento alla coltura</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Prodotto fitosanitario"
              value={quickProduct ? quickProduct.name + " (" + quickProduct.num_registration + ")" : ""}
              fullWidth
              disabled
            />
            <TextField select label="Azienda" value={quickForm.company_id} onChange={(event) => setQuickForm((current) => ({ ...current, company_id: event.target.value, farmland_id: "", crop_history_id: "" }))} fullWidth required>
              <MenuItem value="">Seleziona azienda</MenuItem>
              {companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>)}
            </TextField>
            <TextField select label="Terreno" value={quickForm.farmland_id} onChange={(event) => setQuickForm((current) => ({ ...current, farmland_id: event.target.value, crop_history_id: "" }))} fullWidth required disabled={!quickForm.company_id}>
              <MenuItem value="">Seleziona terreno</MenuItem>
              {quickFarmlands.map((farmland) => <MenuItem key={farmland.id} value={farmland.id}>{farmland.name || farmland.type}</MenuItem>)}
            </TextField>
            <TextField select label="Coltura" value={quickForm.crop_history_id} onChange={(event) => setQuickForm((current) => ({ ...current, crop_history_id: event.target.value }))} fullWidth required disabled={!quickForm.farmland_id}>
              <MenuItem value="">Seleziona coltura</MenuItem>
              {quickCrops.map((crop) => <MenuItem key={crop.id} value={crop.id}>{crop.crop} ({crop.year})</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField label="Data e ora" type="datetime-local" value={quickForm.operation_date} onChange={(event) => setQuickForm((current) => ({ ...current, operation_date: event.target.value }))} InputLabelProps={{ shrink: true }} fullWidth required />
              <TextField label="Quantità (kg)" type="number" value={quickForm.quantity} onChange={(event) => setQuickForm((current) => ({ ...current, quantity: event.target.value }))} inputProps={{ min: 0, step: "0.001" }} fullWidth required />
            </Stack>
            {quickAuthorization !== null && <Alert severity={quickAuthorization ? "success" : "warning"}>{quickAuthorization ? "Prodotto autorizzato per la coltura selezionata." : "Nessuna autorizzazione trovata per la coltura selezionata."}</Alert>}
            {quickCopper && <Alert severity={typeof quickCopper === "number" && quickCopper > 4 ? "warning" : "info"}>{typeof quickCopper === "number" ? "Rame del trattamento: " + quickCopper.toFixed(3) + " kg/ha (limite annuo: 4 kg/ha)." : quickCopper}</Alert>}
            {quickError && <Alert severity="error">{quickError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickProduct(null)}>Annulla</Button>
          <Button onClick={saveQuickTreatment} variant="contained">Salva trattamento</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FitosanitariScreen;
