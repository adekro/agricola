import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Divider,
  Stack,
  Alert,
  Snackbar,
} from "@mui/material";
import { notebookService } from "../../services/notebookService";

const CompanyProfile = () => {
  const [company, setCompany] = useState({
    name: "",
    vat_number: "",
    owner_name: "",
    authorized_operators: [],
  });
  const [operatorInput, setOperatorInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", severity: "success" });
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const companies = await notebookService.getCompanies();
        if (companies && companies.length > 0) {
          setCompany(companies[0]);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompany((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddOperator = () => {
    if (operatorInput.trim()) {
      setCompany((prev) => ({
        ...prev,
        authorized_operators: [...(prev.authorized_operators || []), operatorInput.trim()],
      }));
      setOperatorInput("");
    }
  };

  const handleRemoveOperator = (index) => {
    setCompany((prev) => ({
      ...prev,
      authorized_operators: prev.authorized_operators.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const saved = await notebookService.saveCompany(company);
      setCompany(saved);
      setMessage({ text: "Dati azienda salvati con successo!", severity: "success" });
      setOpenSnackbar(true);
    } catch (error) {
      setMessage({ text: "Errore durante il salvataggio: " + error.message, severity: "error" });
      setOpenSnackbar(true);
    }
  };

  if (loading) return <Typography>Caricamento...</Typography>;

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", color: "primary.main" }}>
          Anagrafica Azienda
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Configura i dati della tua azienda agricola per la conformità al Quaderno di Campagna.
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
                    key={index}
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
                      ×
                    </Button>
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{ alignSelf: "flex-end", px: 4 }}
            >
              Salva Modifiche
            </Button>
          </Stack>
        </form>
      </Paper>

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
