import React, { useState, useEffect, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { notebookService } from "../../services/notebookService";

const EMPTY_COMPANY = {
  name: "",
  vat_number: "",
  owner_name: "",
  authorized_operators: [],
};

const createEmptyCompany = () => ({
  ...EMPTY_COMPANY,
  authorized_operators: [],
});

const CompanyProfile = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [company, setCompany] = useState(createEmptyCompany());
  const [operatorInput, setOperatorInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", severity: "success" });
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await notebookService.getCompanies();
        const nextCompanies = data || [];
        setCompanies(nextCompanies);

        if (nextCompanies.length > 0) {
          setSelectedCompanyId(nextCompanies[0].id);
          setCompany({
            ...createEmptyCompany(),
            ...nextCompanies[0],
            authorized_operators: nextCompanies[0].authorized_operators || [],
          });
        } else {
          setSelectedCompanyId(null);
          setCompany(createEmptyCompany());
        }
      } catch (error) {
        setMessage({ text: "Errore caricamento aziende: " + error.message, severity: "error" });
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const isNewCompany = useMemo(() => !company.id, [company.id]);

  const selectCompany = (selected) => {
    setSelectedCompanyId(selected.id);
    setCompany({
      ...createEmptyCompany(),
      ...selected,
      authorized_operators: selected.authorized_operators || [],
    });
    setOperatorInput("");
  };

  const handleNewCompany = () => {
    setSelectedCompanyId(null);
    setCompany(createEmptyCompany());
    setOperatorInput("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompany((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddOperator = () => {
    const nextOperator = operatorInput.trim();
    if (!nextOperator) {
      return;
    }

    setCompany((prev) => ({
      ...prev,
      authorized_operators: [...(prev.authorized_operators || []), nextOperator],
    }));
    setOperatorInput("");
  };

  const handleRemoveOperator = (index) => {
    setCompany((prev) => ({
      ...prev,
      authorized_operators: prev.authorized_operators.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const saved = await notebookService.saveCompany({
        ...company,
        name: company.name.trim(),
      });

      setCompanies((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        const next = exists
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [...prev, saved];

        return next.sort((left, right) => left.name.localeCompare(right.name));
      });
      setSelectedCompanyId(saved.id);
      setCompany({
        ...createEmptyCompany(),
        ...saved,
        authorized_operators: saved.authorized_operators || [],
      });
      setMessage({
        text: isNewCompany ? "Azienda inserita con successo!" : "Azienda aggiornata con successo!",
        severity: "success",
      });
      setOpenSnackbar(true);
    } catch (error) {
      setMessage({ text: "Errore durante il salvataggio: " + error.message, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!company.id) {
      handleNewCompany();
      return;
    }

    setSaving(true);
    try {
      await notebookService.deleteCompany(company.id);
      const remainingCompanies = companies.filter((item) => item.id !== company.id);
      setCompanies(remainingCompanies);

      if (remainingCompanies.length > 0) {
        selectCompany(remainingCompanies[0]);
      } else {
        handleNewCompany();
      }

      setMessage({ text: "Azienda eliminata con successo!", severity: "success" });
      setOpenSnackbar(true);
    } catch (error) {
      setMessage({ text: "Errore durante l'eliminazione: " + error.message, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Typography>Caricamento...</Typography>;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", color: "primary.main" }}>
        Anagrafica Aziende
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Gestisci l'elenco delle aziende agricole seguite, con inserimento e modifica anagrafica.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Aziende</Typography>
            <Button variant="outlined" onClick={handleNewCompany}>
              Nuova
            </Button>
          </Stack>

          {companies.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nessuna azienda inserita.
            </Typography>
          ) : (
            <List disablePadding>
              {companies.map((item) => (
                <ListItemButton
                  key={item.id}
                  selected={selectedCompanyId === item.id}
                  onClick={() => selectCompany(item)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={item.name}
                    secondary={item.owner_name || item.vat_number || "Anagrafica incompleta"}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>

        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            {isNewCompany ? "Nuova Azienda" : "Modifica Azienda"}
          </Typography>

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                label="Nome Azienda"
                name="name"
                value={company.name}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                label="Partita IVA"
                name="vat_number"
                value={company.vat_number}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                label="Titolare / Rappresentante Legale"
                name="owner_name"
                value={company.owner_name}
                onChange={handleChange}
                fullWidth
              />

              <Divider />

              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "medium" }}>
                  Operatori Autorizzati
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
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
                  {company.authorized_operators?.map((op, index) => (
                    <Paper
                      key={`${op}-${index}`}
                      variant="outlined"
                      sx={{
                        px: 1,
                        py: 0.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        bgcolor: "grey.50",
                      }}
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
              </Box>

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                {!isNewCompany && (
                  <Button color="error" variant="outlined" onClick={handleDelete} disabled={saving}>
                    Elimina
                  </Button>
                )}
                <Button variant="contained" type="submit" disabled={saving || !company.name.trim()}>
                  {isNewCompany ? "Inserisci Azienda" : "Salva Modifiche"}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Paper>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert severity={message.severity} onClose={() => setOpenSnackbar(false)}>
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CompanyProfile;
