import React, { useCallback, useState } from "react";
import classes from "./Layout.module.scss";
import useFarmlands from "../../hooks/useFarmlands";
import Header from "../Header/Header";
import Search from "../Header/Search/Search";
import Side from "../Side/Side";
import MobileMenu from "./MobileMenu";
import { Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  EvidenziaMappaliModal,
  EvidenziaMappaliScreen,
} from "../EvidenziaMappali";

const Layout = () => {
  const { farmlands, addFarmland, updateFarmland, removeFarmland } =
    useFarmlands();
  const [filterString, setFilterString] = useState("");
  const [evidenziaModalOpen, setEvidenziaModalOpen] = useState(false);
  const [evidenziaRows, setEvidenziaRows] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isListView =
    location.pathname === "/" || location.pathname === "/farmlands";

  const handlerSelectSide = useCallback(
    (target) => {
      if (target === "dashboard") navigate("/");
      else if (target === "farmlands") navigate("/farmlands");
      else if (target === "fitosanitari") navigate("/fitosanitari");
      else if (target === "notebook-company") navigate("/notebook/company");
      else if (target === "notebook-inventory") navigate("/notebook/inventory");
      else if (target === "notebook-operations")
        navigate("/notebook/operations");
      else if (target === "evidenzia-mappali") setEvidenziaModalOpen(true);
    },
    [navigate],
  );

  const handleEvidenziaNavigateToMap = useCallback((rows) => {
    setEvidenziaModalOpen(false);
    setEvidenziaRows(rows);
  }, []);

  const handleEvidenziaBack = useCallback(() => {
    setEvidenziaRows(null);
  }, []);

  const handlerFarmlandOnClick = useCallback(
    (id) => {
      navigate(`/farmland/${id}`);
    },
    [navigate],
  );

  const filterFarmlandsList = useCallback(() => {
    try {
      return farmlands.filter((item) => {
        const valueToSearch = `${item?.type} 
            ${item?.name} 
            ${item?.ownerDisplayName}`.toLowerCase();

        return valueToSearch.indexOf(filterString) > -1;
      });
    } catch (error) {
      console.log(error);
    }
  }, [filterString, farmlands]);

  const searchChangeHandler = useCallback((value) => {
    setFilterString(value);
  }, []);

  const onCreateButtonClickHandler = useCallback(() => {
    navigate("/farmland/new");
  }, [navigate]);

  const addFarmlandHandler = useCallback(
    (newFarmland) => {
      addFarmland(newFarmland);
    },
    [addFarmland],
  );

  const updateFarmlandHeader = useCallback(
    (idFarmland, modFarmland) => {
      updateFarmland(idFarmland, modFarmland);
    },
    [updateFarmland],
  );

  const removeFarmlandHandler = useCallback(
    (farm) => {
      removeFarmland(farm);
    },
    [removeFarmland],
  );

  const filteredFarmlands = filterFarmlandsList();

  return (
    <div className={classes.layoutRoot}>
      <aside className={classes.layoutSide}>
        <Side
          onSelect={handlerSelectSide}
          active={location.pathname === "/" ? "dashboard" : "farmlands"}
          farmlands={filteredFarmlands}
        />
      </aside>

      <main className={classes.layoutMain}>
        <Header className={classes.layoutHeader}>
          <div className={classes.headerContent}>
            <div className={classes.desktopOnly}>
              <Search
                className={classes.headerSearch}
                mode={"farmlands"}
                onChange={searchChangeHandler}
              />
              <Button
                variant="contained"
                onClick={onCreateButtonClickHandler}
                sx={{
                  bgcolor: "var(--secondary-color)",
                  "&:hover": { bgcolor: "var(--secondary-color-dark)" },
                  textTransform: "none",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  minWidth: "auto",
                  width: "45px",
                  height: "45px",
                  padding: 0,
                }}
              >
                <AddIcon />
              </Button>
            </div>
            <MobileMenu
              farmlands={filteredFarmlands}
              onSearchChange={searchChangeHandler}
              onCreateFarmland={onCreateButtonClickHandler}
              onFitosanitariClick={() => handlerSelectSide("fitosanitari")}
            />
          </div>
        </Header>

        <section className={classes.layoutContent}>
          {evidenziaRows ? (
            <EvidenziaMappaliScreen
              mappaliRows={evidenziaRows}
              onBack={handleEvidenziaBack}
            />
          ) : (
            <Outlet
              context={{
                farmlands: filteredFarmlands,
                onClick: handlerFarmlandOnClick,
                onClose: () => navigate("/"),
                onDelete: removeFarmlandHandler,
                onUpdate: updateFarmlandHeader,
                onCreate: addFarmlandHandler,
              }}
            />
          )}
        </section>
      </main>

      <EvidenziaMappaliModal
        open={evidenziaModalOpen}
        onClose={() => setEvidenziaModalOpen(false)}
        onNavigateToMap={handleEvidenziaNavigateToMap}
      />
    </div>
  );
};
export default Layout;
