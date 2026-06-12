import React, { useState } from "react";
import classes from "./Side.module.css";
import SideItem from "./SideItem";
import MapIcon from "@mui/icons-material/Map";
import SettingsIcon from "@mui/icons-material/Settings";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ScienceIcon from "@mui/icons-material/Science";
import GridViewIcon from "@mui/icons-material/GridView";
import StraightenIcon from "@mui/icons-material/Straighten";
import HubIcon from "@mui/icons-material/Hub";
import BusinessIcon from "@mui/icons-material/Business";
import InventoryIcon from "@mui/icons-material/Inventory";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BookIcon from "@mui/icons-material/Book";

const Side = ({ onSelect, active, farmlands = [] }) => {
  const [itemActive, setItemActive] = useState(active);

  const handlerClick = (target) => {
    onSelect(target);
    setItemActive(target);
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
    <div className={classes.sideContainer}>
      <div className={classes.sideHeader}>
        <img
          src="/logolabel.png"
          alt="Agricola logo"
          className={classes.logoSidebar}
        />
      </div>

      <div className={classes.statsContainer}>
        <div className={classes.statCard}>
          <div className={`${classes.statIcon} ${classes.greenIcon}`}>
            <GridViewIcon />
          </div>
          <div className={classes.statText}>
            <div className={classes.statLabel}>NUMERO DI CAMPI</div>
            <div className={classes.statValue}>{numberfields}</div>
          </div>
        </div>

        <div className={classes.statCard}>
          <div className={`${classes.statIcon} ${classes.greenIcon}`}>
            <StraightenIcon />
          </div>
          <div className={classes.statText}>
            <div className={classes.statLabel}>AREA TOTALE</div>
            <div className={classes.statValue}>{area}m²</div>
          </div>
        </div>

        <div className={classes.statCard}>
          <div className={`${classes.statIcon} ${classes.greenIcon}`}>
            <HubIcon />
          </div>
          <div className={classes.statText}>
            <div className={classes.statLabel}>PERIMETRO</div>
            <div className={classes.statValue}>{perimeter}m</div>
          </div>
        </div>
      </div>

      <button
        className={classes.fitosanitariBtn}
        onClick={() => handlerClick("fitosanitari")}
      >
        <ScienceIcon /> BANCA DATI FITOSANITARI
      </button>

      <div className={classes.notebookSection}>
        <div className={classes.sectionTitle}>
          <BookIcon fontSize="small" /> QUADERNO DI CAMPAGNA
        </div>
        <SideItem
          onClick={handlerClick}
          label="Anagrafica Azienda"
          target="notebook-company"
          icon={BusinessIcon}
          active={itemActive === "notebook-company"}
        />
        <SideItem
          onClick={handlerClick}
          label="Registro Attività"
          target="notebook-operations"
          icon={AssignmentIcon}
          active={itemActive === "notebook-operations"}
        />
        <SideItem
          onClick={handlerClick}
          label="Magazzino"
          target="notebook-inventory"
          icon={InventoryIcon}
          active={itemActive === "notebook-inventory"}
        />
      </div>

      <nav className={classes.sidecontent}>
        <SideItem
          onClick={handlerClick}
          label="Dashboard"
          target="dashboard"
          icon={DashboardIcon}
          active={itemActive === "dashboard"}
        />
        <SideItem
          onClick={handlerClick}
          label="Terreni"
          target="farmlands"
          icon={MapIcon}
          active={itemActive === "farmlands"}
        />
        <SideItem
          onClick={handlerClick}
          label="Impostazioni"
          target="settings"
          icon={SettingsIcon}
          active={itemActive === "settings"}
        />
      </nav>
    </div>
  );
};

export default Side;
