import { styled } from "@mui/material";
import Button from "../../UI/Button/Button";
import styles from "./FarmlandCard.module.scss";

const FarmlandCard = ({
  type,
  area,
  location,
  perimeter,
  ownerDisplayName,
  id,
  onView,
}) => {
  const onViewButtonClickHandler = () => {
    onView(id);
  };

  const ResponsiveCard = styled("div")(({ theme }) => ({
    [theme.breakpoints.down("md")]: {
      width: "85%",
    },
    [theme.breakpoints.up("md")]: {
      width: "initial",
    },
    [theme.breakpoints.up("lg")]: {
      width: "700px",
    },
  }));

  const ResponsiveH2 = styled("h2")(({ theme }) => ({
    [theme.breakpoints.down("md")]: {
      fontSize: "16px",
    },
  }));

  return (
    <ResponsiveCard className={styles["FarmlandCard-container"]}>
      <div className={styles["FarmlandCard-primaryInfo"]}>
        <div>
          <h6 className={styles.label}>Farming</h6>
          <ResponsiveH2 className={styles.value}>{type}</ResponsiveH2>
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
            <ResponsiveH2 className={styles.value}>
              {ownerDisplayName}
            </ResponsiveH2>
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
    </ResponsiveCard>
  );
};

export default FarmlandCard;
