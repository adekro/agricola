import React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import classes from "./SatelliteIndices.module.scss";

function formatAcquisitionDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const SatelliteIndices = ({ indices, upstreamResponse, metadata, loading }) => {
  const acquisitionDateLabel = formatAcquisitionDate(
    metadata?.latestAcquisitionDate,
  );

  if (loading) {
    return (
      <Box className={classes.Container} display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress size={24} sx={{ mr: 2 }} />
        <Typography variant="body2">Analisi dati satellitari in corso...</Typography>
      </Box>
    );
  }

  if (!indices) {
    return null;
  }

  return (
    <Box className={classes.Container}>
      <Typography variant="h6" gutterBottom sx={{ mt: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        Indici Satellitari Sentinel-2
        {acquisitionDateLabel && (
          <Typography component="span" variant="body2" color="text.secondary">
            ({acquisitionDateLabel})
          </Typography>
        )}
        <Tooltip title="Dati derivati dall'analisi multispettrale del satellite Sentinel-2 per l'area selezionata.">
          <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary', cursor: 'help' }} />
        </Tooltip>
      </Typography>

      <Grid container spacing={2}>
        {Object.entries(indices).map(([key, data]) => (
          <Grid item xs={12} sm={6} md={4} key={key}>
            <Card variant="outlined" className={classes.IndexCard}>
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                    {data.label}
                  </Typography>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {data.value}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                  {data.status}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {data.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontStyle: 'italic' }}>
        * Dati calcolati in base alla posizione geografica del poligono.
      </Typography>
      {metadata?.latestAcquisitionDate && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Ultima acquisizione utile Copernicus: {metadata.latestAcquisitionDate}
        </Typography>
      )}

      {upstreamResponse && (
        <Accordion className={classes.RawResponseSection} sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Risposta reale API satellite
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              component="pre"
              className={classes.RawResponse}
            >
              {JSON.stringify(upstreamResponse, null, 2)}
            </Typography>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default SatelliteIndices;
