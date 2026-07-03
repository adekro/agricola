import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import DescriptionIcon from "@mui/icons-material/Description";
import GroupsIcon from "@mui/icons-material/Groups";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { NavLink, Outlet, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { notebookService } from "../../services/notebookService";

const navItems = [
  { label: "Contatti principali", to: "contacts", icon: <GroupsIcon fontSize="small" /> },
  { label: "Rete operativa", to: "operators", icon: <PrecisionManufacturingIcon fontSize="small" /> },
  { label: "Rete commerciale", to: "network", icon: <StorefrontIcon fontSize="small" /> },
  { label: "Documenti", to: "documents", icon: <DescriptionIcon fontSize="small" /> },
  { label: "Terreni", to: "farmlands", icon: <AgricultureIcon fontSize="small" /> },
  { label: "Magazzino", to: "inventory", icon: <InventoryIcon fontSize="small" /> },
];

export const useCompanyWorkspace = () => useOutletContext();

const CompanyWorkspace = () => {
  const layoutContext = useOutletContext() || {};
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", severity: "success" });
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      setLoading(true);
      try {
        const data = await notebookService.getCompany(companyId);
        setCompany(data);
      } catch (error) {
        setMessage({ text: `Errore caricamento azienda: ${error.message}`, severity: "error" });
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  if (loading) {
    return <Typography sx={{ p: 3 }}>Caricamento azienda...</Typography>;
  }

  if (!company) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Azienda non trovata.</Typography>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate("/notebook/company")}>
          Torna all'elenco
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
          <Box>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/notebook/company")} sx={{ mb: 1, px: 0 }}>
              Elenco aziende
            </Button>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              {company.name}
            </Typography>
            <Typography color="text.secondary">
              {company.vat_number || "P. IVA non indicata"} | {company.address || "Indirizzo non indicato"}
            </Typography>
          </Box>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap flexWrap="wrap">
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                variant="outlined"
                startIcon={item.icon}
                sx={{
                  justifyContent: "flex-start",
                  "&.active": {
                    bgcolor: "primary.main",
                    borderColor: "primary.main",
                    color: "primary.contrastText",
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Paper>

        <Outlet
          context={{
            company,
            setCompany,
            farmlands: layoutContext.farmlands || [],
            openFarmland: layoutContext.onClick || (() => {}),
          }}
        />
      </Stack>

      <Snackbar open={openSnackbar} autoHideDuration={5000} onClose={() => setOpenSnackbar(false)}>
        <Alert severity={message.severity} onClose={() => setOpenSnackbar(false)}>
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CompanyWorkspace;
