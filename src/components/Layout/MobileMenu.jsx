import React, { useState } from "react";
import {
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ScienceIcon from "@mui/icons-material/Science";
import GridViewIcon from "@mui/icons-material/GridView";
import StraightenIcon from "@mui/icons-material/Straighten";
import HubIcon from "@mui/icons-material/Hub";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MapIcon from "@mui/icons-material/Map";
import BusinessIcon from "@mui/icons-material/Business";
import SettingsIcon from "@mui/icons-material/Settings";
import YoloIcon from "@mui/icons-material/Yard";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import Search from "../Header/Search/Search";
import styles from "./MobileMenu.module.scss";

const MobileMenu = ({
  farmlands,
  onSearchChange,
  onCreateFarmland,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setIsOpen(open);
  };

  const numberfields = farmlands ? farmlands.length : 0;
  const area = farmlands
    ? farmlands.reduce((prevVal, currVal) => prevVal + (currVal.area || 0), 0)
    : 0;
  const perimeter = farmlands
    ? farmlands.reduce(
        (prevVal, currVal) => prevVal + (currVal.perimeter || 0),
        0,
      )
    : 0;

  const handleNavClick = (target) => {
    onSelect(target);
    setIsOpen(false);
  };

  return (
    <div className={styles.mobileMenuContainer}>
      <IconButton
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={toggleDrawer(true)}
      >
        <MenuIcon />
      </IconButton>
      <Drawer anchor="right" open={isOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 280, p: 2 }}
          role="presentation"
          onKeyDown={toggleDrawer(false)}
        >
          <Typography variant="h6" gutterBottom>
            Menu
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Search mode="farmlands" onChange={onSearchChange} />
          </Box>

          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            RIEPILOGO
          </Typography>
          <List dense sx={{ mb: 2 }}>
            <ListItem>
              <ListItemIcon>
                <GridViewIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="NUMERO DI CAMPI"
                secondary={numberfields}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <StraightenIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="AREA TOTALE" secondary={`${area}m²`} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <HubIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="PERIMETRO" secondary={`${perimeter}m`} />
            </ListItem>
          </List>

          <Divider sx={{ mb: 2 }} />

          <List>
            <ListItem
              button
              onClick={() => {
                onCreateFarmland();
                setIsOpen(false);
              }}
              sx={{
                bgcolor: "var(--secondary-color)",
                color: "white",
                borderRadius: "8px",
                mb: 1,
                "&:hover": { bgcolor: "var(--secondary-color-dark)" },
              }}
            >
              <ListItemIcon sx={{ color: "white" }}>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary="Nuovo Terreno" />
            </ListItem>

            <ListItem button onClick={() => handleNavClick("dashboard")}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>

            <ListItem button onClick={() => handleNavClick("farmlands")}>
              <ListItemIcon>
                <MapIcon />
              </ListItemIcon>
              <ListItemText primary="Terreni" />
            </ListItem>

            <ListItem button onClick={() => handleNavClick("notebook-company")}>
              <ListItemIcon>
                <BusinessIcon />
              </ListItemIcon>
              <ListItemText primary="Aziende" />
            </ListItem>

            <ListItem button onClick={() => handleNavClick("notebook-harvests")}>
              <ListItemIcon>
                <AgricultureIcon />
              </ListItemIcon>
              <ListItemText primary="Raccolte" />
            </ListItem>

            <ListItem
              button
              onClick={() => handleNavClick("evidenzia-mappali")}
            >
              <ListItemIcon>
                <YoloIcon />
              </ListItemIcon>
              <ListItemText primary="Evidenzia Mappali" />
            </ListItem>

            <ListItem button onClick={() => handleNavClick("fitosanitari")}>
              <ListItemIcon>
                <ScienceIcon />
              </ListItemIcon>
              <ListItemText primary="Banca dati Fitosanitari" />
            </ListItem>

            <ListItem button onClick={() => handleNavClick("settings")}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Impostazioni" />
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </div>
  );
};

export default MobileMenu;
