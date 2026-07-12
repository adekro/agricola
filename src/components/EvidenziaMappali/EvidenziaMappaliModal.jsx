import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { parseExcelRows } from "../../services/catastoService";

const EvidenziaMappaliModal = ({ open, onClose, onNavigateToMap, companies = [] }) => {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [campaignYear, setCampaignYear] = useState(new Date().getFullYear());

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    setError("");
  }, []);

  const handleAvanti = useCallback(() => {
    if (!companyId) {
      setError("Seleziona l'azienda destinataria.");
      return;
    }
    if (!text.trim()) {
      setError("Incolla almeno una riga con i dati catastali.");
      return;
    }

    const rows = parseExcelRows(text);

    if (rows.length === 0 || rows.some((row) => !row.valid)) {
      setError(
        "Sono presenti righe non valide. Servono Comune, Provincia, Foglio, Mappale, Tipo utilizzo e Superficie.",
      );
      return;
    }

    onNavigateToMap({
      companyId,
      company: companies.find((item) => item.id === companyId),
      campaignYear: Number(campaignYear),
      rows,
    });
    setText("");
    setError("");
  }, [campaignYear, companies, companyId, text, onNavigateToMap]);

  const handleClose = useCallback(() => {
    setText("");
    setError("");
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        handleAvanti();
      }
    },
    [handleAvanti],
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1.25rem" }}>
        Evidenzia Mappali
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Seleziona azienda e anno, quindi incolla le sei colonne copiate da Excel.
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <FormControl fullWidth required>
            <InputLabel id="import-company-label">Azienda</InputLabel>
            <Select labelId="import-company-label" label="Azienda" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField required type="number" label="Anno campagna" value={campaignYear} onChange={(e) => setCampaignYear(e.target.value)} inputProps={{ min: 1900, max: 2200 }} />
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 1, display: "block" }}
        >
          Colonne: COMUNE, PROV, FOGLIO, MAPPALE, TIPO UTILIZZO, SUPERFICIE
        </Typography>
        <TextField
          autoFocus
          multiline
          rows={12}
          fullWidth
          placeholder={
            "STRADELLA\tPV\t3\t1\t870-011-000-000 ORZO - FAVE, SEMI, GRANELLA\t9,1337"
          }
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              fontFamily: "monospace",
              fontSize: "0.9rem",
            },
          }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Premi Ctrl+Enter per procedere rapidamente.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit">
          Annulla
        </Button>
        <Button
          onClick={handleAvanti}
          variant="contained"
          color="primary"
          disabled={!text.trim() || !companyId}
          sx={{ fontWeight: 700 }}
        >
          Avanti
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EvidenziaMappaliModal;
