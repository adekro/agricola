import Button from "../../UI/Button/Button";
import styles from "./FarmlandCard.module.scss";

const FarmlandCard = ({
  name,
  type,
  area,
  location,
  perimeter,
  ownerDisplayName,
  summary,
  id,
  onView,
}) => {
  const onViewButtonClickHandler = () => {
    onView(id);
  };
  const crops = Object.values(
    (summary?.crops || []).reduce((groups, crop) => {
      const key = `${crop.year || ""}|${crop.agea_code || crop.crop || ""}`;
      return groups[key] ? groups : { ...groups, [key]: crop };
    }, {}),
  ).slice(0, 5);
  const currentCrop = crops[0]?.crop || "Nessuna coltura registrata";
  const getSau = (year) =>
    summary?.annualSau?.find((item) => item.year === year)?.sau ?? "-";

  return (
    <div className={styles["FarmlandCard-container"]}>
      <div className={styles["FarmlandCard-primaryInfo"]}>
        <div>
          <h6 className={styles.label}>Farming</h6>
          <h2 className={styles.value}>{type}</h2>
          <h6 className={styles.label}>Name</h6>
          <h2 className={styles.value}>{name}</h2>
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
            <div className={styles["FarmlandCard-summary"]}>
              <strong>Coltura attuale: {currentCrop}</strong>
              <span>Ultime colture e SAU</span>
              {crops.map((crop) => (
                <small key={crop.id}>
                  {crop.year}: {crop.crop} — SAU {getSau(crop.year)} ha
                </small>
              ))}
              <span>Ultimi trattamenti</span>
              {(summary?.treatments || []).map((treatment) => (
                <small key={treatment.id}>
                  {String(treatment.operation_date || "").slice(0, 10)}: {treatment.phytosanitary?.name || treatment.product?.name || "Trattamento"}
                </small>
              ))}
            </div>
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
