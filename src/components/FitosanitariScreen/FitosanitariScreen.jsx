import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  TextField,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  openDB,
  saveProducts,
  getProducts,
  getLastUpdated,
} from "../../lib/indexedDB";

const FitosanitariScreen = () => {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFile, setLastFile] = useState(null);

  const loadLocalData = useCallback(async () => {
    const data = await getProducts();
    const meta = await getLastUpdated();
    setProducts(data || []);
    setLastFile(meta?.value || "Nessun dato caricato");
  }, []);

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  const handleUpdate = async () => {
    setLoading(true);
    let found = false;
    let daysToTry = 10;
    let date = new Date();

    while (!found && daysToTry > 0) {
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
      const fileName = `PROD_FTS_6_${dateStr}.json`;
      // Utilizziamo il proxy configurato in vite.config.js
      const url = `/fitosanitari-api/sites/default/files/opendata/${fileName}`;

      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          // Assuming the actual products are in a specific property of the JSON
          const items = Array.isArray(data) ? data : data.products || [];
          await saveProducts(items, fileName);
          setProducts(items);
          setLastFile(fileName);
          found = true;
        }
      } catch (err) {
        console.warn(`Tentativo fallito per ${fileName}`);
      }
      date.setDate(date.getDate() - 1);
      daysToTry--;
    }

    if (!found) alert("Impossibile trovare un file JSON recente da scaricare.");
    setLoading(false);
  };

  const filteredProducts = products.filter((p) =>
    Object.values(p).some(
      (val) =>
        val && val.toString().toLowerCase().includes(filter.toLowerCase()),
    ),
  );

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h5">Prodotti Fitosanitari</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {lastFile && (
            <Chip label={`File: ${lastFile}`} color="info" variant="outlined" />
          )}
          <Button variant="contained" onClick={handleUpdate} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Aggiorna Dati"}
          </Button>
        </Box>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Cerca prodotti..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <TableContainer component={Paper} sx={{ maxHeight: "70vh" }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Nome Prodotto</TableCell>
              <TableCell>Sostanza Attiva</TableCell>
              <TableCell>Ragione Sociale</TableCell>
              <TableCell>N° Reg.</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell>Data Reg.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.slice(0, 100).map((p, idx) => (
              <TableRow key={idx}>
                <TableCell style={{ fontWeight: "bold" }}>
                  {p.denominazione_prodotto || p.NOME_PRODOTTO || "-"}
                </TableCell>
                <TableCell>
                  {p.sostanze_attive || p.SOSTANZA_ATTIVA || "-"}
                </TableCell>
                <TableCell>{p.ragione_sociale || p.IMPRESA || "-"}</TableCell>
                <TableCell>
                  {p.num_registrazione || p.NUMERO_REGISTRAZIONE || "-"}
                </TableCell>
                <TableCell>
                  <Chip
                    label={p.stato_amministrativo || "-"}
                    size="small"
                    color={
                      p.stato_amministrativo === "In commercio"
                        ? "success"
                        : "default"
                    }
                  />
                </TableCell>
                <TableCell>{p.data_registrazione || "-"}</TableCell>
              </TableRow>
            ))}
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Nessun dato disponibile
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default FitosanitariScreen;
