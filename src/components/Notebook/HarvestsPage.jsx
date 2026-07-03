import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { notebookService } from "../../services/notebookService";
import { categoryLabels, contactCategories } from "./companySections";

const DESTINATION_CATEGORIES = contactCategories.network;

const EMPTY_FILTERS = {
  company_id: "",
  farmland_id: "",
  crop: "",
  startDate: "",
  endDate: "",
};

const EMPTY_DESTINATION = {
  id: "",
  contact_id: "",
  quantity: "",
  destination_type: "Cliente finale",
  notes: "",
};

const EMPTY_BATCH = {
  id: "",
  lot_code: "",
  quantity: "",
  unit_of_measure: "kg",
  quality: "",
  notes: "",
  destinations: [{ ...EMPTY_DESTINATION }],
};

const EMPTY_FORM = {
  id: "",
  harvest_date: new Date().toISOString().slice(0, 10),
  farmland_id: "",
  company_id: "",
  crop: "",
  notes: "",
  batches: [{ ...EMPTY_BATCH }],
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("it-IT");
};

const buildLotCode = ({ companyName, harvestDate, farmlandName, batchIndex }) => {
  const dateToken = (harvestDate || "").replaceAll("-", "") || "ND";
  const companyToken = (companyName || "AZ")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4) || "AZ";
  const farmlandToken = (farmlandName || "CAMPO")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4) || "CAMPO";
  return `${companyToken}-${dateToken}-${farmlandToken}-${String(batchIndex + 1).padStart(2, "0")}`;
};

const normalizeName = (value = "") => value.trim().toLowerCase();

const HarvestsPage = () => {
  const [harvests, setHarvests] = useState([]);
  const [farmlands, setFarmlands] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [contactsByCompany, setContactsByCompany] = useState({});
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, data: EMPTY_FORM });
  const [message, setMessage] = useState({ text: "", severity: "success" });
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const farmlandMap = useMemo(
    () => Object.fromEntries(farmlands.map((item) => [item.id, item])),
    [farmlands],
  );

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((item) => [item.id, item])),
    [companies],
  );

  const findCompanyForFarmland = (farmland) =>
    companies.find(
      (company) => normalizeName(company.name) === normalizeName(farmland?.ownerDisplayName),
    ) || null;

  const fetchHarvests = async (activeFilters = filters) => {
    setLoading(true);
    try {
      const items = await notebookService.getHarvests(activeFilters);
      setHarvests(items);
    } catch (error) {
      setMessage({ text: `Errore caricamento raccolte: ${error.message}`, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        const [farmlandItems, companyItems, harvestItems] = await Promise.all([
          notebookService.getFarmlands(),
          notebookService.getCompanies(),
          notebookService.getHarvests(),
        ]);
        setFarmlands(farmlandItems || []);
        setCompanies(companyItems || []);
        setHarvests(harvestItems || []);
      } catch (error) {
        setMessage({ text: `Errore inizializzazione raccolte: ${error.message}`, severity: "error" });
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const ensureCompanyContacts = async (companyId) => {
    if (!companyId || contactsByCompany[companyId]) return;
    const results = await Promise.all(
      DESTINATION_CATEGORIES.map((category) =>
        notebookService.getCompanyContacts(companyId, category),
      ),
    );
    setContactsByCompany((prev) => ({ ...prev, [companyId]: results.flat() }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = async () => {
    fetchHarvests(filters);
  };

  const handleResetFilters = async () => {
    setFilters(EMPTY_FILTERS);
    fetchHarvests(EMPTY_FILTERS);
  };

  const handleOpenModal = async (harvest = null) => {
    if (!harvest) {
      setModal({ open: true, data: { ...EMPTY_FORM, batches: [{ ...EMPTY_BATCH, destinations: [{ ...EMPTY_DESTINATION }] }] } });
      return;
    }

    try {
      const [fullHarvest, batches] = await Promise.all([
        notebookService.getHarvest(harvest.id),
        notebookService.getHarvestBatches(harvest.id),
      ]);
      const batchesWithDestinations = await Promise.all(
        batches.map(async (batch) => ({
          ...batch,
          quantity: batch.quantity ?? "",
          destinations: await notebookService.getHarvestDestinations(batch.id),
        })),
      );
      await ensureCompanyContacts(fullHarvest.company_id);
      setModal({
        open: true,
        data: {
          ...EMPTY_FORM,
          ...fullHarvest,
          harvest_date: (fullHarvest.harvest_date || "").slice(0, 10),
          batches: batchesWithDestinations.length
            ? batchesWithDestinations
            : [{ ...EMPTY_BATCH, destinations: [{ ...EMPTY_DESTINATION }] }],
        },
      });
    } catch (error) {
      setMessage({ text: `Errore caricamento raccolta: ${error.message}`, severity: "error" });
      setOpenSnackbar(true);
    }
  };

  const handleCloseModal = () => {
    setModal({ open: false, data: EMPTY_FORM });
  };

  const updateModalData = (field, value) => {
    setModal((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value,
      },
    }));
  };

  const handleFarmlandChange = async (event) => {
    const farmlandId = event.target.value;
    const farmland = farmlandMap[farmlandId];
    const linkedCompany = findCompanyForFarmland(farmland);
    updateModalData("farmland_id", farmlandId);
    updateModalData("company_id", linkedCompany?.id || "");
    updateModalData("crop", farmland?.currentCrop || modal.data.crop);
    if (linkedCompany?.id) {
      await ensureCompanyContacts(linkedCompany.id);
    }
  };

  const updateBatch = (index, field, value) => {
    setModal((prev) => {
      const nextBatches = prev.data.batches.map((batch, batchIndex) => {
        if (batchIndex !== index) return batch;
        return { ...batch, [field]: value };
      });
      return { ...prev, data: { ...prev.data, batches: nextBatches } };
    });
  };

  const addBatch = () => {
    setModal((prev) => {
      const farmland = farmlandMap[prev.data.farmland_id];
      const company = companyMap[prev.data.company_id];
      const nextIndex = prev.data.batches.length;
      return {
        ...prev,
        data: {
          ...prev.data,
          batches: [
            ...prev.data.batches,
            {
              ...EMPTY_BATCH,
              lot_code: buildLotCode({
                companyName: company?.name,
                harvestDate: prev.data.harvest_date,
                farmlandName: farmland?.type,
                batchIndex: nextIndex,
              }),
              destinations: [{ ...EMPTY_DESTINATION }],
            },
          ],
        },
      };
    });
  };

  const removeBatch = (index) => {
    setModal((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        batches: prev.data.batches.filter((_, batchIndex) => batchIndex !== index),
      },
    }));
  };

  const addDestination = (batchIndex) => {
    setModal((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        batches: prev.data.batches.map((batch, index) =>
          index === batchIndex
            ? {
                ...batch,
                destinations: [...(batch.destinations || []), { ...EMPTY_DESTINATION }],
              }
            : batch,
        ),
      },
    }));
  };

  const updateDestination = (batchIndex, destinationIndex, field, value) => {
    setModal((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        batches: prev.data.batches.map((batch, index) =>
          index === batchIndex
            ? {
                ...batch,
                destinations: (batch.destinations || []).map((destination, idx) =>
                  idx === destinationIndex ? { ...destination, [field]: value } : destination,
                ),
              }
            : batch,
        ),
      },
    }));
  };

  const removeDestination = (batchIndex, destinationIndex) => {
    setModal((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        batches: prev.data.batches.map((batch, index) =>
          index === batchIndex
            ? {
                ...batch,
                destinations: (batch.destinations || []).filter((_, idx) => idx !== destinationIndex),
              }
            : batch,
        ),
      },
    }));
  };

  const normalizeBatches = (data) => {
    const farmland = farmlandMap[data.farmland_id];
    const company = companyMap[data.company_id];
    return data.batches.map((batch, index) => ({
      ...batch,
      lot_code:
        batch.lot_code?.trim() ||
        buildLotCode({
          companyName: company?.name,
          harvestDate: data.harvest_date,
          farmlandName: farmland?.type,
          batchIndex: index,
        }),
      quantity: Number(batch.quantity || 0),
      destinations: (batch.destinations || []).filter(
        (destination) => destination.contact_id && destination.quantity !== "",
      ),
    }));
  };

  const validateForm = (data) => {
    if (!data.harvest_date || !data.farmland_id || !data.crop.trim()) {
      return "Data, appezzamento e coltura sono obbligatori.";
    }
    if (!data.batches.length) {
      return "Inserisci almeno un lotto di produzione.";
    }
    for (const batch of data.batches) {
      if (batch.quantity === "" || !batch.quality?.trim()) {
        return "Ogni lotto deve avere quantita e qualita.";
      }
      for (const destination of batch.destinations || []) {
        if (!destination.contact_id || destination.quantity === "") {
          return "Ogni destinazione deve avere cliente e quantita.";
        }
      }
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedBatches = normalizeBatches(modal.data);
    const validationError = validateForm({ ...modal.data, batches: normalizedBatches });
    if (validationError) {
      setMessage({ text: validationError, severity: "warning" });
      setOpenSnackbar(true);
      return;
    }

    setSaving(true);
    try {
      const savedHarvest = await notebookService.saveHarvest({
        id: modal.data.id || undefined,
        harvest_date: modal.data.harvest_date,
        farmland_id: modal.data.farmland_id,
        company_id: modal.data.company_id,
        crop: modal.data.crop.trim(),
        notes: modal.data.notes,
      });

      const existingBatches = modal.data.id
        ? await notebookService.getHarvestBatches(modal.data.id)
        : [];
      const savedBatchIds = [];

      for (const batch of normalizedBatches) {
        const savedBatch = await notebookService.saveHarvestBatch({
          id: batch.id || undefined,
          harvest_id: savedHarvest.id,
          lot_code: batch.lot_code,
          quantity: batch.quantity,
          unit_of_measure: batch.unit_of_measure,
          quality: batch.quality.trim(),
          notes: batch.notes,
        });
        savedBatchIds.push(savedBatch.id);

        const existingDestinations = batch.id
          ? await notebookService.getHarvestDestinations(batch.id)
          : [];
        const savedDestinationIds = [];

        for (const destination of batch.destinations) {
          const savedDestination = await notebookService.saveHarvestDestination({
            id: destination.id || undefined,
            harvest_batch_id: savedBatch.id,
            contact_id: destination.contact_id,
            quantity: Number(destination.quantity || 0),
            destination_type: destination.destination_type,
            notes: destination.notes,
          });
          savedDestinationIds.push(savedDestination.id);
        }

        await Promise.all(
          existingDestinations
            .filter((destination) => !savedDestinationIds.includes(destination.id))
            .map((destination) => notebookService.deleteHarvestDestination(destination.id)),
        );
      }

      await Promise.all(
        existingBatches
          .filter((batch) => !savedBatchIds.includes(batch.id))
          .map((batch) => notebookService.deleteHarvestBatch(batch.id)),
      );

      setMessage({
        text: modal.data.id ? "Raccolta aggiornata." : "Raccolta registrata.",
        severity: "success",
      });
      setOpenSnackbar(true);
      handleCloseModal();
      fetchHarvests(filters);
    } catch (error) {
      setMessage({ text: `Errore salvataggio raccolta: ${error.message}`, severity: "error" });
      setOpenSnackbar(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (harvest) => {
    if (!window.confirm(`Eliminare la raccolta del ${formatDate(harvest.harvest_date)}?`)) return;
    try {
      await notebookService.deleteHarvest(harvest.id);
      setMessage({ text: "Raccolta eliminata.", severity: "success" });
      setOpenSnackbar(true);
      fetchHarvests(filters);
    } catch (error) {
      setMessage({ text: `Errore eliminazione raccolta: ${error.message}`, severity: "error" });
      setOpenSnackbar(true);
    }
  };

  const companyContacts = contactsByCompany[modal.data.company_id] || [];

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Raccolte
            </Typography>
            <Typography color="text.secondary">
              Registro dedicato delle raccolte, lotti di produzione e destinazioni finali.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
            Nuova raccolta
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField select name="company_id" label="Azienda" value={filters.company_id} onChange={handleFilterChange} fullWidth>
              <MenuItem value="">Tutte</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select name="farmland_id" label="Appezzamento" value={filters.farmland_id} onChange={handleFilterChange} fullWidth>
              <MenuItem value="">Tutti</MenuItem>
              {farmlands.map((farmland) => (
                <MenuItem key={farmland.id} value={farmland.id}>
                  {farmland.type}
                </MenuItem>
              ))}
            </TextField>
            <TextField name="crop" label="Coltura" value={filters.crop} onChange={handleFilterChange} fullWidth />
            <TextField name="startDate" label="Dal" type="date" value={filters.startDate} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} />
            <TextField name="endDate" label="Al" type="date" value={filters.endDate} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={handleApplyFilters}>Filtra</Button>
              <Button onClick={handleResetFilters}>Reset</Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Azienda</TableCell>
                  <TableCell>Appezzamento</TableCell>
                  <TableCell>Coltura</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell align="right">Azioni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && harvests.map((harvest) => (
                  <TableRow key={harvest.id}>
                    <TableCell>{formatDate(harvest.harvest_date)}</TableCell>
                    <TableCell>{harvest.company?.name || "-"}</TableCell>
                    <TableCell>{harvest.farmland?.type || "-"}</TableCell>
                    <TableCell>{harvest.crop || "-"}</TableCell>
                    <TableCell>{harvest.notes || "-"}</TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleOpenModal(harvest)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(harvest)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && harvests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      Nessuna raccolta registrata.
                    </TableCell>
                  </TableRow>
                ) : null}
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      Caricamento raccolte...
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      <Dialog open={modal.open} onClose={handleCloseModal} fullWidth maxWidth="lg">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{modal.data.id ? "Modifica raccolta" : "Nuova raccolta"}</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  required
                  name="harvest_date"
                  label="Data raccolta"
                  type="date"
                  value={modal.data.harvest_date}
                  onChange={(event) => updateModalData("harvest_date", event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  select
                  required
                  name="farmland_id"
                  label="Appezzamento"
                  value={modal.data.farmland_id}
                  onChange={handleFarmlandChange}
                  fullWidth
                >
                  {farmlands.map((farmland) => (
                    <MenuItem key={farmland.id} value={farmland.id}>
                      {farmland.type}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  name="crop"
                  label="Coltura"
                  value={modal.data.crop}
                  onChange={(event) => updateModalData("crop", event.target.value)}
                  required
                  fullWidth
                />
              </Stack>

              <TextField
                name="notes"
                label="Note raccolta"
                value={modal.data.notes}
                onChange={(event) => updateModalData("notes", event.target.value)}
                multiline
                rows={3}
                fullWidth
              />

              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Lotti produzione</Typography>
                  <Button startIcon={<AddIcon />} onClick={addBatch}>
                    Aggiungi lotto
                  </Button>
                </Stack>

                {modal.data.batches.map((batch, batchIndex) => (
                  <Paper key={batch.id || `batch-${batchIndex}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Stack spacing={2}>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                        <TextField
                          label="Codice lotto"
                          value={batch.lot_code}
                          onChange={(event) => updateBatch(batchIndex, "lot_code", event.target.value)}
                          fullWidth
                        />
                        <TextField
                          required
                          type="number"
                          label="Quantita"
                          value={batch.quantity}
                          onChange={(event) => updateBatch(batchIndex, "quantity", event.target.value)}
                          fullWidth
                        />
                        <TextField
                          label="Unita di misura"
                          value={batch.unit_of_measure}
                          onChange={(event) => updateBatch(batchIndex, "unit_of_measure", event.target.value)}
                          fullWidth
                        />
                        <TextField
                          required
                          label="Qualita"
                          value={batch.quality}
                          onChange={(event) => updateBatch(batchIndex, "quality", event.target.value)}
                          fullWidth
                        />
                        <IconButton color="error" onClick={() => removeBatch(batchIndex)} disabled={modal.data.batches.length === 1}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                      <TextField
                        label="Note lotto"
                        value={batch.notes}
                        onChange={(event) => updateBatch(batchIndex, "notes", event.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                      />

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1">Destinazioni prodotto</Typography>
                        <Button startIcon={<LocalShippingIcon />} onClick={() => addDestination(batchIndex)}>
                          Aggiungi destinazione
                        </Button>
                      </Stack>

                      {(batch.destinations || []).map((destination, destinationIndex) => (
                        <Stack key={destination.id || `destination-${destinationIndex}`} direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                          <TextField
                            select
                            required
                            label="Cliente finale"
                            value={destination.contact_id}
                            onChange={(event) => updateDestination(batchIndex, destinationIndex, "contact_id", event.target.value)}
                            fullWidth
                          >
                            {companyContacts.map((contact) => (
                              <MenuItem key={contact.id} value={contact.id}>
                                {contact.name} ({categoryLabels[contact.category]})
                              </MenuItem>
                            ))}
                          </TextField>
                          <TextField
                            required
                            type="number"
                            label="Quantita destinata"
                            value={destination.quantity}
                            onChange={(event) => updateDestination(batchIndex, destinationIndex, "quantity", event.target.value)}
                            fullWidth
                          />
                          <TextField
                            label="Destinazione"
                            value={destination.destination_type}
                            onChange={(event) => updateDestination(batchIndex, destinationIndex, "destination_type", event.target.value)}
                            fullWidth
                          />
                          <TextField
                            label="Note"
                            value={destination.notes}
                            onChange={(event) => updateDestination(batchIndex, destinationIndex, "notes", event.target.value)}
                            fullWidth
                          />
                          <IconButton color="error" onClick={() => removeDestination(batchIndex, destinationIndex)} disabled={(batch.destinations || []).length === 1}>
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Annulla</Button>
            <Button variant="contained" type="submit" disabled={saving}>
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

export default HarvestsPage;
