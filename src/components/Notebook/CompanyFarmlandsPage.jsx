import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import MapIcon from "@mui/icons-material/Map";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { useCompanyWorkspace } from "./CompanyWorkspace";
import WorldMap from "../WorldMap/WorldMap";
import { getEnabledMapProviders } from "../../config/mapProviders";
import { getEnabledCadastralLayers } from "../../config/cadastralLayers";
import { notebookService } from "../../services/notebookService";

const normalizeCompanyName = (value = "") => value.trim().toLowerCase();

const CompanyFarmlandsPage = ({ mapView = false }) => {
  const { company, farmlands, openFarmland } = useCompanyWorkspace();
  const navigate = useNavigate();
  const [selectedMapProvider, setSelectedMapProvider] = useState("osm");
  const [selectedCadastralLayer, setSelectedCadastralLayer] = useState("none");
  const [focusedCoordinates, setFocusedCoordinates] = useState(null);
  const [selectedFarmland, setSelectedFarmland] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const enabledMapProviders = useMemo(() => getEnabledMapProviders(), []);
  const enabledCadastralLayers = useMemo(() => getEnabledCadastralLayers(), []);

  const companyFarmlands = useMemo(
    () =>
      (farmlands || []).filter(
        (item) =>
          normalizeCompanyName(item.ownerDisplayName) ===
          normalizeCompanyName(company.name),
      ),
    [company.name, farmlands],
  );

  const geometryPolygons = useCallback((geometry, fallbackCoordinates) => {
    if (geometry?.type === "MultiPolygon") {
      return geometry.coordinates.map((polygon) => polygon[0]);
    }
    if (geometry?.type === "Polygon") return [geometry.coordinates[0]];
    return fallbackCoordinates?.length ? [fallbackCoordinates] : [];
  }, []);

  const polygonFeatures = useMemo(
    () =>
      companyFarmlands.flatMap((farmland) => {
        const cadastralFeatures = geometryPolygons(
          farmland.cadastralCoverageGeometry,
          null,
        ).map((coordinates) => ({
          id: farmland.id,
          coordinates,
          geometryType: "cadastral",
        }));
        const terrainFeatures = geometryPolygons(
          farmland.geometry,
          farmland.coordinates,
        ).map((coordinates) => ({
          id: farmland.id,
          coordinates,
          geometryType: "terrain",
        }));
        return [...cadastralFeatures, ...terrainFeatures];
      }),
    [companyFarmlands, geometryPolygons],
  );

  const mappedFarmlands = companyFarmlands.filter((farmland) =>
    polygonFeatures.some((feature) => feature.id === farmland.id),
  );

  const focusCoordinatesFor = useCallback(
    (farmlandId) =>
      polygonFeatures.find(
        (feature) =>
          feature.id === farmlandId && feature.geometryType === "terrain",
      )?.coordinates ||
      polygonFeatures.find((feature) => feature.id === farmlandId)?.coordinates ||
      null,
    [polygonFeatures],
  );

  const handleFarmlandClick = useCallback(
    async (farmlandId) => {
      const selected = companyFarmlands.find((item) => item.id === farmlandId);
      if (!selected) return;
      setSelectedFarmland(selected);
      setSummary(null);
      setSummaryError("");
      setSummaryLoading(true);
      try {
        setSummary(await notebookService.getFarmlandSummary(farmlandId));
      } catch (error) {
        setSummaryError(
          error.message || "Impossibile caricare i dati del terreno.",
        );
      } finally {
        setSummaryLoading(false);
      }
    },
    [companyFarmlands],
  );

  if (mapView) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("../farmlands")}
          sx={{ mb: 2 }}
        >
          Torna all'elenco
        </Button>
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
          Tutti i terreni
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Terreni collegati a {company.name} evidenziati sulla mappa.
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <FormControl fullWidth>
            <InputLabel id="all-farmlands-map-provider-label">
              Mappa base
            </InputLabel>
            <Select
              labelId="all-farmlands-map-provider-label"
              value={selectedMapProvider}
              label="Mappa base"
              onChange={(event) => setSelectedMapProvider(event.target.value)}
            >
              {enabledMapProviders.map((provider) => (
                <MenuItem key={provider.key} value={provider.key}>
                  {provider.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="all-farmlands-cadastral-layer-label">
              Layer catastale
            </InputLabel>
            <Select
              labelId="all-farmlands-cadastral-layer-label"
              value={selectedCadastralLayer}
              label="Layer catastale"
              onChange={(event) =>
                setSelectedCadastralLayer(event.target.value)
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
        </Stack>
        {polygonFeatures.length ? (
          <>
            <Paper
              variant="outlined"
              sx={{
                width: "100%",
                height: { xs: "60vh", md: "70vh" },
                minHeight: 400,
                overflow: "hidden",
              }}
            >
              <WorldMap
                polygonFeatures={polygonFeatures}
                focusCoordinates={focusedCoordinates}
                selectedFarmlandId={selectedFarmland?.id}
                onFarmlandClick={handleFarmlandClick}
                mapProviderKey={selectedMapProvider}
                cadastralLayerKey={selectedCadastralLayer}
              />
            </Paper>
            <Stack
              direction="row"
              useFlexGap
              flexWrap="wrap"
              spacing={1}
              sx={{ mt: 2 }}
            >
              {mappedFarmlands.map((farmland) => (
                <Button
                  key={farmland.id}
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    setFocusedCoordinates(focusCoordinatesFor(farmland.id))
                  }
                >
                  {farmland.name ||
                    farmland.type ||
                    farmland.cadastralParcel ||
                    "Terreno"}
                </Button>
              ))}
            </Stack>
            <Drawer
              anchor="right"
              open={Boolean(selectedFarmland)}
              onClose={() => setSelectedFarmland(null)}
              PaperProps={{ sx: { width: { xs: "100%", sm: 440 }, p: 3 } }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  {selectedFarmland?.name ||
                    selectedFarmland?.type ||
                    "Terreno"}
                </Typography>
                <IconButton
                  onClick={() => setSelectedFarmland(null)}
                  aria-label="Chiudi"
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Area: {selectedFarmland?.area || "-"} ha
              </Typography>
              {selectedFarmland?.geometryStatus === "cadastral_coverage" ? (
                <Typography color="warning.main" variant="body2" sx={{ mt: 1 }}>
                  La geometria visualizzata è una copertura catastale; il confine agronomico non è definito.
                </Typography>
              ) : null}
              <Divider sx={{ my: 2 }} />
              {summaryLoading ? <CircularProgress size={28} /> : null}
              {summaryError ? (
                <Typography color="error">{summaryError}</Typography>
              ) : null}
              {summary ? (
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h6">
                      Identificazioni catastali
                    </Typography>
                    {summary.cadastralIdentifiers.length ? (
                      summary.cadastralIdentifiers.map((item) => (
                        <Typography key={item.id} variant="body2">
                          {item.province ? `${item.province}, ` : ""}
                          {item.municipality} — foglio {item.sheet}, particella{" "}
                          {item.parcel}
                          {item.subaltern ? `, sub. ${item.subaltern}` : ""}
                        </Typography>
                      ))
                    ) : (
                      <Typography color="text.secondary">
                        Nessuna identificazione.
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="h6">Colture ultimi 5 anni</Typography>
                    {summary.crops.length ? (
                      summary.crops.map((item) => (
                        <Typography key={item.id} variant="body2">
                          {item.year}: {item.agea_label || item.crop}
                        </Typography>
                      ))
                    ) : (
                      <Typography color="text.secondary">
                        Nessuna coltura registrata.
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="h6">SAU annuale</Typography>
                    {summary.annualSau.length ? (
                      summary.annualSau.map((item) => (
                        <Typography key={item.id} variant="body2">
                          {item.year}: {item.sau} ha
                        </Typography>
                      ))
                    ) : (
                      <Typography color="text.secondary">
                        Nessun dato SAU registrato.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ) : null}
            </Drawer>
          </>
        ) : (
          <Typography color="text.secondary">
            Nessun terreno con coordinate disponibile.
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          Terreni azienda
        </Typography>
        <Button
          variant="contained"
          startIcon={<MapIcon />}
          onClick={() =>
            navigate(`/notebook/company/${company.id}/farmlands/map`)
          }
        >
          Visualizza tutti i terreni
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Elenco degli appezzamenti collegati a {company.name}.
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Appezzamento</TableCell>
              <TableCell>Area</TableCell>
              <TableCell>Perimetro</TableCell>
              <TableCell>Coltura attuale</TableCell>
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companyFarmlands.map((farmland) => (
              <TableRow key={farmland.id}>
                <TableCell sx={{ fontWeight: "medium" }}>
                  {farmland.name || farmland.type || "-"}
                </TableCell>
                <TableCell>{farmland.area || "-"}</TableCell>
                <TableCell>{farmland.perimeter || "-"}</TableCell>
                <TableCell>{farmland.cadastralParcel || "-"}</TableCell>
                <TableCell>{farmland.currentCrop || "-"}</TableCell>
                <TableCell align="right">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => openFarmland(farmland.id)}
                  >
                    Apri scheda
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {companyFarmlands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  Nessun terreno collegato a questa azienda.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CompanyFarmlandsPage;
