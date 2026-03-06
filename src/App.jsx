import React from "react";
import "./constants.css";
import "./App.css";
import Layout from "./components/Layout/Layout";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import FarmlandsList from "./components/FarmlandsList/FarmlandsList";
import FarmlandScreen from "./components/FarmlandScreen/FarmlandScreen";
import LoginScreen from "./components/LoginScreen/LoginScreen";
import FitosanitariScreen from "./components/FitosanitariScreen/FitosanitariScreen";

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

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
      <Router>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<FarmlandsList />} />
            <Route path="farmlands" element={<FarmlandsList />} />
            <Route path="farmland/:id" element={<FarmlandScreen />} />
            <Route path="fitosanitari" element={<FitosanitariScreen />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
