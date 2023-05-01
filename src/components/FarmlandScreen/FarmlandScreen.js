import WorldMap from "../WorldMap/WorldMap";
import classes from "./FarmlandScreen.module.css";
import BackButton from "../UI/BackButton/BackButton";

const FarmlandScreen = ({ onBack }) => {
  const backHandler = () => {
    onBack("farmlands");
  };

  return (
    <div className={classes.layoutBody}>
      <div className={classes.layoutContent}>
        <BackButton onClick={backHandler} />
        <WorldMap />
      </div>
    </div>
  );
};
export default FarmlandScreen;
