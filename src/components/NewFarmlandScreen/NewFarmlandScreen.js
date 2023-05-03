import { AppBar, IconButton, Toolbar, Typography, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";
import { useState } from "react";

const NewFarmlandScreen = ({ onClose }) => {
  const [open, setOpen] = useState(true);

  const handleOnClose = () => {
    setOpen(false);
    onClose();
  };

  return (
    <FullScreenDialog open={open} handleOnClose={handleOnClose}>
      <AppBar sx={{ position: "relative" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleOnClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Create new farmland
          </Typography>
          <Button autoFocus color="inherit" onClick={handleOnClose}>
            save
          </Button>
        </Toolbar>
      </AppBar>
      To be done
    </FullScreenDialog>
  );
};

export default NewFarmlandScreen;
