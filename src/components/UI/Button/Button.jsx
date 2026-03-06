import { styled } from "@mui/material";
import styles from "./Button.module.scss";

const Button = (props) => {
  const ResponsiveButton = styled("button")(({ theme }) => ({
    [theme.breakpoints.down("md")]: {
      fontSize: "12px",
      bottom: "10px",
      right: "10px",
    },
    // [theme.breakpoints.up("md")]: {
    //   width: "initial",
    // },
    // [theme.breakpoints.up("lg")]: {
    //   width: "700px",
    // },
  }));

  return (
    <ResponsiveButton {...props} className={styles.Button}>
      {props.children}
    </ResponsiveButton>
  );
};

export default Button;
