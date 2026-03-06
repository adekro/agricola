import React, { useCallback, useState } from "react";
import classes from "./Layout.module.scss";
import useFarmlands from "../../hooks/useFarmlands";
// import FarmlandsList from "../FarmlandsList/FarmlandsList";
import Header from "../Header/Header";
import Search from "../Header/Search/Search";
import Summary from "../Summary/Summary";
import { Button, Box } from "@mui/material";
// import FarmlandScreen from "../FarmlandScreen/FarmlandScreen";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";

const Layout = () => {
  const {
    farmlands,
    addFarmland,
    updateFarmland,
    reloadFarmland,
    removeFarmland,
  } = useFarmlands();
  const [filterString, setFilterString] = useState("");
  const [createMode, setCreateMode] = useState();
  const navigate = useNavigate();
  const location = useLocation();

  const isListView =
    location.pathname === "/" || location.pathname === "/farmlands";

  const handlerSelectSide = useCallback(() => {
    navigate("/");
  }, [navigate]);

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
      // Do something
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

  const addFarmlandHandler = useCallback((newFarmland) => {
    addFarmland(newFarmland);
  }, []);
  const updateFarmlandHeader = useCallback((idFarmland, modFarmland) => {
    updateFarmland(idFarmland, modFarmland);
  }, []);

  const removeFarmlandHandler = useCallback((farm) => {
    removeFarmland(farm);
  }, []);

  return (
    <React.Fragment>
      <Header>
        <div className={classes.HeaderWrapper}>
          <Search
            className={classes.HeaderSearchbox}
            mode={"farmlands"}
            onChange={searchChangeHandler}
          />
          <Button variant="contained" onClick={onCreateButtonClickHandler}>
            Create farmland
          </Button>
        </div>
      </Header>
      <div className={classes.layoutBody}>
        <div className={classes.layoutSide}>
          <div className={classes.layoutSidecontent}>
            {isListView && <Summary farmlands={filterFarmlandsList()} />}
            <Box
              sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}
            >
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate("/fitosanitari")}
                sx={{
                  color: "primary.main",
                  borderColor: "primary.main",
                  textTransform: "none",
                }}
              >
                Gestione Fitosanitari
              </Button>
            </Box>
          </div>
        </div>
        <div className={classes.layoutContent}>
          <Outlet
            context={{
              farmlands: filterFarmlandsList(),
              onClick: handlerFarmlandOnClick,
              onClose: handlerSelectSide,
              onDelete: removeFarmlandHandler,
              onUpdate: updateFarmlandHeader,
              onCreate: addFarmlandHandler,
              closeCreateScreen: closeCreateScreenHandler,
              createMode: createMode,
            }}
          />
        </div>
      </div>
      {createMode === "farmland" ? (
        <FarmlandScreen
          onClose={closeCreateScreenHandler}
          onCreate={addFarmlandHandler}
        />
      ) : null}
    </React.Fragment>
  );
};
export default Layout;
