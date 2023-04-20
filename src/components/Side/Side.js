import React, { useState } from "react";
import classes from "./Side.module.css";
import SideItem from "./SideItem";
import Summary from "../Summary/Summary";

const Side = ({ onSelect, active }) => {
  const [itemActive, setItemActive] = useState(active);

  const handlerClick = (target) => {
    onSelect(target);
    setItemActive(() => {
      return target;
    });
  };

  return (
    <React.Fragment>
      <div className={classes.sidecontent}>
        <SideItem
          onClick={handlerClick}
          label="Farmlands"
          target="farmlands"
          ico="/logo192.png"
          active={itemActive === "farmlands" ? true : false}
        />
        <SideItem
          onClick={handlerClick}
          label="Companies"
          target="companies"
          ico="/logo192.png"
          active={itemActive === "companies" ? true : false}
        />

        <Summary />
      </div>
    </React.Fragment>
  );
};
export default Side;
