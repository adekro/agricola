import React from "react";
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
import YoloIcon from "@mui/icons-material/Yard";
import AgricultureIcon from "@mui/icons-material/Agriculture";

const Side = ({ onSelect, active, farmlands = [] }) => {
  const handlerClick = (target) => {
    onSelect(target);
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

      <nav className={classes.sidecontent}>
        <SideItem
          onClick={handlerClick}
          label="Dashboard"
          target="dashboard"
          icon={DashboardIcon}
          active={active === "dashboard"}
        />
        <SideItem
          onClick={handlerClick}
          label="Terreni"
          target="farmlands"
          icon={MapIcon}
          active={active === "farmlands"}
        />
        <SideItem
          onClick={handlerClick}
          label="Aziende"
          target="notebook-company"
          icon={BusinessIcon}
          active={active === "notebook-company"}
        />
        <SideItem
          onClick={handlerClick}
          label="Raccolte"
          target="notebook-harvests"
          icon={AgricultureIcon}
          active={active === "notebook-harvests"}
        />
        <SideItem
          onClick={handlerClick}
          label="Evidenzia Mappali"
          target="evidenzia-mappali"
          icon={YoloIcon}
          active={active === "evidenzia-mappali"}
        />
        <SideItem
          onClick={handlerClick}
          label="Banca dati Fitosanitari"
          target="fitosanitari"
          icon={ScienceIcon}
          active={active === "fitosanitari"}
        />
        <SideItem
          onClick={handlerClick}
          label="Impostazioni"
          target="settings"
          icon={SettingsIcon}
          active={active === "settings"}
        />
      </nav>
    </div>
  );
};

export default Side;
