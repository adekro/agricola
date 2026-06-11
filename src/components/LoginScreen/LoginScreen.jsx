import React, { useState } from "react";
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Link,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import styles from "./LoginScreen.module.scss";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("Controlla la tua email per confermare la registrazione!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <Typography variant="h5" sx={{ mb: 2 }}>
            {isRegistering ? "Registrati" : "Accedi"}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form
          onSubmit={handleAuth}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem",
            marginTop: "10px",
          }}
        >
          <TextField
            label="Email"
            type="email"
            variant="outlined"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            size="large"
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading
              ? "Caricamento..."
              : isRegistering
                ? "Registrati"
                : "Accedi"}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering
              ? "Hai già un account? Accedi"
              : "Non hai un account? Registrati"}
          </Link>
        </Box>
      </Paper>
    </div>
  );
};

export default LoginScreen;
