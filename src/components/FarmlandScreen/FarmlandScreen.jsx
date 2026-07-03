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
  CircularProgress,
  IconButton,
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
import { ageaCropService } from "../../services/ageaCropService";
import DeleteIcon from "@mui/icons-material/Delete";

const normalizeCompanyName = (name = "") => name.trim().toLowerCase();
const filterCompanyOptions = createFilterOptions();
const monthOptions = [
  { value: 1, label: "Gennaio" },
  { value: 2, label: "Febbraio" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Aprile" },
  { value: 5, label: "Maggio" },
  { value: 6, label: "Giugno" },
  { value: 7, label: "Luglio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Settembre" },
  { value: 10, label: "Ottobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Dicembre" },
];

const getCurrentYear = () => new Date().getFullYear();

const buildCurrentCropSummary = (entry) => {
  if (!entry) return "";

  const code = String(entry.agea_code || "").trim();
  const label = String(entry.agea_label || entry.crop || "").trim();
  return code && label ? `${code} - ${label}` : label || code;
};

const formatCropPeriod = (entry) => {
  const monthLabel =
    monthOptions.find((item) => item.value === Number(entry?.month))?.label ||
    "-";
  const yearLabel = entry?.year || "-";
  return `${monthLabel} ${yearLabel}`;
};

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
  const [satelliteApiResponse, setSatelliteApiResponse] = useState(null);
  const [satelliteMetadata, setSatelliteMetadata] = useState(null);
  const [satelliteLoading, setSatelliteLoading] = useState(false);

  const [cropHistory, setCropHistory] = useState([]);
  const [soilAnalysisHistory, setSoilAnalysisHistory] = useState([]);
  const [openCropDialog, setOpenCropDialog] = useState(false);
  const [openSoilDialog, setOpenSoilDialog] = useState(false);
  const [ageaCropOptions, setAgeaCropOptions] = useState([]);
  const [ageaCropQuery, setAgeaCropQuery] = useState("");
  const [ageaCropLoading, setAgeaCropLoading] = useState(false);
  const [ageaCropError, setAgeaCropError] = useState("");
  const [newCrop, setNewCrop] = useState({
    crop: "",
    agea_code: "",
    agea_label: "",
    area: "",
    month: new Date().getMonth() + 1,
    year: getCurrentYear(),
    foglio: "",
    mappale: "",
    start_date: "",
    end_date: "",
    notes: "",
  });
  const [newSoilAnalysis, setNewSoilAnalysis] = useState({
    analysis_date: new Date().toISOString().slice(0, 10),
    texture: "",
    ph: "",
    organic_matter: "",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    notes: "",
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

  useEffect(() => {
    const fetchSoilAnalysisHistory = async () => {
      if (farmlandId && farmlandId !== "new") {
        try {
          const history = await notebookService.getSoilAnalysisHistory(farmlandId);
          setSoilAnalysisHistory(history);
        } catch (err) {
          console.error("Error fetching soil analysis history:", err);
        }
      }
    };
    fetchSoilAnalysisHistory();
  }, [farmlandId]);

  const handleAddCropHistory = async () => {
    if (!newCrop.crop || !newCrop.area || !newCrop.month || !newCrop.year) {
      setError(
        "Per ogni coltura servono almeno selezione AGEA, superficie, mese e anno.",
      );
      return;
    }

    try {
      const entry = {
        ...newCrop,
        farmland_id: farmlandId,
        area: Number.parseFloat(newCrop.area),
        month: Number.parseInt(newCrop.month, 10),
        year: Number.parseInt(newCrop.year, 10),
      };

      await notebookService.saveCropHistory(entry);

      if (farmland && onUpdate) {
        await onUpdate(farmlandId, {
          ...farmland,
          currentCrop: buildCurrentCropSummary(entry),
        });
      }

      const history = await notebookService.getCropHistory(farmlandId);
      setCropHistory(history);
      setOpenCropDialog(false);
      setAgeaCropQuery("");
      setAgeaCropOptions([]);
      setAgeaCropError("");
      setNewCrop({
        crop: "",
        agea_code: "",
        agea_label: "",
        area: "",
        month: new Date().getMonth() + 1,
        year: getCurrentYear(),
        foglio: "",
        mappale: "",
        start_date: "",
        end_date: "",
        notes: "",
      });
    } catch (err) {
      console.error("Error saving crop history:", err);
      setError(err.message || "Errore durante il salvataggio della coltura.");
    }
  };

  const resetSoilAnalysisForm = useCallback(() => {
    setNewSoilAnalysis({
      analysis_date: new Date().toISOString().slice(0, 10),
      texture: "",
      ph: "",
      organic_matter: "",
      nitrogen: "",
      phosphorus: "",
      potassium: "",
      notes: "",
    });
  }, []);

  const handleAddSoilAnalysis = async () => {
    if (!newSoilAnalysis.analysis_date) {
      setError("La data analisi terreno e obbligatoria.");
      return;
    }

    try {
      await notebookService.saveSoilAnalysis({
        farmland_id: farmlandId,
        analysis_date: newSoilAnalysis.analysis_date,
        texture: newSoilAnalysis.texture || null,
        ph: newSoilAnalysis.ph === "" ? null : Number.parseFloat(newSoilAnalysis.ph),
        organic_matter:
          newSoilAnalysis.organic_matter === ""
            ? null
            : Number.parseFloat(newSoilAnalysis.organic_matter),
        nitrogen:
          newSoilAnalysis.nitrogen === ""
            ? null
            : Number.parseFloat(newSoilAnalysis.nitrogen),
        phosphorus:
          newSoilAnalysis.phosphorus === ""
            ? null
            : Number.parseFloat(newSoilAnalysis.phosphorus),
        potassium:
          newSoilAnalysis.potassium === ""
            ? null
            : Number.parseFloat(newSoilAnalysis.potassium),
        notes: newSoilAnalysis.notes || null,
      });

      const history = await notebookService.getSoilAnalysisHistory(farmlandId);
      setSoilAnalysisHistory(history);
      setOpenSoilDialog(false);
      resetSoilAnalysisForm();
    } catch (err) {
      console.error("Error saving soil analysis history:", err);
      setError(err.message || "Errore durante il salvataggio dell'analisi terreno.");
    }
  };

  const handleDeleteSoilAnalysis = useCallback(
    async (soilAnalysisId) => {
      if (!window.confirm("Eliminare questa analisi terreno?")) return;

      try {
        await notebookService.deleteSoilAnalysis(soilAnalysisId);
        const history = await notebookService.getSoilAnalysisHistory(farmlandId);
        setSoilAnalysisHistory(history);
      } catch (err) {
        console.error("Error deleting soil analysis history:", err);
        setError(err.message || "Errore durante l'eliminazione dell'analisi terreno.");
      }
    },
    [farmlandId],
  );

  useEffect(() => {
    const searchAgeaCrops = async () => {
      const query = ageaCropQuery.trim();
      if (query.length < 2 || !openCropDialog) {
        setAgeaCropOptions([]);
        setAgeaCropError("");
        return;
      }

      setAgeaCropLoading(true);
      try {
        const items = await ageaCropService.searchCrops(query);
        setAgeaCropOptions(items);
        setAgeaCropError("");
      } catch (err) {
        console.error("Error searching AGEA crops:", err);
        setAgeaCropOptions([]);
        setAgeaCropError(
          err.message || "Errore nel recupero delle colture AGEA.",
        );
      } finally {
        setAgeaCropLoading(false);
      }
    };

    const timeoutId = window.setTimeout(searchAgeaCrops, 250);
    return () => window.clearTimeout(timeoutId);
  }, [ageaCropQuery, openCropDialog]);

  useEffect(() => {
    const fetchSatelliteIndices = async () => {
      const coords = coordinates || (farmland ? farmland.coordinates : null);
      if (coords && coords.length > 0) {
        setSatelliteLoading(true);
        try {
          const data = await satelliteService.getSatelliteIndices(coords);
          setSatelliteIndices(data?.indices || null);
          setSatelliteApiResponse(data?.upstreamResponse || null);
          setSatelliteMetadata(data?.metadata || null);
          setError(undefined);
        } catch (err) {
          console.error("Error fetching satellite indices:", err);
          setSatelliteIndices(null);
          setSatelliteApiResponse(null);
          setSatelliteMetadata(null);
          setError(
            err.message ||
              "Errore nel recupero indici satellitari da Copernicus.",
          );
        } finally {
          setSatelliteLoading(false);
        }
      } else {
        setSatelliteIndices(null);
        setSatelliteApiResponse(null);
        setSatelliteMetadata(null);
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
                label="Ultima coltura registrata"
                name="currentCrop"
                className={classes.Input}
                fullWidth
                disabled
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
              upstreamResponse={satelliteApiResponse}
              metadata={satelliteMetadata}
              loading={satelliteLoading}
            />

            {farmland && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Analisi terreno
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Tessitura</TableCell>
                        <TableCell>pH</TableCell>
                        <TableCell>Sostanza organica</TableCell>
                        <TableCell>N</TableCell>
                        <TableCell>P</TableCell>
                        <TableCell>K</TableCell>
                        <TableCell>Note</TableCell>
                        <TableCell align="right">Azioni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {soilAnalysisHistory.map((analysis) => (
                        <TableRow key={analysis.id}>
                          <TableCell>{analysis.analysis_date}</TableCell>
                          <TableCell>{analysis.texture || "-"}</TableCell>
                          <TableCell>{analysis.ph ?? "-"}</TableCell>
                          <TableCell>{analysis.organic_matter ?? "-"}</TableCell>
                          <TableCell>{analysis.nitrogen ?? "-"}</TableCell>
                          <TableCell>{analysis.phosphorus ?? "-"}</TableCell>
                          <TableCell>{analysis.potassium ?? "-"}</TableCell>
                          <TableCell>{analysis.notes || "-"}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteSoilAnalysis(analysis.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {soilAnalysisHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            Nessuna analisi terreno registrata.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => setOpenSoilDialog(true)}
                >
                  Aggiungi analisi terreno
                </Button>
              </Box>
            )}

            {farmland && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Storico Colture
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Codice AGEA</TableCell>
                        <TableCell>Coltura</TableCell>
                        <TableCell>Superficie</TableCell>
                        <TableCell>Mese/Anno</TableCell>
                        <TableCell>Foglio</TableCell>
                        <TableCell>Mappale</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cropHistory.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell>{h.agea_code || "-"}</TableCell>
                          <TableCell>{h.crop}</TableCell>
                          <TableCell>{h.area || "-"}</TableCell>
                          <TableCell>{formatCropPeriod(h)}</TableCell>
                          <TableCell>{h.foglio || "-"}</TableCell>
                          <TableCell>{h.mappale || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {cropHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
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
            <Autocomplete
              options={ageaCropOptions}
              loading={ageaCropLoading}
              inputValue={ageaCropQuery}
              value={
                newCrop.agea_code && newCrop.agea_label
                  ? {
                      code: newCrop.agea_code,
                      label: newCrop.agea_label,
                    }
                  : null
              }
              onInputChange={(_event, value) => {
                setAgeaCropQuery(value);
              }}
              onChange={(_event, value) => {
                setNewCrop((prev) => ({
                  ...prev,
                  crop: value ? `${value.code} - ${value.label}` : "",
                  agea_code: value?.code || "",
                  agea_label: value?.label || "",
                }));
              }}
              getOptionLabel={(option) =>
                `${option.code || ""} - ${option.label || ""}`.trim()
              }
              isOptionEqualToValue={(option, value) =>
                option.code === value.code
              }
              noOptionsText={
                ageaCropQuery.trim().length < 2
                  ? "Digita almeno 2 caratteri"
                  : "Nessuna coltura AGEA trovata"
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Coltura AGEA"
                  helperText={
                    ageaCropError ||
                    "Seleziona la coltura dal catalogo AGEA."
                  }
                  error={!!ageaCropError}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {ageaCropLoading ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Codice AGEA"
                fullWidth
                value={newCrop.agea_code}
                disabled
              />
              <TextField
                label="Superficie"
                type="number"
                fullWidth
                value={newCrop.area}
                onChange={(e) =>
                  setNewCrop((prev) => ({ ...prev, area: e.target.value }))
                }
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Mese"
                fullWidth
                value={newCrop.month}
                onChange={(e) =>
                  setNewCrop((prev) => ({ ...prev, month: e.target.value }))
                }
              >
                {monthOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Anno"
                type="number"
                fullWidth
                value={newCrop.year}
                onChange={(e) =>
                  setNewCrop((prev) => ({ ...prev, year: e.target.value }))
                }
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Foglio"
                fullWidth
                value={newCrop.foglio}
                onChange={(e) =>
                  setNewCrop((prev) => ({ ...prev, foglio: e.target.value }))
                }
              />
              <TextField
                label="Mappale"
                fullWidth
                value={newCrop.mappale}
                onChange={(e) =>
                  setNewCrop((prev) => ({ ...prev, mappale: e.target.value }))
                }
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Inizio"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newCrop.start_date}
                onChange={(e) =>
                  setNewCrop((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
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
            <TextField
              label="Note"
              fullWidth
              multiline
              minRows={2}
              value={newCrop.notes}
              onChange={(e) =>
                setNewCrop((prev) => ({ ...prev, notes: e.target.value }))
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

      <Dialog open={openSoilDialog} onClose={() => setOpenSoilDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Aggiungi analisi terreno</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Data analisi"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newSoilAnalysis.analysis_date}
              onChange={(e) =>
                setNewSoilAnalysis((prev) => ({
                  ...prev,
                  analysis_date: e.target.value,
                }))
              }
            />
            <TextField
              label="Tessitura"
              fullWidth
              value={newSoilAnalysis.texture}
              onChange={(e) =>
                setNewSoilAnalysis((prev) => ({ ...prev, texture: e.target.value }))
              }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="pH"
                type="number"
                fullWidth
                value={newSoilAnalysis.ph}
                onChange={(e) =>
                  setNewSoilAnalysis((prev) => ({ ...prev, ph: e.target.value }))
                }
              />
              <TextField
                label="Sostanza organica (%)"
                type="number"
                fullWidth
                value={newSoilAnalysis.organic_matter}
                onChange={(e) =>
                  setNewSoilAnalysis((prev) => ({
                    ...prev,
                    organic_matter: e.target.value,
                  }))
                }
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Azoto (N)"
                type="number"
                fullWidth
                value={newSoilAnalysis.nitrogen}
                onChange={(e) =>
                  setNewSoilAnalysis((prev) => ({ ...prev, nitrogen: e.target.value }))
                }
              />
              <TextField
                label="Fosforo (P)"
                type="number"
                fullWidth
                value={newSoilAnalysis.phosphorus}
                onChange={(e) =>
                  setNewSoilAnalysis((prev) => ({
                    ...prev,
                    phosphorus: e.target.value,
                  }))
                }
              />
              <TextField
                label="Potassio (K)"
                type="number"
                fullWidth
                value={newSoilAnalysis.potassium}
                onChange={(e) =>
                  setNewSoilAnalysis((prev) => ({ ...prev, potassium: e.target.value }))
                }
              />
            </Stack>
            <TextField
              label="Note"
              fullWidth
              multiline
              minRows={2}
              value={newSoilAnalysis.notes}
              onChange={(e) =>
                setNewSoilAnalysis((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSoilDialog(false)}>Annulla</Button>
          <Button onClick={handleAddSoilAnalysis} variant="contained">
            Salva analisi
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
