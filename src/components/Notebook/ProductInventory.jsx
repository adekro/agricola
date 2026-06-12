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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { notebookService } from "../../services/notebookService";

const categories = ["Fitosanitario", "Concime", "Biostimolante", "Altro"];

const ProductInventory = () => {
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Fitosanitario",
    supplier: "",
    batch_number: "",
    purchase_date: "",
    expiry_date: "",
    active_ingredient: "",
  });

  const fetchProducts = async () => {
    try {
      const data = await notebookService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
        ? { ...formData, id: editingProduct.id }
        : formData;
      await notebookService.saveProduct(productToSave);
      fetchProducts();
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
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          Magazzino Prodotti
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Nuovo Prodotto
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Principio Attivo</TableCell>
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
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  Nessun prodotto in magazzino.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
    </Box>
  );
};

export default ProductInventory;
