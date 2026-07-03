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
import { useCompanyWorkspace } from "./CompanyWorkspace";

const normalizeCompanyName = (value = "") => value.trim().toLowerCase();

const CompanyFarmlandsPage = () => {
  const { company, farmlands, openFarmland } = useCompanyWorkspace();

  const companyFarmlands = useMemo(
    () =>
      (farmlands || []).filter(
        (item) =>
          normalizeCompanyName(item.ownerDisplayName) ===
          normalizeCompanyName(company.name),
      ),
    [company.name, farmlands],
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
        Terreni azienda
      </Typography>
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
