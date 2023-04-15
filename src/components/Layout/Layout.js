import React, { useState } from "react";
import classes from "./Layout.module.css";
import Side from "../Side/Side";
import useFarmlands from "../../hooks/useFarmlands";
import useCompanies from "../../hooks/useCompanies";
import FarmlandsList from "../FarmlandsList/FarmlandsList";
import CompaniesList from "../CompaniesList/CompaniesList";
import FarmlandScreen from "../FarmlandScreen/FarmlandScreen";

const Layout = () => {
  const { farmlands } = useFarmlands();
  const { companies } = useCompanies();
  const [selectedList, setSelectedList] = useState("farmlands");
  const [viewFarmland, setViewFarmland] = useState(-1);
  const handlerSelectSide = (target) => {
    setSelectedList(target);
    setViewFarmland(-1);
  };

  const handlerFarmlandOnClick = (id) => {
    setViewFarmland(id);
    setSelectedList("");
  };

  return (
    <React.Fragment>
      <header>header</header>
      <div className={classes.layoutBody}>
        {viewFarmland === -1 && (
          <>
            <div className={classes.layoutSide}>
              <Side onSelect={handlerSelectSide} />
            </div>
            <div className={classes.layoutContent}>
              {selectedList === "farmlands" && (
                <FarmlandsList
                  farmlands={farmlands}
                  onClick={handlerFarmlandOnClick}
                />
              )}
              {selectedList === "companies" && (
                <CompaniesList companies={companies} />
              )}
            </div>
          </>
        )}
        {viewFarmland > -1 && <FarmlandScreen onBack={handlerSelectSide} />}
      </div>
    </React.Fragment>
  );
};
export default Layout;
