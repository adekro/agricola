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

const Layout = () => {
  const { farmlands, addFarmland, updateFarmland, removeFarmland } =
    useFarmlands();
  const [filterString, setFilterString] = useState("");
  const [createMode, setCreateMode] = useState();
  const navigate = useNavigate();
  const location = useLocation();

  const isListView =
    location.pathname === "/" || location.pathname === "/farmlands";

  const handlerSelectSide = useCallback(
    (target) => {
      if (target === "dashboard") navigate("/");
      else if (target === "farmlands") navigate("/farmlands");
      else if (target === "fitosanitari") navigate("/fitosanitari");
    },
    [navigate],
  );

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
    setCreateMode("farmland");
  }, []);

  const closeCreateScreenHandler = useCallback(() => {
    setCreateMode();
  }, []);

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

  return (
    <div className={classes.layoutRoot}>
      <aside className={classes.layoutSide}>
        <Side
          onSelect={handlerSelectSide}
          active={location.pathname === "/" ? "dashboard" : "farmlands"}
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
                startIcon={<AddIcon />}
                onClick={onCreateButtonClickHandler}
                sx={{
                  bgcolor: "var(--secondary-color)",
                  "&:hover": { bgcolor: "var(--secondary-color-dark)" },
                  textTransform: "none",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  px: 3,
                  whiteSpace: "nowrap",
                }}
              >
                Nuovo Terreno
              </Button>
            </div>
            <MobileMenu
              farmlands={farmlands}
              onSearchChange={searchChangeHandler}
              onCreateFarmland={onCreateButtonClickHandler}
              onFitosanitariClick={() => handlerSelectSide("fitosanitari")}
            />
          </div>
        </Header>

        <section className={classes.layoutContent}>
          <Outlet
            context={{
              farmlands: filterFarmlandsList(),
              onClick: handlerFarmlandOnClick,
              onClose: () => navigate("/"),
              onDelete: removeFarmlandHandler,
              onUpdate: updateFarmlandHeader,
              onCreate: addFarmlandHandler,
              closeCreateScreen: closeCreateScreenHandler,
              createMode: createMode,
            }}
          />
        </section>
      </main>
    </div>
  );
};
export default Layout;
