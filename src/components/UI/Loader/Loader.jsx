import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import classes from "./Loader.module.scss";

export default function Loader() {
  return (
    <Box className={classes.Loader}>
      <CircularProgress />
    </Box>
  );
}
