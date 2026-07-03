import React from "react";
import { Paper, Stack, Typography } from "@mui/material";
import { useCompanyWorkspace } from "./CompanyWorkspace";

const CompanyOverviewPage = () => {
  const { company } = useCompanyWorkspace();

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          Scheda azienda
        </Typography>
        <Typography><strong>Nome:</strong> {company.name}</Typography>
        <Typography><strong>P. IVA:</strong> {company.vat_number || "-"}</Typography>
        <Typography><strong>Titolare legacy:</strong> {company.owner_name || "-"}</Typography>
        <Typography><strong>Telefono:</strong> {company.phone || "-"}</Typography>
        <Typography><strong>Email:</strong> {company.email || "-"}</Typography>
        <Typography><strong>Indirizzo:</strong> {company.address || "-"}</Typography>
      </Stack>
    </Paper>
  );
};

export default CompanyOverviewPage;
