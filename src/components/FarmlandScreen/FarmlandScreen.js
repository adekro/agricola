import WorldMap from "../WorldMap/WorldMap";
import classes from "./FarmlandScreen.module.css";
import farmlandLoader from "../../data/farmlandLoader";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";

import { useState } from "react";

const FarmlandScreen = ({ farmlandId, onClose }) => {
  const [open, setOpen] = useState(true);
  const data = farmlandLoader.getItems();
  const farm = data.find((farm) => farm.id === farmlandId);

  const handleOnClose = () => {
    setOpen(false);
    onClose();
  };

  return (
    <FullScreenDialog
      open={open}
      handleOnClose={handleOnClose}
      title="Farmland details"
    >
      <div className={classes.layoutBody}>
        <div className={classes.layoutContent}>
          <WorldMap coordinates={farm.coordinates} />
        </div>
      </div>
    </FullScreenDialog>
  );
};
export default FarmlandScreen;
