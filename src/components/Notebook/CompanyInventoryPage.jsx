import React from "react";
import { Box, Typography } from "@mui/material";
import ProductInventory from "./ProductInventory";
import { useCompanyWorkspace } from "./CompanyWorkspace";

const CompanyInventoryPage = () => {
  const { company } = useCompanyWorkspace();

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
        Magazzino
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Prodotti e giacenze collegati a {company.name}.
      </Typography>
      <ProductInventory companyId={company.id} />
    </Box>
  );
};

export default CompanyInventoryPage;
