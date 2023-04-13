import Button from "../../UI/Button/Button";
import styles from "./CompaniesCard.module.scss";

const CompaniesCard = ({ phone, email, piva, website, notes, name }) => {
	const onViewButtonClickHandler = () => {
		console.log("Do something with task #11");
	};
	return (
		<div className={styles["CompaniesCard-container"]}>
			<div className={styles["CompaniesCard-primaryInfo"]}>
				<div>
					<h6 className={styles.label}>Contacts</h6>
				</div>
				<div>
					<div className={`${styles.label} ${styles.labelSmall}`}>
						{`Phone: ${phone}`}
					</div>
					<div
						className={`${styles.label} ${styles.labelSmall}`}>{`Mail: ${email}`}</div>
					<div
						className={`${styles.label} ${styles.labelSmall}`}>{`Website: ${website}`}</div>
				</div>
			</div>
			<div className={styles["CompaniesCard-details"]}>
				<div className={styles["CompaniesCard-detailsInner"]}>
					<div className={styles["CompaniesCard-owner"]}>
						<h6 className={`${styles.label} ${styles.labelVariant}`}>Owner</h6>
						<h2 className={styles.value}>{name}</h2>
						<div className={`${styles.labelNotes}`}>
							<div
								className={`${styles.labelVariant} ${styles.labelSmall}`}>{`${notes}`}</div>
						</div>
					</div>
					<div className={styles["CompaniesCard-piva"]}>
						<h6 className={`${styles.labelVariant} ${styles.labelNoMargin}`}>CF/P.IVA</h6>
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

export default CompaniesCard;
