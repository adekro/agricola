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
} from "@mui/material";
import { parseExcelRows } from "../../services/catastoService";

const EvidenziaMappaliModal = ({ open, onClose, onNavigateToMap }) => {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    setError("");
  }, []);

  const handleAvanti = useCallback(() => {
    if (!text.trim()) {
      setError("Incolla almeno una riga con i dati catastali.");
      return;
    }

    const rows = parseExcelRows(text);

    if (rows.length === 0) {
      setError(
        "Nessuna riga valida trovata. Assicurati che ogni riga contenga Comune, Foglio e Mappale separati da tab, punto e virgola o virgola.",
      );
      return;
    }

    onNavigateToMap(rows);
    setText("");
    setError("");
  }, [text, onNavigateToMap]);

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
          Incolla le righe copiate da Excel (Comune / Codice Catastale, Foglio,
          Mappale). Ogni riga deve contenere i tre valori separati da tab, punto
          e virgola o virgola.
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 1, display: "block" }}
        >
          Esempio: STRADELLA 2 745
        </Typography>
        <TextField
          autoFocus
          multiline
          rows={12}
          fullWidth
          placeholder={
            "STRADELLA\t2\t745\nSTRADELLA\t2\t746\nSTRADELLA\t3\t100"
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
          disabled={!text.trim()}
          sx={{ fontWeight: 700 }}
        >
          Avanti
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EvidenziaMappaliModal;
