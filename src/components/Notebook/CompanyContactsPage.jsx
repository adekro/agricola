import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
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
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import StarIcon from "@mui/icons-material/Star";
import { notebookService } from "../../services/notebookService";
import { categoryLabels, contactCategories, sectionMeta } from "./companySections";
import { useCompanyWorkspace } from "./CompanyWorkspace";

const EMPTY_CONTACT = {
  category: "",
  name: "",
  role_label: "",
  phone: "",
  email: "",
  notes: "",
  is_primary: false,
};

const CompanyContactsPage = ({ sectionKey }) => {
  const { company } = useCompanyWorkspace();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, data: EMPTY_CONTACT });
  const [message, setMessage] = useState({ text: "", severity: "success" });
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const categories = contactCategories[sectionKey] || [];
  const meta = sectionMeta[sectionKey];

  const groupedContacts = useMemo(
    () =>
      categories.map((category) => ({
        category,
        items: contacts.filter((item) => item.category === category),
      })),
    [categories, contacts],
  );

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        categories.map((category) =>
          notebookService.getCompanyContacts(company.id, category),
        ),
      );
      setContacts(results.flat());
    } catch (error) {
      setMessage({ text: `Errore caricamento contatti: ${error.message}`, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [company.id, sectionKey]);

  const handleOpenModal = (contact = null, fallbackCategory = categories[0]) => {
    setModal({
      open: true,
      data: contact
        ? {
            ...EMPTY_CONTACT,
            ...contact,
            is_primary: Boolean(contact.is_primary),
          }
        : { ...EMPTY_CONTACT, category: fallbackCategory },
    });
  };

  const handleCloseModal = () => {
    setModal({ open: false, data: EMPTY_CONTACT });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setModal((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await notebookService.saveCompanyContact({
        ...modal.data,
        company_id: company.id,
        name: modal.data.name.trim(),
      });
      setMessage({
        text: modal.data.id ? "Contatto aggiornato." : "Contatto aggiunto.",
        severity: "success",
      });
      setOpenSnackbar(true);
      handleCloseModal();
      fetchContacts();
    } catch (error) {
      setMessage({ text: `Errore salvataggio contatto: ${error.message}`, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contact) => {
    if (contact.is_legacy) {
      setMessage({
        text: "Il contatto legacy derivato da owner_name non puo essere eliminato da qui.",
        severity: "warning",
      });
      setOpenSnackbar(true);
      return;
    }

    if (!window.confirm(`Eliminare il contatto ${contact.name}?`)) return;

    try {
      await notebookService.deleteCompanyContact(contact.id);
      setMessage({ text: "Contatto eliminato.", severity: "success" });
      setOpenSnackbar(true);
      fetchContacts();
    } catch (error) {
      setMessage({ text: `Errore eliminazione contatto: ${error.message}`, severity: "error" });
      setOpenSnackbar(true);
    }
  };

  if (loading) {
    return <Typography>Caricamento contatti...</Typography>;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {meta.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {meta.description}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
          Nuovo contatto
        </Button>
      </Stack>

      <Stack spacing={3}>
        {groupedContacts.map(({ category, items }) => (
          <Paper key={category} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                {categoryLabels[category]}
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Ruolo</TableCell>
                    <TableCell>Telefono</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Note</TableCell>
                    <TableCell align="right">Azioni</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell sx={{ fontWeight: "medium" }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <span>{contact.name}</span>
                          {contact.is_primary ? (
                            <Chip
                              size="small"
                              color="primary"
                              icon={<StarIcon />}
                              label="Primario"
                            />
                          ) : null}
                          {contact.is_legacy ? <Chip size="small" variant="outlined" label="Legacy" /> : null}
                        </Stack>
                      </TableCell>
                      <TableCell>{contact.role_label || "-"}</TableCell>
                      <TableCell>{contact.phone || "-"}</TableCell>
                      <TableCell>{contact.email || "-"}</TableCell>
                      <TableCell>{contact.notes || "-"}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenModal(contact)}
                          disabled={contact.is_legacy}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(contact)}
                          disabled={contact.is_legacy}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        Nessun elemento registrato.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))}
      </Stack>

      <Dialog open={modal.open} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{modal.data.id ? "Modifica contatto" : "Nuovo contatto"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                required
                name="category"
                label="Categoria"
                value={modal.data.category}
                onChange={handleChange}
                fullWidth
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {categoryLabels[category]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                required
                name="name"
                label="Nome"
                value={modal.data.name}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                name="role_label"
                label="Ruolo"
                value={modal.data.role_label}
                onChange={handleChange}
                fullWidth
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  name="phone"
                  label="Telefono"
                  value={modal.data.phone}
                  onChange={handleChange}
                  fullWidth
                />
                <TextField
                  name="email"
                  type="email"
                  label="Email"
                  value={modal.data.email}
                  onChange={handleChange}
                  fullWidth
                />
              </Stack>
              <TextField
                name="notes"
                label="Note"
                value={modal.data.notes}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
              />
              <TextField
                select
                name="is_primary"
                label="Contatto principale"
                value={modal.data.is_primary ? "yes" : "no"}
                onChange={(event) =>
                  setModal((prev) => ({
                    ...prev,
                    data: {
                      ...prev.data,
                      is_primary: event.target.value === "yes",
                    },
                  }))
                }
                fullWidth
              >
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="yes">Si</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Annulla</Button>
            <Button variant="contained" type="submit" disabled={saving || !modal.data.name.trim()}>
              Salva
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar open={openSnackbar} autoHideDuration={5000} onClose={() => setOpenSnackbar(false)}>
        <Alert severity={message.severity} onClose={() => setOpenSnackbar(false)}>
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CompanyContactsPage;
