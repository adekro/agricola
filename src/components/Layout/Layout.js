import React from "react";
import classes from "./Layout.module.css";
import Side from "../Side/Side";
import useFarmlands from "../../hooks/useFarmlands";
import FarmlandsList from "../FarmlandsList/FarmlandsList";

const Layout = () => {
  const { farmlands } = useFarmlands();
  const handlerSelectSide = (target) => {
    console.log(target);
  };

  return (
    <React.Fragment>
      <header>header</header>
      <div className={classes.layoutBody}>
        <div className={classes.layoutSide}>
          <Side onSelect={handlerSelectSide} />
        </div>
        <div className={classes.layoutContent}>
          <FarmlandsList farmlands={farmlands} />
        </div>
      </div>
    </React.Fragment>
  );
};
export default Layout;
