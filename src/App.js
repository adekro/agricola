import React from "react";
import "./constants.css";
import "./App.css";
import Layout from "./components/Layout/Layout";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#691f02",
      light: "#b53502",
      dark: "#270c01",
    },
    secondary: {
      main: "#026957",
      light: "#00b597",
      dark: "#00201b",
    },
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  );
};

export default App;
