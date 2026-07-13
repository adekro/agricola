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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  const [statusFilter, setStatusFilter] = useState("Tutti");
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

  const statuses = [
    "Tutti",
    ...new Set(
      products
        .map((p) => p.stato_amministrativo)
        .filter(Boolean)
        .sort(),
    ),
  ];

  const filteredProducts = products.filter((p) => {
    const matchesFilter = Object.values(p).some(
      (val) =>
        val && val.toString().toLowerCase().includes(filter.toLowerCase()),
    );
    const matchesStatus =
      statusFilter === "Tutti" || p.stato_amministrativo === statusFilter;
    return matchesFilter && matchesStatus;
  });

  const isActive = (status = "") =>
    status.startsWith("Autorizzato") ||
    status.startsWith("Ri-registrato") ||
    status.startsWith("Rinnovato");

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5">Prodotti Fitosanitari</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button variant="contained" onClick={handleUpdate} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Aggiorna Dati"}
          </Button>
        </Box>
        {lastFile && (
          <Chip label={`File: ${lastFile}`} color="info" variant="outlined" />
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          sx={{ flexGrow: 1 }}
          variant="outlined"
          placeholder="Cerca prodotti..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="status-filter-label">Stato</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={statusFilter}
            label="Stato"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statuses.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer
        component={Paper}
        sx={{ maxHeight: "70vh", overflowX: "auto" }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 150 }}>Nome Prodotto</TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", md: "table-cell" },
                  minWidth: 150,
                }}
              >
                Sostanza Attiva
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", sm: "table-cell" },
                  minWidth: 150,
                }}
              >
                Ragione Sociale
              </TableCell>
              <TableCell sx={{ minWidth: 80 }}>N° Reg.</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                Data Reg.
              </TableCell>
              <TableCell>Etichetta</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.slice(0, 100).map((p, idx) => (
              <TableRow key={idx}>
                <TableCell style={{ fontWeight: "bold" }}>
                  {p.denominazione_prodotto || p.NOME_PRODOTTO || "-"}
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  {p.sostanze_attive || p.SOSTANZA_ATTIVA || "-"}
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {p.ragione_sociale || p.IMPRESA || "-"}
                </TableCell>
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
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  {p.data_registrazione || "-"}
                </TableCell>
                <TableCell>
                  {isActive(p.stato_amministrativo) &&
                    (p.num_registrazione || p.NUMERO_REGISTRAZIONE) && (
                      <Button
                        component="a"
                        href={`/api/fitosanitari-label?registration=${encodeURIComponent(
                          p.num_registrazione || p.NUMERO_REGISTRAZIONE,
                        )}`}
                        size="small"
                        variant="outlined"
                      >
                        PDF
                      </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
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
