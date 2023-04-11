import Button from "../../UI/Button/Button";
import "./FarmlandCard.css";

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
    <div className="FarmlandCard-container">
      <div className="FarmlandCard-primaryInfo">
        <div>
          <h6 className="label">Farming</h6>
          <h2 className="value">{type}</h2>
        </div>
        <div>
          <div className="label labelSmall">
            {`Area: ${area}`}m<sup>2</sup>
          </div>
          <div className="label labelSmall">{`Perimeter: ${perimeter}m`}</div>
        </div>
      </div>
      <div className="FarmlandCard-details">
        <div className="FarmlandCard-detailsInner">
          <div className="FarmlandCard-owner">
            <h6 className="label labelVariant">Owner</h6>
            <h2 className="value">{ownerDisplayName}</h2>
          </div>
          <div className="FarmlandCard-location">
            <span className="FarmlandCard-locationText label labelVariant">
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
