import {
  Button,
  TextField,
  FormControl,
  Autocomplete,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  Typography,
  Slider,
  Box,
  Divider,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";
import { useState, useCallback, useMemo, useEffect } from "react";
import classes from "./FarmlandScreen.module.scss";
import DrawableMap from "../WorldMap/DrawableMap/DrawableMap";
import { useFormik } from "formik";
import useFarmlands from "../../hooks/useFarmlands";
import Modal from "../UI/Modal/Modal";
import WorldMap from "../WorldMap/WorldMap";
import { useOutletContext, useParams } from "react-router-dom";
import { getEnabledMapProviders } from "../../config/mapProviders";
import { getEnabledSatelliteLayers } from "../../config/satelliteLayers";
import { getEnabledCadastralLayers } from "../../config/cadastralLayers";
import SatelliteIndices from "./SatelliteIndices/SatelliteIndices";
import { satelliteService } from "../../services/satelliteService";
import { notebookService } from "../../services/notebookService";
import { useCadastralWmsError } from "../../hooks/useCadastralWmsError";

const normalizeCompanyName = (name = "") => name.trim().toLowerCase();
const filterCompanyOptions = createFilterOptions();

const FarmlandScreen = (props) => {
  const { id } = useParams();
  const context = useOutletContext() || {};

  const onClose = props.onClose || context.onClose;
  const farmlandId = props.farmlandId || id;
  const onCreate = props.onCreate || context.onCreate;
  const onUpdate = props.onUpdate || context.onUpdate;
  const onDelete = props.onDelete || context.onDelete;

  const farmlands = context.farmlands || [];
  const isNew = farmlandId === "new";
  const farmland =
    props.farmland ||
    (isNew ? null : farmlands.find((farm) => farm.id === farmlandId));

  const [open, setOpen] = useState(true);
  const [area, setArea] = useState();
  const [perimeter, setPerimeter] = useState();
  const [coordinates, setCoordinates] = useState();
  const [error, setError] = useState();
  const [owner, setOwner] = useState("");
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [companyDraft, setCompanyDraft] = useState({ name: "" });
  const [companyError, setCompanyError] = useState("");
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const { companies, createCompany } = useFarmlands();
  const [isDelFarmland, setIsDelFarmland] = useState(false);

  const [selectedMapProvider, setSelectedMapProvider] = useState("osm");
  const [selectedSatelliteLayer, setSelectedSatelliteLayer] = useState("none");
  const [satelliteOpacity, setSatelliteOpacity] = useState(0.75);
  const [selectedCadastralLayer, setSelectedCadastralLayer] = useState("none");
  const [cadastralOpacity, setCadastralOpacity] = useState(0.9);

  const [satelliteIndices, setSatelliteIndices] = useState(null);
  const [satelliteLoading, setSatelliteLoading] = useState(false);

  const [cropHistory, setCropHistory] = useState([]);
  const [openCropDialog, setOpenCropDialog] = useState(false);
  const [newCrop, setNewCrop] = useState({
    crop: "",
    start_date: "",
    end_date: "",
  });

  const enabledMapProviders = useMemo(() => getEnabledMapProviders(), []);
  const enabledSatelliteLayers = useMemo(() => getEnabledSatelliteLayers(), []);
  const enabledCadastralLayers = useMemo(() => getEnabledCadastralLayers(), []);

  useCadastralWmsError(
    useCallback(
      ({ contentType, status }) => {
        if (selectedCadastralLayer === "none") {
          return;
        }

        const detail = contentType ? ` Risposta ricevuta: ${contentType}.` : "";
        const statusDetail = status ? ` HTTP ${status}.` : "";

        setError(
          `Il layer catastale non e disponibile in questo momento.${statusDetail}${detail}`,
        );
      },
      [selectedCadastralLayer],
    ),
  );

  const formik = useFormik({
    initialValues: farmland || {
      area: "",
      perimeter: "",
      type: "",
      notes: "",
      owner: "",
      cadastralParcel: "",
      currentCrop: "",
    },
    onSubmit: (values) => {
      alert(JSON.stringify(values, null, 2));
    },
  });

  const handleOnClose = useCallback(() => {
    setOpen(false);
    onClose();
  }, [onClose]);

  const findCompanyByName = useCallback(
    (name) =>
      companies.find(
        (company) =>
          normalizeCompanyName(company.name) === normalizeCompanyName(name),
      ) || null,
    [companies],
  );

  const selectCompany = useCallback((company) => {
    setOwner(company?.name || "");
  }, []);

  const openCreateCompanyDialog = useCallback((name) => {
    setCompanyDraft({ name: name.trim() });
    setCompanyError("");
    setIsCompanyDialogOpen(true);
  }, []);

  const handleCompanySelection = useCallback(
    (_event, newValue) => {
      if (typeof newValue === "string") {
        const existingCompany = findCompanyByName(newValue);
        if (existingCompany) {
          selectCompany(existingCompany);
          return;
        }

        openCreateCompanyDialog(newValue);
        return;
      }

      if (newValue?.isNewCompanyOption) {
        openCreateCompanyDialog(newValue.inputValue);
        return;
      }

      if (newValue) {
        selectCompany(newValue);
        return;
      }

      setOwner("");
    },
    [findCompanyByName, openCreateCompanyDialog, selectCompany],
  );

  const handleCompanyInputChange = useCallback(
    (_event, newInputValue, reason) => {
      if (reason === "reset") {
        return;
      }

      const nextValue = newInputValue || "";
      const existingCompany = findCompanyByName(nextValue);
      if (existingCompany) {
        selectCompany(existingCompany);
        return;
      }

      setOwner(nextValue);
    },
    [findCompanyByName, selectCompany],
  );

  const handleCompanyDialogClose = useCallback(() => {
    if (isSavingCompany) {
      return;
    }

    setIsCompanyDialogOpen(false);
    setCompanyError("");
  }, [isSavingCompany]);

  const handleCompanyDraftChange = useCallback(
    (event) => {
      setCompanyDraft({ name: event.target.value });
      if (companyError) {
        setCompanyError("");
      }
    },
    [companyError],
  );

  const handleCreateCompany = useCallback(async () => {
    const trimmedName = companyDraft.name.trim();
    if (!trimmedName) {
      setCompanyError("Il nome azienda è obbligatorio.");
      return;
    }

    const existingCompany = findCompanyByName(trimmedName);
    if (existingCompany) {
      selectCompany(existingCompany);
      setIsCompanyDialogOpen(false);
      return;
    }

    setIsSavingCompany(true);
    try {
      const createdCompany = await createCompany({ name: trimmedName });
      selectCompany(createdCompany);
      setIsCompanyDialogOpen(false);
    } catch (err) {
      setCompanyError(
        err.message || "Errore durante il salvataggio dell'azienda.",
      );
    } finally {
      setIsSavingCompany(false);
    }
  }, [companyDraft.name, createCompany, findCompanyByName, selectCompany]);

  const onSaveFarmHandler = useCallback(() => {
    const newFarmland = {
      ...formik.values,
      ownerDisplayName: owner.trim(),
      coordinates: farmland ? farmland.coordinates : coordinates,
    };
    if (!newFarmland.area || !newFarmland.perimeter) {
      setError("Please fill all the required data");
      return;
    }
    if (farmland) {
      onUpdate(farmlandId, newFarmland);
    } else {
      onCreate(newFarmland);
    }

    handleOnClose();
  }, [
    owner,
    coordinates,
    farmland,
    farmlandId,
    onCreate,
    onUpdate,
    handleOnClose,
    formik.values,
  ]);

  const drawCompletedHandler = useCallback(
    ({ area, perimeter, coordinates }) => {
      setArea(area);
      setPerimeter(perimeter);
      setCoordinates(coordinates);
    },
    [],
  );

  useEffect(() => {
    const fetchCropHistory = async () => {
      if (farmlandId && farmlandId !== "new") {
        try {
          const history = await notebookService.getCropHistory(farmlandId);
          setCropHistory(history);
        } catch (err) {
          console.error("Error fetching crop history:", err);
        }
      }
    };
    fetchCropHistory();
  }, [farmlandId]);

  const handleAddCropHistory = async () => {
    try {
      await notebookService.saveCropHistory({
        ...newCrop,
        farmland_id: farmlandId,
      });
      const history = await notebookService.getCropHistory(farmlandId);
      setCropHistory(history);
      setOpenCropDialog(false);
    } catch (err) {
      console.error("Error saving crop history:", err);
    }
  };

  useEffect(() => {
    const fetchSatelliteIndices = async () => {
      const coords = coordinates || (farmland ? farmland.coordinates : null);
      if (coords && coords.length > 0) {
        setSatelliteLoading(true);
        try {
          const data = await satelliteService.getSatelliteIndices(coords);
          setSatelliteIndices(data);
        } catch (err) {
          console.error("Error fetching satellite indices:", err);
        } finally {
          setSatelliteLoading(false);
        }
      } else {
        setSatelliteIndices(null);
      }
    };

    fetchSatelliteIndices();
  }, [farmland, coordinates]);

  const deleteHandler = useCallback(() => {
    setIsDelFarmland(true);
  }, []);

  const handleDelOnClose = useCallback(() => {
    setIsDelFarmland(false);
  }, []);

  const confirmDelete = useCallback(() => {
    setIsDelFarmland(false);
    onDelete(farmland.id);
    handleOnClose();
  }, [farmland, onDelete, handleOnClose]);

  const optimizedMap = (
    <DrawableMap
      onDrawCompleted={drawCompletedHandler}
      mapProviderKey={selectedMapProvider}
      satelliteLayerKey={selectedSatelliteLayer}
      satelliteOpacity={satelliteOpacity}
      cadastralLayerKey={selectedCadastralLayer}
      cadastralOpacity={cadastralOpacity}
    />
  );

  const map = (
    <WorldMap
      coordinates={farmland ? farmland.coordinates : null}
      mapProviderKey={selectedMapProvider}
      satelliteLayerKey={selectedSatelliteLayer}
      satelliteOpacity={satelliteOpacity}
      cadastralLayerKey={selectedCadastralLayer}
      cadastralOpacity={cadastralOpacity}
    />
  );

  useEffect(() => {
    if (area && perimeter) {
      if (formik.values.area !== area) {
        formik.setFieldValue("area", area, false);
      }
      if (formik.values.perimeter !== perimeter) {
        formik.setFieldValue("perimeter", perimeter, false);
      }
    }
  }, [area, perimeter, formik.values.area, formik.values.perimeter]);

  useEffect(() => {
    if (farmland) {
      const nextArea = farmland.area || "";
      const nextPerimeter = farmland.perimeter || "";
      const nextType = farmland.type || "";
      const nextNotes = farmland.notes || "";
      const nextCadastralParcel = farmland.cadastralParcel || "";
      const nextCurrentCrop = farmland.currentCrop || "";

      if (formik.values.area !== nextArea) {
        formik.setFieldValue("area", nextArea, false);
      }
      if (formik.values.perimeter !== nextPerimeter) {
        formik.setFieldValue("perimeter", nextPerimeter, false);
      }
      if (formik.values.type !== nextType) {
        formik.setFieldValue("type", nextType, false);
      }
      if (formik.values.notes !== nextNotes) {
        formik.setFieldValue("notes", nextNotes, false);
      }
      if (formik.values.cadastralParcel !== nextCadastralParcel) {
        formik.setFieldValue("cadastralParcel", nextCadastralParcel, false);
      }
      if (formik.values.currentCrop !== nextCurrentCrop) {
        formik.setFieldValue("currentCrop", nextCurrentCrop, false);
      }
    }
  }, [
    farmland,
    formik.values.area,
    formik.values.perimeter,
    formik.values.type,
    formik.values.notes,
    formik.values.cadastralParcel,
    formik.values.currentCrop,
  ]);

  useEffect(() => {
    if (farmland) {
      setOwner(farmland.ownerDisplayName || "");
    }
  }, [farmland]);

  const closeHandler = useCallback(() => {
    setError();
  }, []);

  const selectedCompany = findCompanyByName(owner);

  const companyOptions = useCallback((options, params) => {
    const filtered = filterCompanyOptions(options, params);
    const trimmedInput = params.inputValue.trim();
    if (!trimmedInput) {
      return filtered;
    }

    const matchesExisting = options.some(
      (option) =>
        normalizeCompanyName(option.name) ===
        normalizeCompanyName(trimmedInput),
    );

    if (!matchesExisting) {
      filtered.push({
        id: `new-${trimmedInput}`,
        inputValue: trimmedInput,
        isNewCompanyOption: true,
        name: `Crea nuova azienda: ${trimmedInput}`,
      });
    }

    return filtered;
  }, []);

  const callToAction = (
    <Button autoFocus color="inherit" onClick={onSaveFarmHandler}>
      save
    </Button>
  );

  return (
    <FullScreenDialog
      open={open}
      handleOnClose={handleOnClose}
      title="Create new farmland"
      buttonComponent={callToAction}
    >
      <div className={classes.MapForm}>
        <div className={classes.MapContent}>
          <div className={classes.MapWrapper}>
            {!farmland && optimizedMap}
            {farmland && map}
          </div>
          <div className={classes.FormSide}>
            <form
              className={classes.FarmlandForm}
              onSubmit={formik.handleSubmit}
            >
              <TextField
                onChange={formik.handleChange}
                value={formik.values.area}
                label="Area (ettari)"
                name="area"
                disabled
                className={classes.Input}
                fullWidth
                error={formik.touched.area && Boolean(formik.errors.area)}
              />
              <TextField
                onChange={formik.handleChange}
                value={formik.values.perimeter}
                label="Perimeter (m)"
                name="perimeter"
                disabled
                className={classes.Input}
                fullWidth
                error={
                  formik.touched.perimeter && Boolean(formik.errors.perimeter)
                }
              />
              <TextField
                onChange={formik.handleChange}
                value={formik.values.type}
                label="Type of farming"
                name="type"
                className={classes.Input}
                fullWidth
                error={formik.touched.type && Boolean(formik.errors.type)}
              />
              <TextField
                onChange={formik.handleChange}
                value={formik.values.cadastralParcel}
                label="Particella Catastale"
                name="cadastralParcel"
                className={classes.Input}
                fullWidth
                error={
                  formik.touched.cadastralParcel &&
                  Boolean(formik.errors.cadastralParcel)
                }
              />
              <TextField
                onChange={formik.handleChange}
                value={formik.values.currentCrop}
                label="Coltura Attuale"
                name="currentCrop"
                className={classes.Input}
                fullWidth
                error={
                  formik.touched.currentCrop &&
                  Boolean(formik.errors.currentCrop)
                }
              />
              <TextField
                onChange={formik.handleChange}
                value={formik.values.notes}
                label="Notes"
                name="notes"
                className={classes.Input}
                fullWidth
                error={formik.touched.notes && Boolean(formik.errors.notes)}
              />
              <FormControl fullWidth className={classes.Input}>
                <Autocomplete
                  freeSolo
                  name="owner"
                  value={selectedCompany}
                  inputValue={owner}
                  onChange={handleCompanySelection}
                  onInputChange={handleCompanyInputChange}
                  filterOptions={companyOptions}
                  options={companies}
                  getOptionLabel={(option) => {
                    if (typeof option === "string") {
                      return option;
                    }

                    if (option?.isNewCompanyOption) {
                      return option.inputValue;
                    }

                    return option?.name || "";
                  }}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Company name" />
                  )}
                  renderOption={(renderProps, option) => (
                    <li {...renderProps} key={option.id}>
                      {option.name}
                    </li>
                  )}
                />
              </FormControl>
            </form>

            <Divider sx={{ my: 2 }} />

            <Box className={classes.MapConfig}>
              <Typography variant="h6" gutterBottom>
                Map Configuration
              </Typography>

              <FormControl fullWidth className={classes.Input}>
                <InputLabel id="map-provider-label">Mappa base</InputLabel>
                <Select
                  labelId="map-provider-label"
                  value={selectedMapProvider}
                  label="Mappa base"
                  onChange={(e) => setSelectedMapProvider(e.target.value)}
                >
                  {enabledMapProviders.map((provider) => (
                    <MenuItem key={provider.key} value={provider.key}>
                      {provider.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {enabledSatelliteLayers.length > 0 && (
                <>
                  <FormControl
                    fullWidth
                    className={classes.Input}
                    sx={{ mt: 2 }}
                  >
                    <InputLabel id="satellite-layer-label">
                      Layer satellitare
                    </InputLabel>
                    <Select
                      labelId="satellite-layer-label"
                      value={selectedSatelliteLayer}
                      label="Layer satellitare"
                      onChange={(e) =>
                        setSelectedSatelliteLayer(e.target.value)
                      }
                    >
                      <MenuItem value="none">Nessuno</MenuItem>
                      {enabledSatelliteLayers.map((layer) => (
                        <MenuItem key={layer.key} value={layer.key}>
                          {layer.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedSatelliteLayer !== "none" && (
                    <Box sx={{ px: 1, mt: 2 }}>
                      <Typography gutterBottom variant="caption">
                        OpacitÃ  layer satellitare:{" "}
                        {(satelliteOpacity * 100).toFixed(0)}%
                      </Typography>
                      <Slider
                        value={satelliteOpacity}
                        min={0}
                        max={1}
                        step={0.05}
                        onChange={(_e, newValue) =>
                          setSatelliteOpacity(newValue)
                        }
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  )}
                </>
              )}

              {enabledCadastralLayers.length > 0 && (
                <>
                  <FormControl
                    fullWidth
                    className={classes.Input}
                    sx={{ mt: 2 }}
                  >
                    <InputLabel id="cadastral-layer-label">
                      Layer catastale
                    </InputLabel>
                    <Select
                      labelId="cadastral-layer-label"
                      value={selectedCadastralLayer}
                      label="Layer catastale"
                      onChange={(e) =>
                        setSelectedCadastralLayer(e.target.value)
                      }
                    >
                      <MenuItem value="none">Nessuno</MenuItem>
                      {enabledCadastralLayers.map((layer) => (
                        <MenuItem key={layer.key} value={layer.key}>
                          {layer.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedCadastralLayer !== "none" && (
                    <Box sx={{ px: 1, mt: 2 }}>
                      <Typography gutterBottom variant="caption">
                        Opacita layer catastale:{" "}
                        {(cadastralOpacity * 100).toFixed(0)}%
                      </Typography>
                      <Slider
                        value={cadastralOpacity}
                        min={0}
                        max={1}
                        step={0.05}
                        onChange={(_e, newValue) =>
                          setCadastralOpacity(newValue)
                        }
                        valueLabelDisplay="auto"
                      />
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ mt: 1 }}
                      >
                        Dati da servizio WMS ufficiale Agenzia delle Entrate.
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>

            <SatelliteIndices
              indices={satelliteIndices}
              loading={satelliteLoading}
            />

            {farmland && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Storico Colture
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Coltura</TableCell>
                        <TableCell>Periodo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cropHistory.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell>{h.crop}</TableCell>
                          <TableCell>
                            {h.start_date || "?"} / {h.end_date || "oggi"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {cropHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} align="center">
                            Nessuno storico
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => setOpenCropDialog(true)}
                >
                  Aggiungi Storico
                </Button>
              </Box>
            )}

            {farmland && (
              <div className={classes.detailsWrapper}>
                <Button onClick={deleteHandler}>Delete farmland</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={closeHandler}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>

      {isDelFarmland && (
        <Modal
          open={isDelFarmland}
          title="Delete farmland"
          confirmButtonLabel="Delete"
          onClose={handleDelOnClose}
          onConfirm={confirmDelete}
        >
          <h2>Do you want to delete this farmland?</h2>
        </Modal>
      )}

      <Dialog open={openCropDialog} onClose={() => setOpenCropDialog(false)}>
        <DialogTitle>Aggiungi Storico Coltura</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Coltura"
              fullWidth
              value={newCrop.crop}
              onChange={(e) =>
                setNewCrop((prev) => ({ ...prev, crop: e.target.value }))
              }
            />
            <TextField
              label="Inizio"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newCrop.start_date}
              onChange={(e) =>
                setNewCrop((prev) => ({ ...prev, start_date: e.target.value }))
              }
            />
            <TextField
              label="Fine"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newCrop.end_date}
              onChange={(e) =>
                setNewCrop((prev) => ({ ...prev, end_date: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCropDialog(false)}>Annulla</Button>
          <Button onClick={handleAddCropHistory} variant="contained">
            Aggiungi
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isCompanyDialogOpen}
        onClose={handleCompanyDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nuova azienda</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Nome azienda"
              fullWidth
              value={companyDraft.name}
              onChange={handleCompanyDraftChange}
              error={!!companyError}
              helperText={companyError}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCompanyDialogClose} disabled={isSavingCompany}>
            Annulla
          </Button>
          <Button
            onClick={handleCreateCompany}
            variant="contained"
            disabled={!companyDraft.name.trim() || isSavingCompany}
          >
            Salva azienda
          </Button>
        </DialogActions>
      </Dialog>
    </FullScreenDialog>
  );
};

export default FarmlandScreen;
