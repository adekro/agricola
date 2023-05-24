import WorldMap from "../WorldMap/WorldMap";
import classes from "./FarmlandScreen.module.css";
import farmlandLoader from "../../data/farmlandLoader";

const FarmlandScreen = ({ farmlandId }) => {
  const data = farmlandLoader.getItems();
  const farm = data.find((farm) => farm.id === farmlandId);

  return (
    <div className={classes.layoutBody}>
      <div className={classes.layoutContent}>
        <WorldMap coordinates={farm.coordinates} />
      </div>
    </div>
  );
};
export default FarmlandScreen;
