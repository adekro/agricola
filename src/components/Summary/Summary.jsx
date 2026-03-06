import React from "react";
import { formatPerimeter } from "../WorldMap/utils";
import styles from "./Summary.module.css";

const Summary = ({ farmlands }) => {
  const numberfields = farmlands ? farmlands.length : 0;
  const area = farmlands
    ? farmlands.reduce((prevVal, currVal) => prevVal + currVal.area, 0)
    : 0;
  const perimeter = farmlands
    ? farmlands.reduce((prevVal, currVal) => prevVal + currVal.perimeter, 0)
    : 0;

  return (
    <div className={styles.content}>
      <div>
        <h3>Summary</h3>
      </div>
      <div className={styles["FarmlandCard-primaryInfo"]}>
        <div>
          <div
            className={`${styles.label} ${styles.labelSmall}`}
          >{`Number of fields: ${numberfields}`}</div>
          <div className={`${styles.label} ${styles.labelSmall}`}>
            {`Area: ${area}`}m<sup>2</sup>
          </div>
          <div
            className={`${styles.label} ${styles.labelSmall}`}
          >{`Perimeter: ${perimeter}m`}</div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
