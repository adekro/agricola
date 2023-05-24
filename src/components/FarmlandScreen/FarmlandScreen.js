import WorldMap from "../WorldMap/WorldMap";
import classes from "./FarmlandScreen.module.css";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";
import { useCallback, useMemo, useState } from "react";
import { FarmDetails } from "./FarmDetails/FarmDetails";

const FarmlandScreen = ({ onClose, farmlandId, farmland }) => {
  const [open, setOpen] = useState(true);

  const handleOnClose = useCallback(() => {
    setOpen(false);
    onClose();
  }, [onClose]);

  const map = useMemo(
    () => <WorldMap coordinates={farmland.coordinates} />,
    [farmland]
  );

  return (
    <FullScreenDialog
      open={open}
      handleOnClose={handleOnClose}
      title="Farmland details"
    >
      <div className={classes.layoutBody}>
        <div className={classes.layoutContent}>
          {map}
          <FarmDetails farmland={farmland} />
        </div>
      </div>
    </FullScreenDialog>
  );
};
export default FarmlandScreen;
