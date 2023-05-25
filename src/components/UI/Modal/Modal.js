import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  Dialog,
  Button,
  Card,
  CardContent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const Modal = ({
  open,
  onClose,
  title,
  children,
  confirmButtonLabel,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <Card>
        <AppBar sx={{ position: "relative" }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={onClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              {title}
            </Typography>
          </Toolbar>
        </AppBar>
        <CardContent>
          {children}

          <Button onClick={onConfirm}>{confirmButtonLabel}</Button>
        </CardContent>
      </Card>
    </Dialog>
  );
};

export default Modal;
