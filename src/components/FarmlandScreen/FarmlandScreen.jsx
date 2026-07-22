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
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";
import { useState, useCallback, useMemo, useEffect } from "react";
import classes from "./FarmlandScreen.module.scss";
import DrawableMap from "../WorldMap/DrawableMap/DrawableMap";
import { useFormik } from "formik";
import useFarmlands from "../../hooks/useFarmlands";
import Modal from "../UI/Modal/Modal";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getEnabledMapProviders } from "../../config/mapProviders";
import { getEnabledSatelliteLayers } from "../../config/satelliteLayers";
import { getEnabledCadastralLayers } from "../../config/cadastralLayers";
import SatelliteIndices from "./SatelliteIndices/SatelliteIndices";
import { satelliteService } from "../../services/satelliteService";
import { notebookService } from "../../services/notebookService";
import { useCadastralWmsError } from "../../hooks/useCadastralWmsError";
import { ageaCropService } from "../../services/ageaCropService";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "../../lib/supabaseClient";

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

const FarmlandScreen = (props) => {
  const navigate = useNavigate();
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
  const [selectedVulnerableZonesLayer, setSelectedVulnerableZonesLayer] =
    useState("none");
  const [vulnerableZonesOpacity, setVulnerableZonesOpacity] = useState(0.35);
  const [vulnerableZonesGeoJson, setVulnerableZonesGeoJson] = useState(null);
  const [terrainDeleted, setTerrainDeleted] = useState(false);

  const [satelliteIndices, setSatelliteIndices] = useState(null);
  const [satelliteApiResponse, setSatelliteApiResponse] = useState(null);
  const [satelliteMetadata, setSatelliteMetadata] = useState(null);
  const [satelliteLoading, setSatelliteLoading] = useState(false);

  const [cropHistory, setCropHistory] = useState([]);
  const [annualSau, setAnnualSau] = useState([]);
  const [cadastralIdentifiers, setCadastralIdentifiers] = useState([]);
  const [newCadastralIdentifier, setNewCadastralIdentifier] = useState({
    province: "",
    municipality: "",
    sheet: "",
    parcel: "",
    subaltern: "",
  });
  const [soilAnalysisHistory, setSoilAnalysisHistory] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [fertilizationPlans, setFertilizationPlans] = useState([]);
  const [openCropDialog, setOpenCropDialog] = useState(false);
  const [openSoilDialog, setOpenSoilDialog] = useState(false);
  const [openFertilizationDialog, setOpenFertilizationDialog] = useState(false);
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
    is_terminated: false,
    start_date: "",
    end_date: "",
    notes: "",
    sau: "",
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
  const [newFertilizationPlan, setNewFertilizationPlan] = useState({
    recommended_date: new Date().toISOString().slice(0, 10),
    product_category: "Concime",
    target_n: "",
    target_p: "",
    target_k: "",
    organic_matter: "",
    notes: "",
  });

  const enabledMapProviders = useMemo(() => getEnabledMapProviders(), []);
  const enabledSatelliteLayers = useMemo(() => getEnabledSatelliteLayers(), []);
  const enabledCadastralLayers = useMemo(() => getEnabledCadastralLayers(), []);

  useEffect(() => {
    if (selectedVulnerableZonesLayer === "none") {
      setVulnerableZonesGeoJson(null);
      return;
    }

    let active = true;
    supabase
      .from("environmental_layers")
      .select("geojson")
      .eq("region_code", selectedVulnerableZonesLayer)
      .eq("layer_type", "nitrate_vulnerable_zones")
      .single()
      .then(({ data, error: layerError }) => {
        if (!active) return;
        if (layerError) {
          setError("Impossibile caricare il layer delle zone vulnerabili ai nitrati.");
          setVulnerableZonesGeoJson(null);
          return;
        }
        setVulnerableZonesGeoJson(data.geojson);
      });

    return () => {
      active = false;
    };
  }, [selectedVulnerableZonesLayer]);

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
      name: "",
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

  const onSaveFarmHandler = useCallback(async () => {
    const company = findCompanyByName(owner);
    const drawnGeometry = coordinates
      ? { type: "Polygon", coordinates: [coordinates] }
      : null;
    const newFarmland = {
      ...formik.values,
      ownerDisplayName: owner.trim(),
      company_id: company?.id || null,
      coordinates: terrainDeleted
        ? null
        : coordinates || farmland?.coordinates || null,
      geometry: terrainDeleted
        ? null
        : drawnGeometry || farmland?.geometry || null,
      cadastralCoverageGeometry: farmland?.cadastralCoverageGeometry || null,
      geometryStatus: terrainDeleted
        ? farmland?.cadastralCoverageGeometry
          ? "cadastral_coverage"
          : "defined"
        : drawnGeometry
          ? "defined"
          : farmland?.geometryStatus || "defined",
    };
    if (!newFarmland.name?.trim()) {
      setError("Il nome del terreno è obbligatorio.");
      return;
    }
    if (!company) {
      setError("Seleziona un'azienda esistente o creane una.");
      return;
    }
    try {
      if (farmland) {
        await onUpdate(farmlandId, newFarmland);
      } else {
        await onCreate(newFarmland);
      }
      handleOnClose();
    } catch (err) {
      console.error("Error saving farmland:", err);
      setError(err.message || "Errore durante il salvataggio del terreno.");
    }
  }, [
    owner,
    findCompanyByName,
    coordinates,
    farmland,
    farmlandId,
    onCreate,
    onUpdate,
    handleOnClose,
    formik.values,
    terrainDeleted,
  ]);

  const drawCompletedHandler = useCallback(
    ({ area, perimeter, coordinates }) => {
      setTerrainDeleted(false);
      setArea(area);
      setPerimeter(perimeter);
      setCoordinates(coordinates);
    },
    [],
  );

  const handleDeleteTerrainGeometry = useCallback(async () => {
    if (!farmland || !window.confirm("Eliminare il disegno blu del terreno? I mappali arancioni resteranno invariati.")) {
      return;
    }

    try {
      setTerrainDeleted(true);
      setCoordinates(null);
      await onUpdate(farmlandId, {
        ...farmland,
        coordinates: null,
        geometry: null,
        geometryStatus: farmland.cadastralCoverageGeometry
          ? "cadastral_coverage"
          : "defined",
      });
    } catch (err) {
      setTerrainDeleted(false);
      setError(err.message || "Errore durante l'eliminazione del disegno del terreno.");
    }
  }, [farmland, farmlandId, onUpdate]);

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
    const fetchSummary = async () => {
      if (!farmlandId || farmlandId === "new") return;
      try {
        const summary = await notebookService.getFarmlandSummary(farmlandId);
        setAnnualSau(summary.annualSau);
        setCadastralIdentifiers(summary.cadastralIdentifiers);
      } catch (err) {
        console.error("Error fetching farmland summary:", err);
      }
    };
    fetchSummary();
  }, [farmlandId]);

  const handleAddCadastralIdentifier = async () => {
    const { municipality, sheet, parcel } = newCadastralIdentifier;
    if (!municipality.trim() || !sheet.trim() || !parcel.trim()) {
      setError("Comune, foglio e particella sono obbligatori.");
      return;
    }
    try {
      const saved = await notebookService.addCadastralIdentifier(
        farmlandId,
        newCadastralIdentifier,
      );
      setCadastralIdentifiers((prev) =>
        prev.some((item) => item.id === saved.id) ? prev : [...prev, saved],
      );
      setNewCadastralIdentifier({
        province: "",
        municipality: "",
        sheet: "",
        parcel: "",
        subaltern: "",
      });
    } catch (err) {
      setError(err.message || "Errore nel salvataggio catastale.");
    }
  };

  const handleRemoveCadastralIdentifier = async (identifierId) => {
    try {
      await notebookService.removeCadastralIdentifier(farmlandId, identifierId);
      setCadastralIdentifiers((prev) =>
        prev.filter((item) => item.id !== identifierId),
      );
    } catch (err) {
      setError(err.message || "Errore nella rimozione catastale.");
    }
  };

  useEffect(() => {
    const fetchSoilAnalysisHistory = async () => {
      if (farmlandId && farmlandId !== "new") {
        try {
          const history =
            await notebookService.getSoilAnalysisHistory(farmlandId);
          setSoilAnalysisHistory(history);
        } catch (err) {
          console.error("Error fetching soil analysis history:", err);
        }
      }
    };
    fetchSoilAnalysisHistory();
  }, [farmlandId]);

  useEffect(() => {
    const fetchTreatments = async () => {
      if (farmlandId && farmlandId !== "new") {
        try {
          const operations =
            await notebookService.getFarmlandOperations(farmlandId);
          setTreatments(
            operations.filter(
              (item) => item.type === "Trattamento fitosanitario",
            ),
          );
        } catch (err) {
          console.error("Error fetching farmland treatments:", err);
        }
      }
    };
    fetchTreatments();
  }, [farmlandId]);

  useEffect(() => {
    const fetchFertilizationPlans = async () => {
      if (farmlandId && farmlandId !== "new") {
        try {
          const plans = await notebookService.getFertilizationPlans(farmlandId);
          setFertilizationPlans(plans);
        } catch (err) {
          console.error("Error fetching fertilization plans:", err);
        }
      }
    };
    fetchFertilizationPlans();
  }, [farmlandId]);

  const handleAddCropHistory = async () => {
    if (!newCrop.crop || !newCrop.area || !newCrop.month || !newCrop.year) {
      setError(
        "Per ogni coltura servono almeno selezione AGEA, superficie, mese e anno.",
      );
      return;
    }

    try {
      const { sau: _sau, ...cropDraft } = newCrop;
      const entry = {
        ...cropDraft,
        farmland_id: farmlandId,
        area: Number.parseFloat(newCrop.area),
        month: Number.parseInt(newCrop.month, 10),
        year: Number.parseInt(newCrop.year, 10),
        is_terminated: Boolean(newCrop.is_terminated),
      };

      await notebookService.saveCropHistory(entry);
      if (newCrop.sau !== "") {
        const savedSau = await notebookService.saveAnnualSau(
          farmlandId,
          Number.parseInt(newCrop.year, 10),
          Number.parseFloat(newCrop.sau),
        );
        setAnnualSau((prev) =>
          [
            savedSau,
            ...prev.filter((item) => item.year !== savedSau.year),
          ].sort((a, b) => b.year - a.year),
        );
      }

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
        is_terminated: false,
        start_date: "",
        end_date: "",
        notes: "",
        sau: "",
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

  const resetFertilizationPlanForm = useCallback(() => {
    const latest = soilAnalysisHistory[0];
    setNewFertilizationPlan({
      recommended_date: new Date().toISOString().slice(0, 10),
      product_category: "Concime",
      target_n: latest?.nitrogen ?? "",
      target_p: latest?.phosphorus ?? "",
      target_k: latest?.potassium ?? "",
      organic_matter: latest?.organic_matter ?? "",
      notes: latest
        ? `Prefill da ultima analisi del ${latest.analysis_date}.`
        : "",
    });
  }, [soilAnalysisHistory]);

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
        ph:
          newSoilAnalysis.ph === ""
            ? null
            : Number.parseFloat(newSoilAnalysis.ph),
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
      setError(
        err.message || "Errore durante il salvataggio dell'analisi terreno.",
      );
    }
  };

  const handleDeleteSoilAnalysis = useCallback(
    async (soilAnalysisId) => {
      if (!window.confirm("Eliminare questa analisi terreno?")) return;

      try {
        await notebookService.deleteSoilAnalysis(soilAnalysisId);
        const history =
          await notebookService.getSoilAnalysisHistory(farmlandId);
        setSoilAnalysisHistory(history);
      } catch (err) {
        console.error("Error deleting soil analysis history:", err);
        setError(
          err.message || "Errore durante l'eliminazione dell'analisi terreno.",
        );
      }
    },
    [farmlandId],
  );

  const handleOpenFertilizationDialog = useCallback(() => {
    resetFertilizationPlanForm();
    setOpenFertilizationDialog(true);
  }, [resetFertilizationPlanForm]);

  const handleAddFertilizationPlan = async () => {
    try {
      await notebookService.saveFertilizationPlan({
        farmland_id: farmlandId,
        recommended_date: newFertilizationPlan.recommended_date || null,
        product_category: newFertilizationPlan.product_category,
        target_n:
          newFertilizationPlan.target_n === ""
            ? null
            : Number.parseFloat(newFertilizationPlan.target_n),
        target_p:
          newFertilizationPlan.target_p === ""
            ? null
            : Number.parseFloat(newFertilizationPlan.target_p),
        target_k:
          newFertilizationPlan.target_k === ""
            ? null
            : Number.parseFloat(newFertilizationPlan.target_k),
        organic_matter:
          newFertilizationPlan.organic_matter === ""
            ? null
            : Number.parseFloat(newFertilizationPlan.organic_matter),
        notes: newFertilizationPlan.notes || null,
      });

      const plans = await notebookService.getFertilizationPlans(farmlandId);
      setFertilizationPlans(plans);
      setOpenFertilizationDialog(false);
    } catch (err) {
      console.error("Error saving fertilization plan:", err);
      setError(
        err.message ||
          "Errore durante il salvataggio del piano di fertilizzazione.",
      );
    }
  };

  const handleDeleteFertilizationPlan = useCallback(
    async (planId) => {
      if (!window.confirm("Eliminare questa riga di piano?")) return;

      try {
        await notebookService.deleteFertilizationPlan(planId);
        const plans = await notebookService.getFertilizationPlans(farmlandId);
        setFertilizationPlans(plans);
      } catch (err) {
        console.error("Error deleting fertilization plan:", err);
        setError(err.message || "Errore durante l'eliminazione del piano.");
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

  const terrainPolygons = useMemo(() => {
    if (terrainDeleted) return [];
    const geometry = farmland?.geometry;
    if (geometry?.type === "MultiPolygon") {
      return geometry.coordinates.map((polygon) => polygon[0]);
    }
    if (geometry?.type === "Polygon") return [geometry.coordinates[0]];
    return farmland?.coordinates?.length ? [farmland.coordinates] : [];
  }, [farmland, terrainDeleted]);

  const cadastralPolygons = useMemo(() => {
    const geometry = farmland?.cadastralCoverageGeometry;
    if (geometry?.type === "MultiPolygon") {
      return geometry.coordinates.map((polygon) => polygon[0]);
    }
    if (geometry?.type === "Polygon") return [geometry.coordinates[0]];
    return [];
  }, [farmland]);

  const map = (
    <DrawableMap
      onDrawCompleted={drawCompletedHandler}
      terrainPolygons={terrainPolygons}
      cadastralPolygons={cadastralPolygons}
      mapProviderKey={selectedMapProvider}
      satelliteLayerKey={selectedSatelliteLayer}
      satelliteOpacity={satelliteOpacity}
      cadastralLayerKey={selectedCadastralLayer}
      cadastralOpacity={cadastralOpacity}
      vulnerableZonesGeoJson={vulnerableZonesGeoJson}
      vulnerableZonesOpacity={vulnerableZonesOpacity}
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
  }, [farmland]);

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
            {map}
          </div>
          <div className={classes.FormSide}>
            <form
              className={classes.FarmlandForm}
              onSubmit={formik.handleSubmit}
            >
              <TextField
                onChange={formik.handleChange}
                value={formik.values.name || ""}
                label="Nome terreno"
                name="name"
                required
                className={classes.Input}
                fullWidth
              />
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

              {farmland ? (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Identificazioni catastali
                  </Typography>
                  {cadastralIdentifiers.map((item) => (
                    <Stack
                      key={item.id}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                    >
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {item.province ? `${item.province}, ` : ""}
                        {item.municipality} — F. {item.sheet}, P. {item.parcel}
                        {item.subaltern ? `, Sub. ${item.subaltern}` : ""}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveCadastralIdentifier(item.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <TextField
                        size="small"
                        label="Provincia"
                        value={newCadastralIdentifier.province}
                        onChange={(e) =>
                          setNewCadastralIdentifier((prev) => ({
                            ...prev,
                            province: e.target.value,
                          }))
                        }
                      />
                      <TextField
                        size="small"
                        label="Comune"
                        value={newCadastralIdentifier.municipality}
                        onChange={(e) =>
                          setNewCadastralIdentifier((prev) => ({
                            ...prev,
                            municipality: e.target.value,
                          }))
                        }
                      />
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <TextField
                        size="small"
                        label="Foglio"
                        value={newCadastralIdentifier.sheet}
                        onChange={(e) =>
                          setNewCadastralIdentifier((prev) => ({
                            ...prev,
                            sheet: e.target.value,
                          }))
                        }
                      />
                      <TextField
                        size="small"
                        label="Particella"
                        value={newCadastralIdentifier.parcel}
                        onChange={(e) =>
                          setNewCadastralIdentifier((prev) => ({
                            ...prev,
                            parcel: e.target.value,
                          }))
                        }
                      />
                      <TextField
                        size="small"
                        label="Subalterno"
                        value={newCadastralIdentifier.subaltern}
                        onChange={(e) =>
                          setNewCadastralIdentifier((prev) => ({
                            ...prev,
                            subaltern: e.target.value,
                          }))
                        }
                      />
                    </Stack>
                    <Button
                      variant="outlined"
                      onClick={handleAddCadastralIdentifier}
                    >
                      Aggiungi identificazione
                    </Button>
                  </Stack>
                </Box>
              ) : null}
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
                    <TextField {...params} label="Company name" required />
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

              {farmland && !terrainDeleted &&
                (farmland.geometry || farmland.coordinates?.length) && (
                  <Button
                    variant="outlined"
                    color="error"
                    fullWidth
                    sx={{ mb: 2 }}
                    onClick={handleDeleteTerrainGeometry}
                  >
                    Elimina disegno terreno blu
                  </Button>
                )}

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

              <FormControl fullWidth className={classes.Input} sx={{ mt: 2 }}>
                <InputLabel id="vulnerable-zones-layer-label">
                  Zone vulnerabili ai nitrati
                </InputLabel>
                <Select
                  labelId="vulnerable-zones-layer-label"
                  value={selectedVulnerableZonesLayer}
                  label="Zone vulnerabili ai nitrati"
                  onChange={(e) => setSelectedVulnerableZonesLayer(e.target.value)}
                >
                  <MenuItem value="none">Nessuno</MenuItem>
                  <MenuItem value="IT-25">Lombardia</MenuItem>
                </Select>
              </FormControl>

              {selectedVulnerableZonesLayer !== "none" && (
                <Box sx={{ px: 1, mt: 2 }}>
                  <Typography gutterBottom variant="caption">
                    Opacita layer ZVN: {(vulnerableZonesOpacity * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={vulnerableZonesOpacity}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(_e, value) => setVulnerableZonesOpacity(value)}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" display="block">
                    Fonte: Geoportale Regione Lombardia, licenza CC BY 4.0.
                  </Typography>
                </Box>
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
                          <TableCell>
                            {analysis.organic_matter ?? "-"}
                          </TableCell>
                          <TableCell>{analysis.nitrogen ?? "-"}</TableCell>
                          <TableCell>{analysis.phosphorus ?? "-"}</TableCell>
                          <TableCell>{analysis.potassium ?? "-"}</TableCell>
                          <TableCell>{analysis.notes || "-"}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleDeleteSoilAnalysis(analysis.id)
                              }
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
                        <TableCell>Coltura</TableCell>
                        <TableCell>SAU (ha)</TableCell>
                        <TableCell>Anno</TableCell>
                        <TableCell>Stato</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cropHistory.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell>{h.crop}</TableCell>
                          <TableCell>
                            {annualSau.find((item) => item.year === h.year)
                              ?.sau ?? "-"}
                          </TableCell>
                          <TableCell>{h.year || "-"}</TableCell>
                          <TableCell>{h.is_terminated ? "Terminata" : "Attiva"}</TableCell>
                        </TableRow>
                      ))}
                      {cropHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
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
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Trattamenti Fitosanitari
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Prodotto</TableCell>
                        <TableCell>Quantità</TableCell>
                        <TableCell>Operatore</TableCell>
                        <TableCell>Tempo di carenza</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {treatments.map((treatment) => (
                        <TableRow key={treatment.id}>
                          <TableCell>
                            {new Date(
                              treatment.operation_date,
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {treatment.product?.name || "-"}
                          </TableCell>
                          <TableCell>
                            {treatment.quantity || "-"}{" "}
                            {treatment.unit_of_measure || ""}
                          </TableCell>
                          <TableCell>{treatment.operator || "-"}</TableCell>
                          <TableCell>
                            {treatment.withholding_period || "-"} gg
                          </TableCell>
                        </TableRow>
                      ))}
                      {treatments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            Nessun trattamento registrato.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() =>
                    navigate("/notebook/operations", {
                      state: {
                        initialFarmlandId: farmlandId,
                        initialType: "Trattamento fitosanitario",
                      },
                    })
                  }
                >
                  Nuovo trattamento per questo appezzamento
                </Button>
              </Box>
            )}

            {farmland && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Piano di Fertilizzazione
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Data consigliata</TableCell>
                        <TableCell>Categoria</TableCell>
                        <TableCell>N</TableCell>
                        <TableCell>P</TableCell>
                        <TableCell>K</TableCell>
                        <TableCell>Sostanza organica</TableCell>
                        <TableCell>Note</TableCell>
                        <TableCell align="right">Azioni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fertilizationPlans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>{plan.recommended_date || "-"}</TableCell>
                          <TableCell>{plan.product_category || "-"}</TableCell>
                          <TableCell>{plan.target_n ?? "-"}</TableCell>
                          <TableCell>{plan.target_p ?? "-"}</TableCell>
                          <TableCell>{plan.target_k ?? "-"}</TableCell>
                          <TableCell>{plan.organic_matter ?? "-"}</TableCell>
                          <TableCell>{plan.notes || "-"}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleDeleteFertilizationPlan(plan.id)
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {fertilizationPlans.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            Nessun piano di fertilizzazione registrato.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" onClick={handleOpenFertilizationDialog}>
                    Aggiungi piano
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      navigate("/notebook/operations", {
                        state: {
                          initialFarmlandId: farmlandId,
                          initialType: "Concimazione",
                        },
                      })
                    }
                  >
                    Registra concimazione
                  </Button>
                </Stack>
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
                    ageaCropError || "Seleziona la coltura dal catalogo AGEA."
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
            <TextField
              label="SAU annuale (ha)"
              type="number"
              fullWidth
              inputProps={{ min: 0, step: "0.01" }}
              value={newCrop.sau}
              onChange={(e) =>
                setNewCrop((prev) => ({ ...prev, sau: e.target.value }))
              }
              helperText="Un solo valore per terreno e anno; un nuovo inserimento aggiorna quello esistente."
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newCrop.is_terminated}
                  onChange={(e) =>
                    setNewCrop((prev) => ({
                      ...prev,
                      is_terminated: e.target.checked,
                    }))
                  }
                />
              }
              label="Coltura terminata"
            />
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

      <Dialog
        open={openSoilDialog}
        onClose={() => setOpenSoilDialog(false)}
        fullWidth
        maxWidth="sm"
      >
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
                setNewSoilAnalysis((prev) => ({
                  ...prev,
                  texture: e.target.value,
                }))
              }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="pH"
                type="number"
                fullWidth
                value={newSoilAnalysis.ph}
                onChange={(e) =>
                  setNewSoilAnalysis((prev) => ({
                    ...prev,
                    ph: e.target.value,
                  }))
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
                  setNewSoilAnalysis((prev) => ({
                    ...prev,
                    nitrogen: e.target.value,
                  }))
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
                  setNewSoilAnalysis((prev) => ({
                    ...prev,
                    potassium: e.target.value,
                  }))
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
                setNewSoilAnalysis((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
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
        open={openFertilizationDialog}
        onClose={() => setOpenFertilizationDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Aggiungi piano di fertilizzazione</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Prefill basato sull'ultima analisi terreno disponibile.
            </Alert>
            <TextField
              label="Data consigliata"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newFertilizationPlan.recommended_date}
              onChange={(e) =>
                setNewFertilizationPlan((prev) => ({
                  ...prev,
                  recommended_date: e.target.value,
                }))
              }
            />
            <TextField
              select
              label="Categoria prodotto"
              fullWidth
              value={newFertilizationPlan.product_category}
              onChange={(e) =>
                setNewFertilizationPlan((prev) => ({
                  ...prev,
                  product_category: e.target.value,
                }))
              }
            >
              <MenuItem value="Concime">Concime</MenuItem>
              <MenuItem value="Biostimolante">Biostimolante</MenuItem>
              <MenuItem value="Altro">Altro</MenuItem>
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Target N"
                type="number"
                fullWidth
                value={newFertilizationPlan.target_n}
                onChange={(e) =>
                  setNewFertilizationPlan((prev) => ({
                    ...prev,
                    target_n: e.target.value,
                  }))
                }
              />
              <TextField
                label="Target P"
                type="number"
                fullWidth
                value={newFertilizationPlan.target_p}
                onChange={(e) =>
                  setNewFertilizationPlan((prev) => ({
                    ...prev,
                    target_p: e.target.value,
                  }))
                }
              />
              <TextField
                label="Target K"
                type="number"
                fullWidth
                value={newFertilizationPlan.target_k}
                onChange={(e) =>
                  setNewFertilizationPlan((prev) => ({
                    ...prev,
                    target_k: e.target.value,
                  }))
                }
              />
            </Stack>
            <TextField
              label="Sostanza organica (%)"
              type="number"
              fullWidth
              value={newFertilizationPlan.organic_matter}
              onChange={(e) =>
                setNewFertilizationPlan((prev) => ({
                  ...prev,
                  organic_matter: e.target.value,
                }))
              }
            />
            <TextField
              label="Note"
              fullWidth
              multiline
              minRows={2}
              value={newFertilizationPlan.notes}
              onChange={(e) =>
                setNewFertilizationPlan((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFertilizationDialog(false)}>
            Annulla
          </Button>
          <Button onClick={handleAddFertilizationPlan} variant="contained">
            Salva piano
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
