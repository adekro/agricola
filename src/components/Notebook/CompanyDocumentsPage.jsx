import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
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
import { notebookService } from "../../services/notebookService";
import { sectionMeta } from "./companySections";
import { useCompanyWorkspace } from "./CompanyWorkspace";

const EMPTY_DOCUMENT = {
  title: "",
  document_type: "",
  reference_number: "",
  issue_date: "",
  expiry_date: "",
  file_url: "",
  notes: "",
};

const CompanyDocumentsPage = () => {
  const { company } = useCompanyWorkspace();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, data: EMPTY_DOCUMENT });
  const [message, setMessage] = useState({ text: "", severity: "success" });
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await notebookService.getCompanyDocuments(company.id);
      setDocuments(data);
    } catch (error) {
      setMessage({ text: `Errore caricamento documenti: ${error.message}`, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [company.id]);

  const handleOpenModal = (document = null) => {
    setModal({
      open: true,
      data: document ? { ...EMPTY_DOCUMENT, ...document } : EMPTY_DOCUMENT,
    });
  };

  const handleCloseModal = () => {
    setModal({ open: false, data: EMPTY_DOCUMENT });
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
      await notebookService.saveCompanyDocument({
        ...modal.data,
        company_id: company.id,
        title: modal.data.title.trim(),
      });
      setMessage({
        text: modal.data.id ? "Documento aggiornato." : "Documento aggiunto.",
        severity: "success",
      });
      setOpenSnackbar(true);
      handleCloseModal();
      fetchDocuments();
    } catch (error) {
      setMessage({ text: `Errore salvataggio documento: ${error.message}`, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (document) => {
    if (!window.confirm(`Eliminare il documento ${document.title}?`)) return;

    try {
      await notebookService.deleteCompanyDocument(document.id);
      setMessage({ text: "Documento eliminato.", severity: "success" });
      setOpenSnackbar(true);
      fetchDocuments();
    } catch (error) {
      setMessage({ text: `Errore eliminazione documento: ${error.message}`, severity: "error" });
      setOpenSnackbar(true);
    }
  };

  if (loading) {
    return <Typography>Caricamento documenti...</Typography>;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {sectionMeta.documents.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {sectionMeta.documents.description}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
          Nuovo documento
        </Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Titolo</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Riferimento</TableCell>
              <TableCell>Emissione</TableCell>
              <TableCell>Scadenza</TableCell>
              <TableCell>Allegato</TableCell>
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell sx={{ fontWeight: "medium" }}>{document.title}</TableCell>
                <TableCell>{document.document_type || "-"}</TableCell>
                <TableCell>{document.reference_number || "-"}</TableCell>
                <TableCell>{document.issue_date || "-"}</TableCell>
                <TableCell>{document.expiry_date || "-"}</TableCell>
                <TableCell>
                  {document.file_url ? (
                    <Link href={document.file_url} target="_blank" rel="noreferrer">
                      Apri link
                    </Link>
                  ) : "-"}
                </TableCell>
                <TableCell align="right">
                  <IconButton color="primary" onClick={() => handleOpenModal(document)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(document)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  Nessun documento registrato.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={modal.open} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{modal.data.id ? "Modifica documento" : "Nuovo documento"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                required
                name="title"
                label="Titolo"
                value={modal.data.title}
                onChange={handleChange}
                fullWidth
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  name="document_type"
                  label="Tipo documento"
                  value={modal.data.document_type}
                  onChange={handleChange}
                  fullWidth
                />
                <TextField
                  name="reference_number"
                  label="Numero riferimento"
                  value={modal.data.reference_number}
                  onChange={handleChange}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  type="date"
                  name="issue_date"
                  label="Data emissione"
                  value={modal.data.issue_date}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="date"
                  name="expiry_date"
                  label="Data scadenza"
                  value={modal.data.expiry_date}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
              <TextField
                name="file_url"
                label="URL allegato"
                value={modal.data.file_url}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                name="notes"
                label="Note"
                value={modal.data.notes}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Annulla</Button>
            <Button variant="contained" type="submit" disabled={saving || !modal.data.title.trim()}>
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

export default CompanyDocumentsPage;
