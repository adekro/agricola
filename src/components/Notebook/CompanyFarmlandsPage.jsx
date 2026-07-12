import React, { useMemo } from "react";
import {
  Box,
  Button,
  Paper,
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

const normalizeCompanyName = (value = "") => value.trim().toLowerCase();

const CompanyFarmlandsPage = ({ mapView = false }) => {
  const { company, farmlands, openFarmland } = useCompanyWorkspace();
  const navigate = useNavigate();

  const companyFarmlands = useMemo(
    () =>
      (farmlands || []).filter(
        (item) =>
          normalizeCompanyName(item.ownerDisplayName) ===
          normalizeCompanyName(company.name),
      ),
    [company.name, farmlands],
  );

  const mappedCoordinates = companyFarmlands
    .map((farmland) => farmland.coordinates)
    .filter((coordinates) => Array.isArray(coordinates) && coordinates.length);

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
        {mappedCoordinates.length ? (
          <Paper
            variant="outlined"
            sx={{
              width: "100%",
              height: { xs: "60vh", md: "70vh" },
              minHeight: 400,
              overflow: "hidden",
            }}
          >
            <WorldMap coordinates={mappedCoordinates} />
          </Paper>
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
