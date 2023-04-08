import React from "react";
import classes from "./Layout.module.css";
import Side from "../Side/Side";

const Layout = () => {
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
        <div className={classes.layoutContent}>content</div>
      </div>
    </React.Fragment>
  );
};
export default Layout;
