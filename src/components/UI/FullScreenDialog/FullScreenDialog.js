import React from "react";
import { Dialog, Slide } from "@mui/material";

const FullScreenDialog = ({ children, handleOnClose, open }) => {
  const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  });

  return (
    <Dialog
      open={open}
      onClose={handleOnClose}
      fullScreen
      TransitionComponent={Transition}
    >
      {children}
    </Dialog>
  );
};

export default FullScreenDialog;
