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
} from "@mui/material";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";
import { useState, useCallback } from "react";
import classes from "./FarmlandScreen.module.scss";
import DrawableMap from "../WorldMap/DrawableMap/DrawableMap";
import { useMemo } from "react";
import { useFormik } from "formik";
import { useEffect } from "react";
import useFarmlands from "../../hooks/useFarmlands";
import Modal from "../UI/Modal/Modal";
import WorldMap from "../WorldMap/WorldMap";
import { useOutletContext, useParams } from "react-router-dom";
import { getEnabledMapProviders } from "../../config/mapProviders";
import { getEnabledSatelliteLayers } from "../../config/satelliteLayers";
import SatelliteIndices from "./SatelliteIndices/SatelliteIndices";
import { satelliteService } from "../../services/satelliteService";
import { notebookService } from "../../services/notebookService";

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
    props.farmland || (isNew ? null : farmlands.find((farm) => farm.id === farmlandId));

  const [open, setOpen] = useState(true);
  const [area, setArea] = useState();
  const [perimeter, setPerimeter] = useState();
  const [coordinates, setCoordinates] = useState();
  const [error, setError] = useState();
  const [owner, setOwner] = useState("");
  const { companies } = useFarmlands();
  const [isDelFarmland, setIsDelFarmland] = useState(false);

  // Map settings
  const [selectedMapProvider, setSelectedMapProvider] = useState("osm");
  const [selectedSatelliteLayer, setSelectedSatelliteLayer] = useState("none");
  const [satelliteOpacity, setSatelliteOpacity] = useState(0.75);

  // Satellite Indices
  const [satelliteIndices, setSatelliteIndices] = useState(null);
  const [satelliteLoading, setSatelliteLoading] = useState(false);

  // Crop History
  const [cropHistory, setCropHistory] = useState([]);
  const [openCropDialog, setOpenCropDialog] = useState(false);
  const [newCrop, setNewCrop] = useState({ crop: "", start_date: "", end_date: "" });

  const enabledMapProviders = useMemo(() => getEnabledMapProviders(), []);
  const enabledSatelliteLayers = useMemo(() => getEnabledSatelliteLayers(), []);

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

  const onSaveFarmHandler = useCallback(() => {
    const newFarmland = {
      ...formik.values,
      ownerDisplayName: owner,
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
  }, [owner, coordinates, onCreate, handleOnClose, formik.values]);

  const drawCompletedHandler = useCallback(
    ({ area, perimeter, coordinates }) => {
      setArea(area);
      setPerimeter(perimeter);
      setCoordinates(coordinates);
    },
    [setArea, setPerimeter, setCoordinates],
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
      // Use current coordinates if available (from drawing),
      // otherwise fall back to farmland coordinates
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
  }, [isDelFarmland]);

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
    />
  );

  const map = (
    <WorldMap
      coordinates={farmland ? farmland.coordinates : null}
      mapProviderKey={selectedMapProvider}
      satelliteLayerKey={selectedSatelliteLayer}
      satelliteOpacity={satelliteOpacity}
    />
  );

  useEffect(() => {
    if (area && perimeter) {
      formik.setFieldValue("area", area);
      formik.setFieldValue("perimeter", perimeter);
    }
  }, [area, perimeter]);

  useEffect(() => {
    if (farmland) {
      formik.setFieldValue("area", farmland.area || "");
      formik.setFieldValue("perimeter", farmland.perimeter || "");
      formik.setFieldValue("type", farmland.type || "");
      formik.setFieldValue("notes", farmland.notes || "");
      formik.setFieldValue("cadastralParcel", farmland.cadastralParcel || "");
      formik.setFieldValue("currentCrop", farmland.currentCrop || "");
    }
  }, [farmland]);

  useEffect(() => {
    if (farmland) {
      setOwner(farmland.ownerDisplayName);
    }
  }, []);

  const changeCompanyHandler = useCallback((_event, newValue) => {
    if (newValue) {
      setOwner(newValue);
    } else {
      setOwner("");
    }
  }, []);

  const closeHandler = useCallback(() => {
    setError();
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
            <form className={classes.FarmlandForm} onSubmit={formik.handleSubmit}>
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
                error={formik.touched.perimeter && Boolean(formik.errors.perimeter)}
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
                error={formik.touched.cadastralParcel && Boolean(formik.errors.cadastralParcel)}
              />
              <TextField
                onChange={formik.handleChange}
                value={formik.values.currentCrop}
                label="Coltura Attuale"
                name="currentCrop"
                className={classes.Input}
                fullWidth
                error={formik.touched.currentCrop && Boolean(formik.errors.currentCrop)}
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
                  value={formik.values.owner}
                  inputValue={owner}
                  onChange={changeCompanyHandler}
                  onInputChange={changeCompanyHandler}
                  options={companies}
                  renderInput={(params) => (
                    <TextField {...params} label="Company name" />
                  )}
                ></Autocomplete>
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
                  <FormControl fullWidth className={classes.Input} sx={{ mt: 2 }}>
                    <InputLabel id="satellite-layer-label">Layer satellitare</InputLabel>
                    <Select
                      labelId="satellite-layer-label"
                      value={selectedSatelliteLayer}
                      label="Layer satellitare"
                      onChange={(e) => setSelectedSatelliteLayer(e.target.value)}
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
                        Opacità layer satellitare: {(satelliteOpacity * 100).toFixed(0)}%
                      </Typography>
                      <Slider
                        value={satelliteOpacity}
                        min={0}
                        max={1}
                        step={0.05}
                        onChange={(_e, newValue) => setSatelliteOpacity(newValue)}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>
 

            <SatelliteIndices indices={satelliteIndices} loading={satelliteLoading} />

            {farmland && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Storico Colture</Typography>
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
                          <TableCell colSpan={2} align="center">Nessuno storico</TableCell>
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

      <Snackbar
        severity="error"
        open={!!error}
        autoHideDuration={6000}
        onClose={closeHandler}
      >
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
              onChange={(e) => setNewCrop(prev => ({ ...prev, crop: e.target.value }))}
            />
            <TextField
              label="Inizio"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newCrop.start_date}
              onChange={(e) => setNewCrop(prev => ({ ...prev, start_date: e.target.value }))}
            />
            <TextField
              label="Fine"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newCrop.end_date}
              onChange={(e) => setNewCrop(prev => ({ ...prev, end_date: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCropDialog(false)}>Annulla</Button>
          <Button onClick={handleAddCropHistory} variant="contained">Aggiungi</Button>
        </DialogActions>
      </Dialog>
    </FullScreenDialog>
  );
};

export default FarmlandScreen;
