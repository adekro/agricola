import React, { useState, useEffect } from "react";
import {
  useLocation,
} from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Tabs,
  Tab,
  Alert,
  Autocomplete,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PrintIcon from "@mui/icons-material/Print";
import { notebookService } from "../../services/notebookService";
import useFarmlands from "../../hooks/useFarmlands";

const operationTypes = [
  "Semina",
  "Trapianto",
  "Concimazione",
  "Irrigazione",
  "Trattamento fitosanitario",
  "Diserbo",
  "Potatura",
  "Lavorazione del terreno",
  "Raccolta",
  "Altro",
];
const COPPER_LIMIT_KG_PER_HECTARE = 4;
const isKilogramUnit = (unit = "") =>
  ["kg", "kgs", "chilogrammo", "chilogrammi"].includes(
    unit.trim().toLowerCase(),
  );

const OperationsManager = ({ initialFarmlandId = "", initialType = "" }) => {
  const location = useLocation();
  const routePreset = location.state || {};
  const [operations, setOperations] = useState([]);
  const [products, setProducts] = useState([]);
  const [phytosanitaryProducts, setPhytosanitaryProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [cropHistory, setCropHistory] = useState([]);
  const [cropAuthorization, setCropAuthorization] = useState(null);
  const [copperAlert, setCopperAlert] = useState(null);
  const [formError, setFormError] = useState("");
  const [tabValue, setTabValue] = useState(0); // 0: Tutte, 1: Solo Trattamenti, 2: Agenda
  const { farmlands, companies } = useFarmlands();

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    operation_date: new Date().toISOString().slice(0, 16),
    type: initialType || routePreset.initialType || "Lavorazione del terreno",
    farmland_id: initialFarmlandId || routePreset.initialFarmlandId || "",
    company_id: "",
    crop_history_id: "",
    crop: "",
    operator: "",
    product_id: "",
    phytosanitary_registration: "",
    inventory_batch_id: "",
    quantity: "",
    unit_of_measure: "",
    machinery: "",
    notes: "",
    weather_conditions: "",
    withholding_period: "",
    dose_per_hectare: "",
    fertilization_plan_id: "",
    attachment_url: "",
  });

  // Filters state
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    operator: "",
    product_id: "",
  });

  const fetchOperations = async () => {
    try {
      const data = await notebookService.getOperations();
      setOperations(data);
    } catch (error) {
      console.error("Error fetching operations:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await notebookService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchPhytosanitaryProducts = async () => {
    try {
      setPhytosanitaryProducts(await notebookService.getPhytosanitaryProducts());
    } catch (error) {
      console.error("Error fetching phytosanitary products:", error);
      setPhytosanitaryProducts([]);
    }
  };

  const fetchBatches = async (companyId = null) => {
    if (!companyId) {
      setBatches([]);
      return;
    }

    try {
      const data = await notebookService.getProductBatches(companyId);
      setBatches(data);
    } catch (error) {
      console.error("Error fetching product batches:", error);
      setBatches([]);
    }
  };

  useEffect(() => {
    fetchOperations();
    fetchProducts();
    fetchPhytosanitaryProducts();
  }, []);

  useEffect(() => {
    if (routePreset.initialFarmlandId || routePreset.initialType) {
      setOpen(true);
    }
  }, [routePreset.initialFarmlandId, routePreset.initialType]);

  useEffect(() => {
    if (!formData.farmland_id) {
      setFormData((prev) => ({ ...prev, inventory_batch_id: "" }));
      return;
    }

    const farm = farmlands.find((item) => item.id === formData.farmland_id);
    if (!farm?.company_id) {
      setFormData((prev) => ({ ...prev, inventory_batch_id: "" }));
      return;
    }

    setFormData((prev) => {
      if (prev.company_id === farm.company_id) return prev;
      return {
        ...prev,
        company_id: farm.company_id,
        inventory_batch_id: "",
      };
    });
  }, [farmlands, formData.farmland_id]);

  useEffect(() => {
    fetchBatches(formData.company_id);
  }, [formData.company_id]);

  useEffect(() => {
    const fetchCropHistory = async () => {
      if (!formData.farmland_id) {
        setCropHistory([]);
        return;
      }
      try {
        setCropHistory(await notebookService.getCropHistory(formData.farmland_id));
      } catch (error) {
        console.error("Error fetching crop history:", error);
        setCropHistory([]);
      }
    };
    fetchCropHistory();
  }, [formData.farmland_id]);

  useEffect(() => {
    const checkCropAuthorization = async () => {
      const inventoryProduct = products.find((item) => item.id === formData.product_id);
      const crop = cropHistory.find((item) => item.id === formData.crop_history_id);
      const cropLabel = crop?.agea_label || crop?.crop || "";
      const cropTerm = cropLabel.split(" - ").pop().trim().split(/\s+/)[0];

      if (
        formData.type !== "Trattamento fitosanitario" ||
        (!formData.phytosanitary_registration && !inventoryProduct?.name) ||
        !cropTerm
      ) {
        setCropAuthorization(null);
        return;
      }

      try {
        setCropAuthorization("loading");
        const isAuthorized = await notebookService.isPhytosanitaryAuthorizedForCrop(
          {
            registration: formData.phytosanitary_registration,
            productName: inventoryProduct?.name,
          },
          cropTerm,
        );
        setCropAuthorization(isAuthorized === null ? "unavailable" : isAuthorized);
      } catch (error) {
        console.error("Error checking phytosanitary crop authorization:", error);
        setCropAuthorization(null);
      }
    };
    checkCropAuthorization();
  }, [cropHistory, formData.crop_history_id, formData.phytosanitary_registration, formData.product_id, formData.type, products]);

  useEffect(() => {
    const calculateCopper = async () => {
      const crop = cropHistory.find((item) => item.id === formData.crop_history_id);
      const year = Number(String(formData.operation_date || "").slice(0, 4));
      const currentProduct = products.find((item) => item.id === formData.product_id);
      const currentQuantity = Number(formData.quantity);

      if (
        formData.type !== "Trattamento fitosanitario" ||
        !crop ||
        !year ||
        !Number.isFinite(currentQuantity) ||
        currentQuantity <= 0 ||
        (!formData.phytosanitary_registration && !currentProduct?.name)
      ) {
        setCopperAlert(null);
        return;
      }

      if (!isKilogramUnit(formData.unit_of_measure)) {
        setCopperAlert({ unavailable: "Indica la quantità in kg per calcolare il rame." });
        return;
      }

      try {
        const annualSau = await notebookService.getAnnualSau(formData.farmland_id, year);
        const surface = annualSau || Number(crop.area || 0);
        if (!surface) {
          setCopperAlert({ unavailable: "Inserisci la SAU annuale della coltura per calcolare il rame per ettaro." });
          return;
        }

        const previousTreatments = operations.filter(
          (operation) =>
            operation.type === "Trattamento fitosanitario" &&
            operation.crop_history_id === crop.id &&
            Number(String(operation.operation_date || "").slice(0, 4)) === year,
        );
        const treatments = [
          ...previousTreatments,
          {
            quantity: currentQuantity,
            unit_of_measure: formData.unit_of_measure,
            phytosanitary_registration: formData.phytosanitary_registration,
            product: currentProduct,
          },
        ];
        if (treatments.some((treatment) => !isKilogramUnit(treatment.unit_of_measure))) {
          setCopperAlert({ unavailable: "Uno o più trattamenti dell'anno non sono espressi in kg." });
          return;
        }

        const copperValues = await Promise.all(
          treatments.map((treatment) =>
            notebookService.getPhytosanitaryCopperGPerKg({
              registration: treatment.phytosanitary_registration,
              productName: treatment.product?.name,
            }),
          ),
        );
        if (copperValues.some((value) => value == null)) {
          setCopperAlert({ unavailable: "Manca la concentrazione di rame estratta per uno o più prodotti." });
          return;
        }

        const copperKgPerHectare =
          treatments.reduce(
            (total, treatment, index) =>
              total + Number(treatment.quantity) * copperValues[index],
            0,
          ) /
          1000 /
          surface;
        setCopperAlert({ copperKgPerHectare, surface });
      } catch (error) {
        console.error("Error calculating copper alert:", error);
        setCopperAlert({ unavailable: "Impossibile calcolare il rame in questo momento." });
      }
    };
    calculateCopper();
  }, [cropHistory, formData, operations, products]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setFormError("");
    setOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError("");

    // Auto-fill crop if farmland is selected
    if (name === "farmland_id") {
      const farm = farmlands.find((f) => f.id === value);
      if (farm) {
        setFormData((prev) => ({
          ...prev,
          farmland_id: value,
          company_id: farm.company_id || "",
          crop: farm.currentCrop || "",
          crop_history_id: "",
          inventory_batch_id: "",
          product_id: "",
          phytosanitary_registration: "",
        }));
      }
    }

    if (name === "company_id") {
      setFormData((prev) => ({
        ...prev,
        company_id: value,
        farmland_id: "",
        crop_history_id: "",
        crop: "",
        inventory_batch_id: "",
        product_id: "",
        phytosanitary_registration: "",
      }));
    }

    if (name === "product_id") {
      setFormData((prev) => ({
        ...prev,
        product_id: value,
        phytosanitary_registration: "",
        inventory_batch_id: "",
      }));
    }

    if (name === "type") {
      setFormData((prev) => ({
        ...prev,
        type: value,
        product_id: value === "Trattamento fitosanitario" ? "" : prev.product_id,
        phytosanitary_registration:
          value === "Trattamento fitosanitario"
            ? prev.phytosanitary_registration
            : "",
        inventory_batch_id: value === "Trattamento fitosanitario" ? "" : prev.inventory_batch_id,
      }));
    }

    if (name === "phytosanitary_registration") {
      setFormData((prev) => ({
        ...prev,
        phytosanitary_registration: value,
        product_id: "",
        inventory_batch_id: "",
      }));
    }

    if (name === "crop_history_id") {
      const cropEntry = cropHistory.find((entry) => entry.id === value);
      setFormData((prev) => ({
        ...prev,
        crop_history_id: value,
        crop: cropEntry?.crop || "",
      }));
    }
  };

  const selectedFarmland = farmlands.find((farm) => farm.id === formData.farmland_id);
  const relevantFarmlands = formData.company_id
    ? farmlands.filter((farm) => farm.company_id === formData.company_id)
    : farmlands;
  const farmlandArea = Number(selectedFarmland?.area || 0);
  const relevantProducts = formData.company_id
    ? products.filter((product) => product.company_id === formData.company_id)
    : products;
  const inventoryPhytosanitaryProducts = formData.company_id
    ? relevantProducts.filter((product) => product.category === "Fitosanitario")
    : [];
  const relevantBatches = batches.filter(
    (batch) => !formData.product_id || batch.product_id === formData.product_id,
  );
  const expectedDoseTotal =
    formData.type === "Trattamento fitosanitario" &&
    formData.dose_per_hectare !== "" &&
    farmlandArea > 0
      ? Number(formData.dose_per_hectare || 0) * farmlandArea
      : null;
  const enteredQuantity =
    formData.quantity === "" ? null : Number(formData.quantity || 0);
  const quantityMismatch =
    expectedDoseTotal != null &&
    enteredQuantity != null &&
    Math.abs(expectedDoseTotal - enteredQuantity) > 0.0001;
  const withholdingDate =
    formData.type === "Trattamento fitosanitario" &&
    formData.operation_date &&
    formData.withholding_period
      ? (() => {
          const date = new Date(formData.operation_date);
          date.setDate(date.getDate() + Number(formData.withholding_period || 0));
          return date.toLocaleDateString();
        })()
      : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (
        formData.type === "Trattamento fitosanitario" &&
        !formData.company_id
      ) {
        setFormError("Per un trattamento fitosanitario devi selezionare un'azienda.");
        return;
      }

      if (
        formData.type === "Trattamento fitosanitario" &&
        !formData.farmland_id
      ) {
        setFormError("Per un trattamento fitosanitario devi selezionare un appezzamento.");
        return;
      }

      if (
        formData.type === "Trattamento fitosanitario" &&
        !formData.crop_history_id
      ) {
        setFormError("Per un trattamento fitosanitario devi selezionare una coltura.");
        return;
      }

      if (
        formData.type === "Trattamento fitosanitario" &&
        !formData.phytosanitary_registration &&
        !formData.product_id
      ) {
        setFormError("Per un trattamento fitosanitario devi selezionare un prodotto.");
        return;
      }

      if (
        (formData.type === "Trattamento fitosanitario" ||
          formData.type === "Concimazione") &&
        formData.product_id &&
        !formData.inventory_batch_id
      ) {
        setFormError("Se usi un prodotto di magazzino devi selezionare il lotto da scaricare.");
        return;
      }

      const savedOperation = await notebookService.saveOperation({
        ...formData,
        company_id: formData.company_id || null,
        crop_history_id: formData.crop_history_id || null,
        phytosanitary_registration: formData.phytosanitary_registration || null,
        inventory_batch_id: formData.inventory_batch_id || null,
        fertilization_plan_id: formData.fertilization_plan_id || null,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        withholding_period: formData.withholding_period
          ? parseInt(formData.withholding_period)
          : null,
        dose_per_hectare: formData.dose_per_hectare
          ? parseFloat(formData.dose_per_hectare)
          : null,
      });

      if (
        savedOperation?.id &&
        formData.inventory_batch_id &&
        formData.quantity
      ) {
        await notebookService.saveInventoryMovement({
          inventory_batch_id: formData.inventory_batch_id,
          company_id: formData.company_id,
          product_id: formData.product_id,
          operation_id: savedOperation.id,
          movement_type: "unload",
          quantity: parseFloat(formData.quantity),
          movement_date: formData.operation_date,
          notes: `Scarico automatico da operazione ${formData.type}`,
        });
      }

      fetchOperations();
      fetchBatches(formData.company_id);
      handleClose();
    } catch (error) {
      console.error("Error saving operation:", error);
      setFormError(error.message || "Errore durante il salvataggio.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Eliminare questa operazione?")) {
      try {
        await notebookService.deleteOperation(id);
        fetchOperations();
      } catch (error) {
        console.error("Error deleting operation:", error);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const applyFilters = (ops) => {
    return ops.filter((op) => {
      const date = op.operation_date.split("T")[0];
      if (filters.startDate && date < filters.startDate) return false;
      if (filters.endDate && date > filters.endDate) return false;
      if (
        filters.operator &&
        !op.operator?.toLowerCase().includes(filters.operator.toLowerCase())
      )
        return false;
      if (filters.product_id && op.product_id !== filters.product_id)
        return false;
      return true;
    });
  };

  const now = new Date().toISOString();
  let filteredOperations = applyFilters(operations);

  if (tabValue === 1) {
    filteredOperations = filteredOperations.filter(
      (op) => op.type === "Trattamento fitosanitario",
    );
  } else if (tabValue === 2) {
    filteredOperations = filteredOperations
      .filter((op) => op.operation_date > now)
      .sort((a, b) => a.operation_date.localeCompare(b.operation_date));
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          Registro Attività (Quaderno di Campagna)
        </Typography>
        <Stack direction="row" spacing={1} className="no-print">
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Stampa Registro
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
          >
            Registra Attività
          </Button>
        </Stack>
      </Box>

      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{ mb: 2 }}
        className="no-print"
      >
        <Tab label="Tutte le attività" />
        <Tab label="Solo Trattamenti Fitosanitari" />
        <Tab label="Agenda (Pianificate)" />
      </Tabs>

      <Box
        sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}
        className="no-print"
      >
        <TextField
          type="date"
          label="Da"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.startDate}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, startDate: e.target.value }))
          }
        />
        <TextField
          type="date"
          label="A"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.endDate}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, endDate: e.target.value }))
          }
        />
        <TextField
          label="Operatore"
          size="small"
          value={filters.operator}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, operator: e.target.value }))
          }
        />
        <TextField
          select
          label="Prodotto"
          size="small"
          sx={{ minWidth: 150 }}
          value={filters.product_id}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, product_id: e.target.value }))
          }
        >
          <MenuItem value="">Tutti</MenuItem>
          {products.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <Button
          size="small"
          onClick={() =>
            setFilters({
              startDate: "",
              endDate: "",
              operator: "",
              product_id: "",
            })
          }
        >
          Reset
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Attività</TableCell>
              <TableCell>Appezzamento</TableCell>
              <TableCell>Coltura</TableCell>
              <TableCell>Prodotto</TableCell>
              <TableCell>Quantità</TableCell>
              <TableCell>Operatore</TableCell>
              <TableCell align="right" className="no-print">
                Azioni
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOperations.map((op) => (
              <TableRow key={op.id}>
                <TableCell>
                  {new Date(op.operation_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={op.type}
                    size="small"
                    color={
                      op.type === "Trattamento fitosanitario"
                        ? "error"
                        : "primary"
                    }
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {op.farmland?.owner_display_name || "N/A"}
                </TableCell>
                <TableCell>{op.crop || "-"}</TableCell>
                <TableCell>{op.phytosanitary?.name || op.product?.name || "-"}</TableCell>
                <TableCell>
                  {op.quantity ? `${op.quantity} ${op.unit_of_measure}` : "-"}
                </TableCell>
                <TableCell>{op.operator || "-"}</TableCell>
                <TableCell align="right" className="no-print">
                  <IconButton
                    onClick={() => handleDelete(op.id)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredOperations.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  Nessuna operazione registrata.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <form onSubmit={handleSubmit}>
          <DialogTitle>Registra Nuova Operazione Agronomica</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <Stack direction="row" spacing={2}>
                <TextField
                  type="datetime-local"
                  name="operation_date"
                  label="Data e Ora"
                  value={formData.operation_date}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  select
                  name="type"
                  label="Tipo di Operazione"
                  value={formData.type}
                  onChange={handleChange}
                  fullWidth
                  required
                >
                  {operationTypes.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  name="company_id"
                  label="Azienda"
                  value={formData.company_id}
                  onChange={handleChange}
                  fullWidth
                  required={formData.type === "Trattamento fitosanitario"}
                >
                  <MenuItem value="">Seleziona azienda</MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  name="farmland_id"
                  label="Appezzamento"
                  value={formData.farmland_id}
                  onChange={handleChange}
                  fullWidth
                  required
                  disabled={formData.type === "Trattamento fitosanitario" && !formData.company_id}
                >
                  <MenuItem value="">Seleziona terreno</MenuItem>
                  {relevantFarmlands.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.ownerDisplayName} ({f.type})
                    </MenuItem>
                  ))}
                </TextField>
                {formData.type === "Trattamento fitosanitario" ? (
                  <TextField
                    select
                    name="crop_history_id"
                    label="Coltura"
                    value={formData.crop_history_id}
                    onChange={handleChange}
                    fullWidth
                    required
                    disabled={!formData.farmland_id}
                  >
                    <MenuItem value="">Seleziona coltura</MenuItem>
                    {cropHistory.map((entry) => (
                      <MenuItem key={entry.id} value={entry.id}>
                        {entry.crop} ({entry.year}){entry.is_terminated ? " — terminata" : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    name="crop"
                    label="Coltura"
                    value={formData.crop}
                    onChange={handleChange}
                    fullWidth
                  />
                )}
              </Stack>

              {selectedFarmland && (
                <Alert severity="info">
                  Appezzamento: {selectedFarmland.ownerDisplayName || selectedFarmland.type}
                  {" | "}Superficie: {selectedFarmland.area || "-"} ha
                  {" | "}Azienda: {selectedFarmland.company_id || "-"}
                </Alert>
              )}

              <TextField
                name="operator"
                label="Operatore Responsabile"
                value={formData.operator}
                onChange={handleChange}
                fullWidth
              />

              <Divider>Dettagli Prodotto e Quantità</Divider>
              <Stack direction="row" spacing={2}>
                {formData.type === "Trattamento fitosanitario" ? (
                  inventoryPhytosanitaryProducts.length > 0 ? (
                    <TextField
                      select
                      name="product_id"
                      label="Prodotto fitosanitario di magazzino"
                      value={formData.product_id}
                      onChange={handleChange}
                      fullWidth
                      required
                    >
                      <MenuItem value="">Seleziona prodotto fitosanitario</MenuItem>
                      {inventoryPhytosanitaryProducts.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Autocomplete
                      options={phytosanitaryProducts}
                      value={
                        phytosanitaryProducts.find(
                          (product) =>
                            product.num_registration ===
                            formData.phytosanitary_registration,
                        ) || null
                      }
                      onChange={(_event, product) =>
                        setFormData((prev) => ({
                          ...prev,
                          phytosanitary_registration:
                            product?.num_registration || "",
                          product_id: "",
                          inventory_batch_id: "",
                        }))
                      }
                      getOptionLabel={(product) =>
                        [
                          product.name,
                          product.source_data?.sostanze_attive,
                          product.company_name,
                        ]
                          .filter(Boolean)
                          .join(" — ")
                      }
                      isOptionEqualToValue={(option, value) =>
                        option.num_registration === value.num_registration
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Prodotto fitosanitario da etichetta"
                          placeholder="Nome, sostanza attiva o azienda"
                          required
                        />
                      )}
                      fullWidth
                    />
                  )
                ) : (
                  <TextField
                    select
                    name="product_id"
                    label="Prodotto Utilizzato"
                    value={formData.product_id}
                    onChange={handleChange}
                    fullWidth
                  >
                    <MenuItem value="">Nessun prodotto</MenuItem>
                    {relevantProducts.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                <TextField
                  name="quantity"
                  label="Quantità"
                  type="number"
                  value={formData.quantity}
                  onChange={handleChange}
                  fullWidth
                />
                <TextField
                  name="unit_of_measure"
                  label="Unità di Misura"
                  placeholder="kg, l, sacchi..."
                  value={formData.unit_of_measure}
                  onChange={handleChange}
                  fullWidth
                />
              </Stack>

              {(formData.type === "Trattamento fitosanitario" ||
                formData.type === "Concimazione") &&
                formData.product_id && (
                  <TextField
                    select
                    name="inventory_batch_id"
                    label="Lotto di Magazzino"
                    value={formData.inventory_batch_id}
                    onChange={handleChange}
                    fullWidth
                  >
                    <MenuItem value="">Seleziona lotto</MenuItem>
                    {relevantBatches.map((batch) => (
                      <MenuItem key={batch.id} value={batch.id}>
                        {batch.batch_number} {batch.expiry_date ? `- scad. ${batch.expiry_date}` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

              {formData.type === "Trattamento fitosanitario" &&
                cropAuthorization !== null && (
                  <Alert
                    severity={
                      cropAuthorization === "loading"
                        ? "info"
                        : cropAuthorization === true
                          ? "success"
                          : "warning"
                    }
                  >
                    {cropAuthorization === "loading"
                      ? "Verifica dell'autorizzazione del prodotto per la coltura..."
                      : cropAuthorization === true
                        ? "Prodotto autorizzato per la coltura selezionata."
                        : cropAuthorization === "unavailable"
                          ? "Il prodotto non è presente nel catalogo fitosanitari: autorizzazione non verificabile."
                          : "Nessuna autorizzazione trovata per la coltura selezionata nell'etichetta corrente del prodotto."}
                  </Alert>
                )}

              {formData.type === "Trattamento fitosanitario" &&
                copperAlert && (
                  <Alert
                    severity={
                      copperAlert.unavailable
                        ? "info"
                        : copperAlert.copperKgPerHectare > COPPER_LIMIT_KG_PER_HECTARE
                          ? "warning"
                          : "success"
                    }
                  >
                    {copperAlert.unavailable
                      ? copperAlert.unavailable
                      : "Rame annuo: " +
                        copperAlert.copperKgPerHectare.toFixed(3) +
                        " kg/ha su " +
                        copperAlert.surface +
                        " ha (limite: " +
                        COPPER_LIMIT_KG_PER_HECTARE +
                        " kg/ha)."}
                  </Alert>
                )}

              {formData.type === "Trattamento fitosanitario" && (
                <>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      name="weather_conditions"
                      label="Condizioni Meteo"
                      value={formData.weather_conditions}
                      onChange={handleChange}
                      fullWidth
                    />
                    <TextField
                      name="withholding_period"
                      label="Tempo di Carenza (giorni)"
                      type="number"
                      value={formData.withholding_period}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    name="dose_per_hectare"
                    label="Dose per Ettaro"
                    type="number"
                    value={formData.dose_per_hectare}
                    onChange={handleChange}
                    fullWidth
                  />
                  {(expectedDoseTotal != null || withholdingDate) && (
                    <Stack spacing={1}>
                      {expectedDoseTotal != null && (
                        <Alert severity={quantityMismatch ? "warning" : "success"}>
                          Dose attesa su appezzamento: {expectedDoseTotal} {formData.unit_of_measure || "unità"}
                          {quantityMismatch && enteredQuantity != null
                            ? ` | quantità inserita: ${enteredQuantity}`
                            : ""}
                        </Alert>
                      )}
                      {withholdingDate && (
                        <Alert severity="info">
                          Fine tempo di carenza prevista: {withholdingDate}
                        </Alert>
                      )}
                    </Stack>
                  )}
                </>
              )}

              <TextField
                name="attachment_url"
                label="URL Foto Allegata"
                value={formData.attachment_url}
                onChange={handleChange}
                fullWidth
              />

              <TextField
                name="machinery"
                label="Macchinario Utilizzato"
                value={formData.machinery}
                onChange={handleChange}
                fullWidth
              />

              <TextField
                name="notes"
                label="Note Aggiuntive"
                multiline
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Annulla</Button>
            <Button type="submit" variant="contained">
              Salva Registrazione
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              padding: 20px;
            }
            .MuiPaper-root {
              box-shadow: none !important;
              border: 1px solid #ddd;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default OperationsManager;
