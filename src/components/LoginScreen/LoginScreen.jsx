import React, { useState } from "react";
import { TextField, Button, Paper, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import styles from "./LoginScreen.module.scss";

const LoginScreen = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple logic: store login state in localStorage and redirect
    localStorage.setItem("isLoggedIn", "true");
    navigate("/");
  };

  return (
    <div className={styles.loginContainer}>
      <Paper className={styles.loginCard} elevation={3}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div className={styles.logoWrapper}>
            <img
              src="/logolabel.png"
              alt="Agricola Logo"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        </Box>
        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem",
            marginTop: "10px",
          }}
        >
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            size="large"
            type="submit"
            fullWidth
          >
            Accedi
          </Button>
        </form>
      </Paper>
    </div>
  );
};

export default LoginScreen;
