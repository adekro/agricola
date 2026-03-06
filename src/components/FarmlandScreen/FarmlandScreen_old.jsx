import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  Dialog,
  Button,
  Card,
  CardContent,
  styled,
} from "@mui/material";
import WorldMap from "../WorldMap/WorldMap";
import classes from "./FarmlandScreen.module.css";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";
import { useCallback, useMemo, useState } from "react";
import { FarmDetails } from "./FarmDetails/FarmDetails";
import Modal from "../UI/Modal/Modal";

export const ResponsiveDiv = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  // [theme.breakpoints.up("md")]: {
  //   width: "initial",
  // },
  // [theme.breakpoints.up("lg")]: {
  //   width: "700px",
  // },
}));

const FarmlandScreen = ({ onClose, farmlandId, farmland, onDelete }) => {
  const [open, setOpen] = useState(true);
  const [isDelFarmland, setIsDelFarmland] = useState(false);

  const handleOnClose = useCallback(() => {
    setOpen(false);
    onClose();
  }, [onClose]);

  const map = useMemo(
    () => <WorldMap coordinates={farmland.coordinates} />,
    [farmland]
  );

  const deleteHandler = useCallback(() => {
    setIsDelFarmland(true);
  }, []);

  const handleDelOnClose = useCallback(() => {
    setIsDelFarmland(false);
  }, [isDelFarmland]);

  const confirmDelete = useCallback(() => {
    setIsDelFarmland(false);
    onDelete(farmland.id);
    handleOnClose();
  }, [farmland, onDelete, handleOnClose]);

  return (
    <FullScreenDialog
      open={open}
      handleOnClose={handleOnClose}
      title="Farmland details"
    >
      <div className={classes.layoutBody}>
        <ResponsiveDiv className={classes.layoutContent}>
          {map}
          <div className={classes.detailsWrapper}>
            <FarmDetails farmland={farmland} />
            <Button onClick={deleteHandler}>Delete farmland</Button>
          </div>
        </ResponsiveDiv>
      </div>
      {isDelFarmland && (
        <Modal
          open={isDelFarmland}
          title="Delete farmland"
          confirmButtonLabel="Delete"
          onClose={handleDelOnClose}
          onConfirm={confirmDelete}
        >
          <h2>Do you want to delete this farmland?</h2>
        </Modal>
      )}
    </FullScreenDialog>
  );
};
export default FarmlandScreen;
