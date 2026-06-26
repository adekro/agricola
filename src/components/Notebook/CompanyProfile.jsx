import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import InventoryIcon from "@mui/icons-material/Inventory";
import AddIcon from "@mui/icons-material/Add";
import { notebookService } from "../../services/notebookService";
import ProductInventory from "./ProductInventory";

const EMPTY_COMPANY = {
  name: "",
  vat_number: "",
  owner_name: "",
  address: "",
  phone: "",
  email: "",
  authorized_operators: [],
};

const createEmptyCompany = () => ({
  ...EMPTY_COMPANY,
  authorized_operators: [],
});

const CompanyProfile = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", severity: "success" });
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Modals state
  const [companyModal, setCompanyModal] = useState({ open: false, data: createEmptyCompany() });
  const [inventoryModal, setInventoryModal] = useState({ open: false, companyId: null, companyName: "" });
  const [operatorInput, setOperatorInput] = useState("");

  const fetchCompanies = async () => {
    try {
      const data = await notebookService.getCompanies();
      setCompanies(data || []);
    } catch (error) {
      setMessage({ text: "Errore caricamento aziende: " + error.message, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenCompanyModal = (company = null) => {
    setCompanyModal({
      open: true,
      data: company ? { ...createEmptyCompany(), ...company } : createEmptyCompany(),
    });
    setOperatorInput("");
  };

  const handleCloseCompanyModal = () => {
    setCompanyModal({ open: false, data: createEmptyCompany() });
  };

  const handleOpenInventoryModal = (company) => {
    setInventoryModal({
      open: true,
      companyId: company.id,
      companyName: company.name,
    });
  };

  const handleCloseInventoryModal = () => {
    setInventoryModal({ open: false, companyId: null, companyName: "" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompanyModal((prev) => ({
      ...prev,
      data: { ...prev.data, [name]: value },
    }));
  };

  const handleAddOperator = () => {
    const nextOperator = operatorInput.trim();
    if (!nextOperator) return;

    setCompanyModal((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        authorized_operators: [...(prev.data.authorized_operators || []), nextOperator],
      },
    }));
    setOperatorInput("");
  };

  const handleRemoveOperator = (index) => {
    setCompanyModal((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        authorized_operators: prev.data.authorized_operators.filter((_, i) => i !== index),
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const saved = await notebookService.saveCompany({
        ...companyModal.data,
        name: companyModal.data.name.trim(),
      });

      setMessage({
        text: companyModal.data.id ? "Azienda aggiornata!" : "Azienda inserita!",
        severity: "success",
      });
      setOpenSnackbar(true);
      fetchCompanies();
      handleCloseCompanyModal();
    } catch (error) {
      setMessage({ text: "Errore durante il salvataggio: " + error.message, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa azienda?")) return;

    setSaving(true);
    try {
      await notebookService.deleteCompany(id);
      setMessage({ text: "Azienda eliminata con successo!", severity: "success" });
      setOpenSnackbar(true);
      fetchCompanies();
      if (companyModal.open) handleCloseCompanyModal();
    } catch (error) {
      setMessage({ text: "Errore durante l'eliminazione: " + error.message, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography sx={{ p: 3 }}>Caricamento...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "primary.main" }}>
            Anagrafica Aziende
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestione completa delle aziende agricole e dei relativi magazzini.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCompanyModal()}>
          Nuova Azienda
        </Button>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Azienda</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>P. IVA</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Titolare</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Indirizzo</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Telefono</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((item) => (
              <TableRow
                key={item.id}
                hover
                onDoubleClick={() => handleOpenCompanyModal(item)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell sx={{ fontWeight: "medium" }}>{item.name}</TableCell>
                <TableCell>{item.vat_number || "-"}</TableCell>
                <TableCell>{item.owner_name || "-"}</TableCell>
                <TableCell>{item.address || "-"}</TableCell>
                <TableCell>{item.phone || "-"}</TableCell>
                <TableCell>{item.email || "-"}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInventoryModal(item);
                      }}
                      title="Magazzino"
                    >
                      <InventoryIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      title="Elimina"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  Nessuna azienda registrata.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Company Edit Modal */}
      <Dialog open={companyModal.open} onClose={handleCloseCompanyModal} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {companyModal.data.id ? "Modifica Azienda" : "Nuova Azienda"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nome Azienda"
                name="name"
                value={companyModal.data.name}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                label="Partita IVA"
                name="vat_number"
                value={companyModal.data.vat_number}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                label="Titolare / Rappresentante Legale"
                name="owner_name"
                value={companyModal.data.owner_name}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                label="Indirizzo Sede"
                name="address"
                value={companyModal.data.address}
                onChange={handleChange}
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Telefono"
                  name="phone"
                  value={companyModal.data.phone}
                  onChange={handleChange}
                  fullWidth
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={companyModal.data.email}
                  onChange={handleChange}
                  fullWidth
                />
              </Stack>

              <Divider>Operatori Autorizzati</Divider>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  label="Nome Operatore"
                  value={operatorInput}
                  onChange={(e) => setOperatorInput(e.target.value)}
                  fullWidth
                />
                <Button variant="outlined" onClick={handleAddOperator}>
                  Aggiungi
                </Button>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {companyModal.data.authorized_operators?.map((op, index) => (
                  <Paper
                    key={`${op}-${index}`}
                    variant="outlined"
                    sx={{ px: 1, py: 0.5, display: "flex", alignItems: "center", gap: 1, bgcolor: "grey.50" }}
                  >
                    <Typography variant="body2">{op}</Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleRemoveOperator(index)}
                      sx={{ minWidth: "auto", p: 0 }}
                    >
                      x
                    </Button>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCompanyModal}>Annulla</Button>
            <Button variant="contained" type="submit" disabled={saving || !companyModal.data.name.trim()}>
              Salva
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Inventory Modal */}
      <Dialog open={inventoryModal.open} onClose={handleCloseInventoryModal} fullWidth maxWidth="md">
        <DialogTitle>
          Magazzino: {inventoryModal.companyName}
        </DialogTitle>
        <DialogContent dividers>
          <ProductInventory companyId={inventoryModal.companyId} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInventoryModal}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}>
        <Alert severity={message.severity} onClose={() => setOpenSnackbar(false)}>
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CompanyProfile;
