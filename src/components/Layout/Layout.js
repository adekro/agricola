import React, { useCallback, useState } from "react";
import classes from "./Layout.module.css";
import Side from "../Side/Side";
import useFarmlands from "../../hooks/useFarmlands";
import useCompanies from "../../hooks/useCompanies";
import FarmlandsList from "../FarmlandsList/FarmlandsList";
import CompaniesList from "../CompaniesList/CompaniesList";
import Header from "../Header/Header";
import Search from "../Header/Search/Search";
// import Button from "../UI/Button/Button";

const Layout = () => {
  const { farmlands } = useFarmlands();
  const { companies } = useCompanies();
  const [selectedList, setSelectedList] = useState("farmlands");
  const [filterString, setFilterString] = useState("");
  const handlerSelectSide = (target) => {
    setSelectedList(target.toLowerCase());
  };

  const filterResultsList = useCallback(
    (list) => {
      return list.filter((item) => {
        const valueToSearch = (item?.type || item?.name).toLowerCase();

        return valueToSearch.indexOf(filterString) > -1;
      });
    },
    [filterString]
  );

  const searchChangeHandler = (value) => {
    setFilterString(value);
  };

  return (
    <React.Fragment>
      <Header>
        <Search mode={selectedList} onChange={searchChangeHandler} />
        {/*
        // To be completed
        <Button>
          Create {selectedList === "farmlands" ? "new farmland" : "new company"}
        </Button> */}
      </Header>
      <div className={classes.layoutBody}>
        <div className={classes.layoutSide}>
          <Side onSelect={handlerSelectSide} />
        </div>
        <div className={classes.layoutContent}>
          {selectedList === "farmlands" && (
            <FarmlandsList farmlands={filterResultsList(farmlands)} />
          )}
          {selectedList === "companies" && (
            <CompaniesList companies={filterResultsList(companies)} />
          )}
        </div>
      </div>
    </React.Fragment>
  );
};
export default Layout;
