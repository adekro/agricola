import React, { useCallback, useState } from "react";
import classes from "./Layout.module.scss";
import useFarmlands from "../../hooks/useFarmlands";
import FarmlandsList from "../FarmlandsList/FarmlandsList";
import Header from "../Header/Header";
import Search from "../Header/Search/Search";
import Summary from "../Summary/Summary";
import { Button } from "@mui/material";
import NewFarmlandScreen from "../NewFarmlandScreen/NewFarmlandScreen";
import NewCompanyScreen from "../NewCompanyScreen/NewCompanyScreen";
import FarmlandScreen from "../FarmlandScreen/FarmlandScreen";

const Layout = () => {
  const { farmlands, addFarmland, reloadFarmland, removeFarmland } =
    useFarmlands();
  const [filterString, setFilterString] = useState("");
  const [viewFarmland, setViewFarmland] = useState(null);
  const [createMode, setCreateMode] = useState();

  const handlerSelectSide = useCallback(() => {
    setViewFarmland(null);
    // reloadFarmland();
  }, []);

  const handlerFarmlandOnClick = useCallback((id) => {
    setViewFarmland(id);
  }, []);

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
        {viewFarmland === null && (
          <>
            <div className={classes.layoutSide}>
              <div className={classes.layoutSidecontent}>
                {viewFarmland === null && (
                  <Summary farmlands={filterFarmlandsList()} />
                )}
              </div>
            </div>
            <div className={classes.layoutContent}>
              {viewFarmland === null && (
                <FarmlandsList
                  farmlands={filterFarmlandsList()}
                  onClick={handlerFarmlandOnClick}
                />
              )}
            </div>
          </>
        )}
        {viewFarmland != null && (
          <FarmlandScreen
            farmlandId={viewFarmland}
            onClose={handlerSelectSide}
            farmland={farmlands.find((farm) => farm.id === viewFarmland)}
            onDelete={removeFarmlandHandler}
          />
        )}
      </div>
      {createMode === "farmland" ? (
        <NewFarmlandScreen
          onClose={closeCreateScreenHandler}
          onCreate={addFarmlandHandler}
        />
      ) : null}
      {createMode === "company" ? (
        <NewCompanyScreen onClose={closeCreateScreenHandler} />
      ) : null}
    </React.Fragment>
  );
};
export default Layout;
