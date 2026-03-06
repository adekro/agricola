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
import Search from "../Header/Search/Search";
import styles from "./MobileMenu.module.scss";

const MobileMenu = ({
  farmlands,
  onSearchChange,
  onCreateFarmland,
  onFitosanitariClick,
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

            <ListItem
              button
              onClick={() => {
                onFitosanitariClick();
                setIsOpen(false);
              }}
              sx={{ borderRadius: "8px", mb: 1 }}
            >
              <ListItemIcon>
                <ScienceIcon />
              </ListItemIcon>
              <ListItemText primary="Gestione Fitosanitari" />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            RIEPILOGO
          </Typography>
          <List dense>
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
        </Box>
      </Drawer>
    </div>
  );
};

export default MobileMenu;
