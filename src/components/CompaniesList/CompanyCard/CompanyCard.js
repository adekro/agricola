import Button from "../../UI/Button/Button";
import styles from "./CompanyCard.module.scss";

const CompanyCard = ({
  id,
  phone,
  email,
  piva,
  website,
  notes,
  name,
  onView,
}) => {
  const onViewButtonClickHandler = () => {
    onView(id);
  };
  return (
    <div className={styles["CompanyCard-container"]}>
      <div className={styles["CompanyCard-primaryInfo"]}>
        <div>
          <h6 className={styles.label}>Contacts</h6>
        </div>
        <div>
          <div className={`${styles.label} ${styles.labelSmall}`}>
            {`Phone: ${phone}`}
          </div>
          <div
            className={`${styles.label} ${styles.labelSmall}`}
          >{`Mail: ${email}`}</div>
          <div
            className={`${styles.label} ${styles.labelSmall}`}
          >{`Website: ${website}`}</div>
        </div>
      </div>
      <div className={styles["CompanyCard-details"]}>
        <div className={styles["CompanyCard-detailsInner"]}>
          <div className={styles["CompanyCard-owner"]}>
            <h6 className={`${styles.label} ${styles.labelVariant}`}>Owner</h6>
            <h2 className={styles.value}>{name}</h2>
            <div className={`${styles.labelNotes}`}>
              <div
                className={`${styles.labelVariant} ${styles.labelSmall}`}
              >{`${notes}`}</div>
            </div>
          </div>
          <div className={styles["CompanyCard-piva"]}>
            <h6 className={`${styles.labelVariant} ${styles.labelNoMargin}`}>
              CF/P.IVA
            </h6>
            <div className={`${styles.labelVariant} ${styles.labelSmall}`}>
              {piva}
            </div>
          </div>
        </div>
        <Button onClick={onViewButtonClickHandler}>View</Button>
      </div>
    </div>
  );
};

export default CompanyCard;
