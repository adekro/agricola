import React, { useState, useEffect } from "react";
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
  TextField,
  MenuItem,
  Stack,
  Chip,
  Tabs,
  Tab,
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

const OperationsManager = () => {
  const [operations, setOperations] = useState([]);
  const [products, setProducts] = useState([]);
  const [tabValue, setTabValue] = useState(0); // 0: Tutte, 1: Solo Trattamenti, 2: Agenda
  const { farmlands } = useFarmlands();

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    operation_date: new Date().toISOString().slice(0, 16),
    type: "Lavorazione del terreno",
    farmland_id: "",
    crop: "",
    operator: "",
    product_id: "",
    quantity: "",
    unit_of_measure: "",
    machinery: "",
    notes: "",
    weather_conditions: "",
    withholding_period: "",
    dose_per_hectare: "",
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

  useEffect(() => {
    fetchOperations();
    fetchProducts();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-fill crop if farmland is selected
    if (name === "farmland_id") {
      const farm = farmlands.find(f => f.id === value);
      if (farm && farm.currentCrop) {
        setFormData(prev => ({ ...prev, farmland_id: value, crop: farm.currentCrop }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await notebookService.saveOperation({
        ...formData,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        withholding_period: formData.withholding_period ? parseInt(formData.withholding_period) : null,
      });
      fetchOperations();
      handleClose();
    } catch (error) {
      console.error("Error saving operation:", error);
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
    return ops.filter(op => {
      const date = op.operation_date.split('T')[0];
      if (filters.startDate && date < filters.startDate) return false;
      if (filters.endDate && date > filters.endDate) return false;
      if (filters.operator && !op.operator?.toLowerCase().includes(filters.operator.toLowerCase())) return false;
      if (filters.product_id && op.product_id !== filters.product_id) return false;
      return true;
    });
  };

  const now = new Date().toISOString();
  let filteredOperations = applyFilters(operations);

  if (tabValue === 1) {
    filteredOperations = filteredOperations.filter(op => op.type === "Trattamento fitosanitario");
  } else if (tabValue === 2) {
    filteredOperations = filteredOperations.filter(op => op.operation_date > now)
      .sort((a, b) => a.operation_date.localeCompare(b.operation_date));
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          Registro Attività (Quaderno di Campagna)
        </Typography>
        <Stack direction="row" spacing={1} className="no-print">
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
            Stampa Registro
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
            Registra Attività
          </Button>
        </Stack>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }} className="no-print">
        <Tab label="Tutte le attività" />
        <Tab label="Solo Trattamenti Fitosanitari" />
        <Tab label="Agenda (Pianificate)" />
      </Tabs>

      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }} className="no-print">
        <TextField
          type="date"
          label="Da"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.startDate}
          onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
        />
        <TextField
          type="date"
          label="A"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.endDate}
          onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
        />
        <TextField
          label="Operatore"
          size="small"
          value={filters.operator}
          onChange={(e) => setFilters(prev => ({ ...prev, operator: e.target.value }))}
        />
        <TextField
          select
          label="Prodotto"
          size="small"
          sx={{ minWidth: 150 }}
          value={filters.product_id}
          onChange={(e) => setFilters(prev => ({ ...prev, product_id: e.target.value }))}
        >
          <MenuItem value="">Tutti</MenuItem>
          {products.map(p => (
            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
          ))}
        </TextField>
        <Button size="small" onClick={() => setFilters({ startDate: "", endDate: "", operator: "", product_id: "" })}>
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
              <TableCell align="right" className="no-print">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOperations.map((op) => (
              <TableRow key={op.id}>
                <TableCell>{new Date(op.operation_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={op.type}
                    size="small"
                    color={op.type === "Trattamento fitosanitario" ? "error" : "primary"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{op.farmland?.owner_display_name || "N/A"}</TableCell>
                <TableCell>{op.crop || "-"}</TableCell>
                <TableCell>{op.product?.name || "-"}</TableCell>
                <TableCell>{op.quantity ? `${op.quantity} ${op.unit_of_measure}` : "-"}</TableCell>
                <TableCell>{op.operator || "-"}</TableCell>
                <TableCell align="right" className="no-print">
                  <IconButton onClick={() => handleDelete(op.id)} color="error" size="small">
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
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  name="farmland_id"
                  label="Appezzamento"
                  value={formData.farmland_id}
                  onChange={handleChange}
                  fullWidth
                  required
                >
                  {farmlands.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.ownerDisplayName} ({f.type})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  name="crop"
                  label="Coltura"
                  value={formData.crop}
                  onChange={handleChange}
                  fullWidth
                />
              </Stack>

              <TextField
                name="operator"
                label="Operatore Responsabile"
                value={formData.operator}
                onChange={handleChange}
                fullWidth
              />

              <Divider sx={{ my: 1 }}>Dettagli Prodotto e Quantità</Divider>

              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  name="product_id"
                  label="Prodotto Utilizzato"
                  value={formData.product_id}
                  onChange={handleChange}
                  fullWidth
                >
                  <MenuItem value="">Nessun prodotto</MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name} ({p.category})</MenuItem>
                  ))}
                </TextField>
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
            <Button type="submit" variant="contained">Salva Registrazione</Button>
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
