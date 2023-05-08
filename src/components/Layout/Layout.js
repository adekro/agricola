import React, { useCallback, useState } from "react";
import classes from "./Layout.module.scss";
import Side from "../Side/Side";
import useFarmlands from "../../hooks/useFarmlands";
import useCompanies from "../../hooks/useCompanies";
import FarmlandsList from "../FarmlandsList/FarmlandsList";
import CompaniesList from "../CompaniesList/CompaniesList";
import Header from "../Header/Header";
import Search from "../Header/Search/Search";
import Summary from "../Summary/Summary";
import { Button } from "@mui/material";
import NewFarmlandScreen from "../NewFarmlandScreen/NewFarmlandScreen";
import NewCompanyScreen from "../NewCompanyScreen/NewCompanyScreen";

const Layout = () => {
  const { farmlands } = useFarmlands();
  const { companies } = useCompanies();
  const [selectedList, setSelectedList] = useState("farmlands");
  const [filterString, setFilterString] = useState("");
  const [viewFarmland, setViewFarmland] = useState(null);
  const [viewCompany, setViewCompany] = useState(null);
  const [createMode, setCreateMode] = useState();

  const handlerSelectSide = useCallback((target) => {
    setSelectedList(target.toLowerCase());
    setViewFarmland(null);
    setViewCompany(null);
  }, []);

  const handlerFarmlandOnClick = useCallback((id) => {
    setViewFarmland(id);
    setSelectedList("farmlands");
  }, []);

  const handlerCompanyOnClick = useCallback((id) => {
    setViewCompany(id);
    setSelectedList("company");
  }, []);

  const filterResultsList = useCallback(
    (list) => {
      return list.filter((item) => {
        const valueToSearch = `${item?.type} 
          ${item?.name} 
          ${item?.ownerDisplayName}`.toLowerCase();

        return valueToSearch.indexOf(filterString) > -1;
      });
    },
    [filterString]
  );

  const searchChangeHandler = useCallback((value) => {
    setFilterString(value);
  }, []);

  const onCreateButtonClickHandler = useCallback(() => {
    setCreateMode(selectedList === "farmlands" ? "farmland" : "company");
  }, [selectedList]);

  const closeCreateScreenHandler = useCallback(() => {
    setCreateMode();
  }, []);

  return (
    <React.Fragment>
      <Header>
        <div className={classes.HeaderWrapper}>
          <Search
            className={classes.HeaderSearchbox}
            mode={selectedList}
            onChange={searchChangeHandler}
          />
          <Button variant="contained" onClick={onCreateButtonClickHandler}>
            Create {selectedList === "farmlands" ? "farmland" : "company"}
          </Button>
        </div>
      </Header>
      <div className={classes.layoutBody}>
        {viewFarmland === null && viewCompany === null && (
          <>
            <div className={classes.layoutSide}>
              <div className={classes.layoutSidecontent}>
                <Side onSelect={handlerSelectSide} active={selectedList} />
                {selectedList === "farmlands" && viewFarmland === null && (
                  <Summary farmlands={filterResultsList(farmlands)} />
                )}
              </div>
            </div>
            <div className={classes.layoutContent}>
              {selectedList === "farmlands" && viewFarmland === null && (
                <FarmlandsList
                  farmlands={filterResultsList(farmlands)}
                  onClick={handlerFarmlandOnClick}
                />
              )}
              {selectedList === "companies" && viewCompany === null && (
                <CompaniesList
                  companies={filterResultsList(companies)}
                  onClick={handlerCompanyOnClick}
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
        {viewCompany != null && (
          <NewCompanyScreen
            onClose={handlerSelectSide}
            companyId={viewCompany}
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
