import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  Button,
  Dialog,
  Slide,
} from "@mui/material";

const FullScreenDialog = ({
  children,
  handleOnClose,
  open,
  title,
  buttonComponent,
}) => {
  // const Transition = React.forwardRef(function Transition(props, ref) {
  //   return <Slide direction="up" ref={ref} {...props} />;
  // });

  return (
    <Dialog
      open={open}
      onClose={handleOnClose}
      fullScreen
      // TransitionComponent={Transition}
    >
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
            {title}
          </Typography>
          {buttonComponent}
        </Toolbar>
      </AppBar>
      {children}
    </Dialog>
  );
};

export default FullScreenDialog;
