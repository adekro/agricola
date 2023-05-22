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

const Layout = () => {
  const { farmlands, reloadFarmland } = useFarmlands();
  const [filterString, setFilterString] = useState("");
  const [viewFarmland, setViewFarmland] = useState(null);
  const [createMode, setCreateMode] = useState();

  const handlerSelectSide = useCallback(() => {
    setViewFarmland(null);
    reloadFarmland();
  }, []);

  const handlerFarmlandOnClick = useCallback((id) => {
    setViewFarmland(id);
  }, []);

  const filterResultsList = useCallback(
    (list) => {
      try {
        return list.filter((item) => {
          const valueToSearch = `${item?.type} 
            ${item?.name} 
            ${item?.ownerDisplayName}`.toLowerCase();

          return valueToSearch.indexOf(filterString) > -1;
        });
      } catch (error) {}
    },
    [filterString]
  );

  const searchChangeHandler = useCallback((value) => {
    setFilterString(value);
  }, []);

  const onCreateButtonClickHandler = useCallback(() => {
    setCreateMode("farmland");
  }, []);

  const closeCreateScreenHandler = useCallback(() => {
    setCreateMode();
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
                  <Summary farmlands={filterResultsList(farmlands)} />
                )}
              </div>
            </div>
            <div className={classes.layoutContent}>
              {viewFarmland === null && (
                <FarmlandsList
                  farmlands={filterResultsList(farmlands)}
                  onClick={handlerFarmlandOnClick}
                />
              )}
            </div>
          </>
        )}
        {viewFarmland != null && (
          <NewFarmlandScreen
            farmlandId={viewFarmland}
            onClose={handlerSelectSide}
          />
        )}
      </div>
      {createMode === "farmland" ? (
        <NewFarmlandScreen onClose={closeCreateScreenHandler} />
      ) : null}
      {createMode === "company" ? (
        <NewCompanyScreen onClose={closeCreateScreenHandler} />
      ) : null}
    </React.Fragment>
  );
};
export default Layout;
