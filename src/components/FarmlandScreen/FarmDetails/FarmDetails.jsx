import React, { useState, useCallback, useEffect } from "react";
import {
  Button,
  TextField,
  FormControl,
  Autocomplete,
  Snackbar,
  Alert,
} from "@mui/material";

import classes from "./FarmDetails.module.scss";
import useFarmlands from "../../../hooks/useFarmlands";
import { useFormik } from "formik";

export const FarmDetails = ({ farmland }) => {
  const formik = useFormik({
    initialValues: farmland || {
      area: "",
      perimeter: "",
      type: "",
      notes: "",
      owner: "",
    },
    onSubmit: (values) => {
      alert(JSON.stringify(values, null, 2));
    },
  });
  const [owner, setOwner] = useState("");
  const { companies } = useFarmlands();

  const changeCompanyHandler = useCallback((_event, newValue) => {
    setOwner(newValue);
  }, []);

  useEffect(() => {
    setOwner(farmland.ownerDisplayName);
  }, []);

  return (
    <div className={classes.FarmlandContent}>
      <form className={classes.FarmlandForm} onSubmit={formik.handleSubmit}>
        <TextField
          onChange={formik.handleChange}
          value={formik.values.area}
          label="Area (ettari)"
          name="area"
          disabled
          className={classes.Input}
          fullWidth
          error={formik.touched.area && Boolean(formik.errors.email)}
        />
        <TextField
          onChange={formik.handleChange}
          value={formik.values.perimeter}
          label="Perimeter (m)"
          name="perimeter"
          disabled
          className={classes.Input}
          fullWidth
          error={formik.touched.perimeter && Boolean(formik.errors.email)}
        />
        <TextField
          onChange={formik.handleChange}
          value={formik.values.type}
          label="Type of farming"
          name="type"
          className={classes.Input}
          fullWidth
          error={formik.touched.type && Boolean(formik.errors.email)}
        />
        <TextField
          onChange={formik.handleChange}
          value={formik.values.notes}
          label="Notes"
          name="notes"
          className={classes.Input}
          fullWidth
          error={formik.touched.notes && Boolean(formik.errors.email)}
        />
        <FormControl fullWidth className={classes.Input}>
          <Autocomplete
            freeSolo
            name="owner"
            value={formik.values.owner}
            inputValue={owner}
            onChange={changeCompanyHandler}
            onInputChange={changeCompanyHandler}
            options={companies}
            renderInput={(params) => (
              <TextField {...params} label="Company name" />
            )}
          ></Autocomplete>
        </FormControl>
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
};
