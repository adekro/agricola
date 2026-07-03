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
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { notebookService } from "../../services/notebookService";

const categories = ["Fitosanitario", "Concime", "Biostimolante", "Altro"];

const ProductInventory = ({ companyId = null }) => {
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState({ expiry: [], minimumStock: [] });
  const [tabValue, setTabValue] = useState(0);
  const [open, setOpen] = useState(false);
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [openMovementDialog, setOpenMovementDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Fitosanitario",
    supplier: "",
    batch_number: "",
    purchase_date: "",
    expiry_date: "",
    active_ingredient: "",
    minimum_stock: "",
  });
  const [batchFormData, setBatchFormData] = useState({
    product_id: "",
    batch_number: "",
    purchase_date: "",
    expiry_date: "",
    initial_quantity: "",
    unit_of_measure: "",
    notes: "",
  });
  const [movementFormData, setMovementFormData] = useState({
    inventory_batch_id: "",
    movement_type: "load",
    quantity: "",
    movement_date: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  const fetchProducts = async () => {
    try {
      const data = await notebookService.getProducts(companyId);
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCompanyInventoryData = async () => {
    if (!companyId) return;

    try {
      const [batchData, movementData, alertData] = await Promise.all([
        notebookService.getProductBatches(companyId),
        notebookService.getInventoryMovements(companyId),
        notebookService.getCompanyInventoryAlerts(companyId),
      ]);
      setBatches(batchData);
      setMovements(movementData);
      setAlerts(alertData);
    } catch (error) {
      console.error("Error fetching company inventory data:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCompanyInventoryData();
  }, [companyId]);

  const handleOpen = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        supplier: product.supplier || "",
        batch_number: product.batch_number || "",
        purchase_date: product.purchase_date || "",
        expiry_date: product.expiry_date || "",
        active_ingredient: product.active_ingredient || "",
        minimum_stock: product.minimum_stock ?? "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        category: "Fitosanitario",
        supplier: "",
        batch_number: "",
        purchase_date: "",
        expiry_date: "",
        active_ingredient: "",
        minimum_stock: "",
      });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productToSave = editingProduct
        ? {
            ...formData,
            id: editingProduct.id,
            minimum_stock:
              formData.minimum_stock === ""
                ? null
                : parseFloat(formData.minimum_stock),
          }
        : {
            ...formData,
            company_id: companyId,
            minimum_stock:
              formData.minimum_stock === ""
                ? null
                : parseFloat(formData.minimum_stock),
          };
      await notebookService.saveProduct(productToSave);
      fetchProducts();
      fetchCompanyInventoryData();
      handleClose();
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sicuro di voler eliminare questo prodotto?")) {
      try {
        await notebookService.deleteProduct(id);
        fetchProducts();
        fetchCompanyInventoryData();
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    try {
      await notebookService.saveProductBatch({
        ...batchFormData,
        company_id: companyId,
        initial_quantity: batchFormData.initial_quantity
          ? parseFloat(batchFormData.initial_quantity)
          : 0,
      });
      setOpenBatchDialog(false);
      setBatchFormData({
        product_id: "",
        batch_number: "",
        purchase_date: "",
        expiry_date: "",
        initial_quantity: "",
        unit_of_measure: "",
        notes: "",
      });
      fetchCompanyInventoryData();
    } catch (error) {
      console.error("Error saving batch:", error);
    }
  };

  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    const selectedBatch = batches.find(
      (batch) => batch.id === movementFormData.inventory_batch_id,
    );

    try {
      await notebookService.saveInventoryMovement({
        inventory_batch_id: movementFormData.inventory_batch_id,
        company_id: companyId,
        product_id: selectedBatch?.product_id,
        movement_type: movementFormData.movement_type,
        quantity: parseFloat(movementFormData.quantity || 0),
        movement_date: movementFormData.movement_date,
        notes: movementFormData.notes,
      });
      setOpenMovementDialog(false);
      setMovementFormData({
        inventory_batch_id: "",
        movement_type: "load",
        quantity: "",
        movement_date: new Date().toISOString().slice(0, 16),
        notes: "",
      });
      fetchCompanyInventoryData();
    } catch (error) {
      console.error("Error saving movement:", error);
    }
  };

  const getBatchCurrentStock = (batchId, initialQuantity) => {
    const totalMovements = movements
      .filter((movement) => movement.inventory_batch_id === batchId)
      .reduce((sum, movement) => {
        const sign = movement.movement_type === "unload" ? -1 : 1;
        return sum + sign * Number(movement.quantity || 0);
      }, 0);

    return Number(initialQuantity || 0) + totalMovements;
  };

  return (
    <Box sx={{ p: companyId ? 0 : 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          {companyId ? "Prodotti Azienda" : "Magazzino Prodotti"}
        </Typography>
        <Stack direction="row" spacing={1}>
          {companyId && (
            <>
              <Button variant="outlined" onClick={() => setOpenBatchDialog(true)}>
                Nuovo Lotto
              </Button>
              <Button variant="outlined" onClick={() => setOpenMovementDialog(true)}>
                Nuovo Movimento
              </Button>
            </>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Nuovo Prodotto
          </Button>
        </Stack>
      </Box>

      {companyId && (
        <>
          {(alerts.expiry.length > 0 || alerts.minimumStock.length > 0) && (
            <Stack spacing={1} sx={{ mb: 3 }}>
              {alerts.expiry.map((item) => (
                <Alert key={item.batchId} severity="warning">
                  Lotto {item.batchNumber} di {item.productName} in scadenza il {item.expiryDate}
                </Alert>
              ))}
              {alerts.minimumStock.map((item) => (
                <Alert key={item.productId} severity="error">
                  Sottoscorta per {item.productName}: giacenza {item.currentStock}, minima {item.minimumStock}
                </Alert>
              ))}
            </Stack>
          )}

          <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} sx={{ mb: 2 }}>
            <Tab label="Prodotti" />
            <Tab label="Lotti" />
            <Tab label="Movimenti" />
          </Tabs>
        </>
      )}

      {(!companyId || tabValue === 0) && (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Principio Attivo</TableCell>
              <TableCell>Scorta Minima</TableCell>
              <TableCell>Lotto</TableCell>
              <TableCell>Scadenza</TableCell>
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell sx={{ fontWeight: "medium" }}>{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.active_ingredient || "-"}</TableCell>
                <TableCell>{product.minimum_stock ?? "-"}</TableCell>
                <TableCell>{product.batch_number || "-"}</TableCell>
                <TableCell>{product.expiry_date || "-"}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(product)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(product.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  Nessun prodotto in magazzino.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {companyId && tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Prodotto</TableCell>
                <TableCell>Lotto</TableCell>
                <TableCell>Scadenza</TableCell>
                <TableCell>Quantità iniziale</TableCell>
                <TableCell>Giacenza</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>{batch.product?.name || "-"}</TableCell>
                  <TableCell>{batch.batch_number}</TableCell>
                  <TableCell>{batch.expiry_date || "-"}</TableCell>
                  <TableCell>{batch.initial_quantity || 0} {batch.unit_of_measure || ""}</TableCell>
                  <TableCell>{getBatchCurrentStock(batch.id, batch.initial_quantity)} {batch.unit_of_measure || ""}</TableCell>
                </TableRow>
              ))}
              {batches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    Nessun lotto registrato.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {companyId && tabValue === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Prodotto</TableCell>
                <TableCell>Lotto</TableCell>
                <TableCell>Movimento</TableCell>
                <TableCell>Quantità</TableCell>
                <TableCell>Note</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{new Date(movement.movement_date).toLocaleDateString()}</TableCell>
                  <TableCell>{movement.product?.name || "-"}</TableCell>
                  <TableCell>{movement.batch?.batch_number || "-"}</TableCell>
                  <TableCell>{movement.movement_type}</TableCell>
                  <TableCell>{movement.quantity}</TableCell>
                  <TableCell>{movement.notes || "-"}</TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    Nessun movimento registrato.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingProduct ? "Modifica Prodotto" : "Aggiungi Prodotto"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                name="name"
                label="Nome Commerciale"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
              />
              <TextField
                select
                name="category"
                label="Categoria"
                value={formData.category}
                onChange={handleChange}
                fullWidth
                required
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                name="active_ingredient"
                label="Principio Attivo"
                value={formData.active_ingredient}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                name="minimum_stock"
                label="Scorta Minima"
                type="number"
                value={formData.minimum_stock}
                onChange={handleChange}
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  name="supplier"
                  label="Fornitore"
                  value={formData.supplier}
                  onChange={handleChange}
                  fullWidth
                />
                <TextField
                  name="batch_number"
                  label="Lotto"
                  value={formData.batch_number}
                  onChange={handleChange}
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  type="date"
                  name="purchase_date"
                  label="Data Acquisto"
                  value={formData.purchase_date}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="date"
                  name="expiry_date"
                  label="Data Scadenza"
                  value={formData.expiry_date}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Annulla</Button>
            <Button type="submit" variant="contained">
              Salva
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={openBatchDialog} onClose={() => setOpenBatchDialog(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleBatchSubmit}>
          <DialogTitle>Aggiungi Lotto</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label="Prodotto"
                value={batchFormData.product_id}
                onChange={(e) => setBatchFormData((prev) => ({ ...prev, product_id: e.target.value }))}
                fullWidth
                required
              >
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Lotto"
                  value={batchFormData.batch_number}
                  onChange={(e) => setBatchFormData((prev) => ({ ...prev, batch_number: e.target.value }))}
                  fullWidth
                  required
                />
                <TextField
                  label="Quantità iniziale"
                  type="number"
                  value={batchFormData.initial_quantity}
                  onChange={(e) => setBatchFormData((prev) => ({ ...prev, initial_quantity: e.target.value }))}
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  type="date"
                  label="Data Acquisto"
                  value={batchFormData.purchase_date}
                  onChange={(e) => setBatchFormData((prev) => ({ ...prev, purchase_date: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="date"
                  label="Data Scadenza"
                  value={batchFormData.expiry_date}
                  onChange={(e) => setBatchFormData((prev) => ({ ...prev, expiry_date: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
              <TextField
                label="Unità di Misura"
                value={batchFormData.unit_of_measure}
                onChange={(e) => setBatchFormData((prev) => ({ ...prev, unit_of_measure: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Note"
                value={batchFormData.notes}
                onChange={(e) => setBatchFormData((prev) => ({ ...prev, notes: e.target.value }))}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBatchDialog(false)}>Annulla</Button>
            <Button type="submit" variant="contained">Salva</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={openMovementDialog} onClose={() => setOpenMovementDialog(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleMovementSubmit}>
          <DialogTitle>Nuovo Movimento Magazzino</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label="Lotto"
                value={movementFormData.inventory_batch_id}
                onChange={(e) => setMovementFormData((prev) => ({ ...prev, inventory_batch_id: e.target.value }))}
                fullWidth
                required
              >
                {batches.map((batch) => (
                  <MenuItem key={batch.id} value={batch.id}>
                    {batch.product?.name || "-"} - {batch.batch_number}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="Tipo Movimento"
                  value={movementFormData.movement_type}
                  onChange={(e) => setMovementFormData((prev) => ({ ...prev, movement_type: e.target.value }))}
                  fullWidth
                >
                  <MenuItem value="load">Carico</MenuItem>
                  <MenuItem value="unload">Scarico</MenuItem>
                  <MenuItem value="adjustment">Rettifica</MenuItem>
                </TextField>
                <TextField
                  label="Quantità"
                  type="number"
                  value={movementFormData.quantity}
                  onChange={(e) => setMovementFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                  fullWidth
                  required
                />
              </Stack>
              <TextField
                type="datetime-local"
                label="Data Movimento"
                value={movementFormData.movement_date}
                onChange={(e) => setMovementFormData((prev) => ({ ...prev, movement_date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Note"
                value={movementFormData.notes}
                onChange={(e) => setMovementFormData((prev) => ({ ...prev, notes: e.target.value }))}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenMovementDialog(false)}>Annulla</Button>
            <Button type="submit" variant="contained">Salva</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ProductInventory;
