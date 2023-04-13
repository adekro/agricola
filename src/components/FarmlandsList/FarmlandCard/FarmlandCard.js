import Button from "../../UI/Button/Button";
import styles from "./FarmlandCard.module.scss";

const FarmlandCard = ({
  type,
  area,
  location,
  perimeter,
  ownerDisplayName,
}) => {
  const onViewButtonClickHandler = () => {
    console.log("Do something with task #6");
  };
  return (
    <div className={styles["FarmlandCard-container"]}>
      <div className={styles["FarmlandCard-primaryInfo"]}>
        <div>
          <h6 className={styles.label}>Farming</h6>
          <h2 className={styles.value}>{type}</h2>
        </div>
        <div>
          <div className={`${styles.label} ${styles.labelSmall}`}>
            {`Area: ${area}`}m<sup>2</sup>
          </div>
          <div
            className={`${styles.label} ${styles.labelSmall}`}
          >{`Perimeter: ${perimeter}m`}</div>
        </div>
      </div>
      <div className={styles["FarmlandCard-details"]}>
        <div className={styles["FarmlandCard-detailsInner"]}>
          <div className={styles["FarmlandCard-owner"]}>
            <h6 className={`${styles.label} ${styles.labelVariant}`}>Owner</h6>
            <h2 className={styles.value}>{ownerDisplayName}</h2>
          </div>
          <div className={styles["FarmlandCard-location"]}>
            <span
              className={`${styles["FarmlandCard-locationText"]} ${styles.label} ${styles.labelVariant}`}
            >
              {location}
            </span>
          </div>
        </div>
        <Button onClick={onViewButtonClickHandler}>View</Button>
      </div>
    </div>
  );
};

export default FarmlandCard;