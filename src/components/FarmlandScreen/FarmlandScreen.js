import WorldMap from "../WorldMap/WorldMap";
import classes from "./FarmlandScreen.module.css";
import SideItem from "../Side/SideItem";

const FarmlandScreen = ({ onBack }) => {
  const backHandler = () => {
    onBack("farmlands");
  };

  return (
    <div className={classes.layoutBody}>
      <div className={classes.layoutSide}>
        <div className={classes.sidecontent}>
          <SideItem
            onClick={backHandler}
            label="Back"
            target=""
            ico="/logo192.png"
            active={false}
          />
        </div>
      </div>
      <div className={classes.layoutContent}>
        <WorldMap />
      </div>
    </div>
  );
};
export default FarmlandScreen;
