import React from "react";
import classes from "./Side.module.css";

const SideItem = (props) => {
  const isActive = props.active;

  const handlerClick = () => {
    props.onClick(props.target);
  };

  return (
    <React.Fragment>
      <div
        onClick={handlerClick}
        className={`${classes.sideItem} ${
          isActive ? classes.siteItemActive : ""
        }`}
      >
        <img src={props.ico} alt="" />
        <label>{props.label}</label>
      </div>
    </React.Fragment>
  );
};
export default SideItem;
