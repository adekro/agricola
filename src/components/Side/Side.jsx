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

const Side = ({ onSelect, active }) => {
  const [itemActive, setItemActive] = useState(active);

  const handlerClick = (target) => {
    onSelect(target);
    setItemActive(target);
  };

  return (
    <div className={classes.sideContainer}>
      <div className={classes.sideHeader}>
        <div className={classes.riepilogoTitle}>Riepilogo</div>
        <div className={classes.riepilogoSubtitle}>Statistiche generali</div>
      </div>

      <div className={classes.statsContainer}>
        <div className={classes.statCard}>
          <div className={`${classes.statIcon} ${classes.greenIcon}`}>
            <GridViewIcon />
          </div>
          <div className={classes.statText}>
            <div className={classes.statLabel}>NUMERO DI CAMPI</div>
            <div className={classes.statValue}>3</div>
          </div>
        </div>

        <div className={classes.statCard}>
          <div className={`${classes.statIcon} ${classes.greenIcon}`}>
            <StraightenIcon />
          </div>
          <div className={classes.statText}>
            <div className={classes.statLabel}>AREA TOTALE</div>
            <div className={classes.statValue}>469m²</div>
          </div>
        </div>

        <div className={classes.statCard}>
          <div className={`${classes.statIcon} ${classes.greenIcon}`}>
            <HubIcon />
          </div>
          <div className={classes.statText}>
            <div className={classes.statLabel}>PERIMETRO</div>
            <div className={classes.statValue}>124m</div>
          </div>
        </div>
      </div>

      <button
        className={classes.fitosanitariBtn}
        onClick={() => handlerClick("fitosanitari")}
      >
        <ScienceIcon /> GESTIONE FITOSANITARI
      </button>

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
