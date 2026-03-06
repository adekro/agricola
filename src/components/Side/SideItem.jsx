import React from "react";
import classes from "./Side.module.css";

const SideItem = (props) => {
  const Icon = props.icon;
  const isActive = props.active;

  const handlerClick = () => {
    props.onClick(props.target);
  };

  return (
    <div
      onClick={handlerClick}
      className={`${classes.sideItem} ${
        isActive ? classes.siteItemActive : ""
      }`}
    >
      <div className={classes.iconWrapper}>
        <Icon className={classes.icon} />
      </div>
      <span className={classes.label}>{props.label}</span>
    </div>
  );
};

export default SideItem;
