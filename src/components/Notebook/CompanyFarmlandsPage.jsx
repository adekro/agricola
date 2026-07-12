import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
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
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import MapIcon from "@mui/icons-material/Map";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { useCompanyWorkspace } from "./CompanyWorkspace";
import WorldMap from "../WorldMap/WorldMap";
import { getEnabledMapProviders } from "../../config/mapProviders";
import { getEnabledCadastralLayers } from "../../config/cadastralLayers";

const normalizeCompanyName = (value = "") => value.trim().toLowerCase();

const CompanyFarmlandsPage = ({ mapView = false }) => {
  const { company, farmlands, openFarmland } = useCompanyWorkspace();
  const navigate = useNavigate();
  const [selectedMapProvider, setSelectedMapProvider] = useState("osm");
  const [selectedCadastralLayer, setSelectedCadastralLayer] = useState("none");
  const [focusedCoordinates, setFocusedCoordinates] = useState(null);
  const enabledMapProviders = useMemo(() => getEnabledMapProviders(), []);
  const enabledCadastralLayers = useMemo(
    () => getEnabledCadastralLayers(),
    [],
  );

  const companyFarmlands = useMemo(
    () =>
      (farmlands || []).filter(
        (item) =>
          normalizeCompanyName(item.ownerDisplayName) ===
          normalizeCompanyName(company.name),
      ),
    [company.name, farmlands],
  );

  const mappedFarmlands = companyFarmlands.filter(
    (farmland) =>
      Array.isArray(farmland.coordinates) && farmland.coordinates.length,
  );
  const mappedCoordinates = mappedFarmlands.map(
    (farmland) => farmland.coordinates,
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="all-farmlands-map-provider-label">Mappa base</InputLabel>
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
              onChange={(event) => setSelectedCadastralLayer(event.target.value)}
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
        {mappedCoordinates.length ? (
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
                coordinates={mappedCoordinates}
                focusCoordinates={focusedCoordinates}
                mapProviderKey={selectedMapProvider}
                cadastralLayerKey={selectedCadastralLayer}
              />
            </Paper>
            <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} sx={{ mt: 2 }}>
              {mappedFarmlands.map((farmland) => (
                <Button
                  key={farmland.id}
                  variant="outlined"
                  size="small"
                  onClick={() => setFocusedCoordinates(farmland.coordinates)}
                >
                  {farmland.type || farmland.cadastralParcel || "Terreno"}
                </Button>
              ))}
            </Stack>
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          Terreni azienda
        </Typography>
        <Button
          variant="contained"
          startIcon={<MapIcon />}
          onClick={() => navigate("map")}
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
              <TableCell>Particella catastale</TableCell>
              <TableCell>Coltura attuale</TableCell>
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companyFarmlands.map((farmland) => (
              <TableRow key={farmland.id}>
                <TableCell sx={{ fontWeight: "medium" }}>
                  {farmland.type || "-"}
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
