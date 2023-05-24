import {
  Button,
  TextField,
  FormControl,
  Autocomplete,
  Snackbar,
  Alert,
} from "@mui/material";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";
import { useState, useCallback } from "react";
import classes from "./NewFarmlandScreen.module.scss";
import DrawableMap from "../WorldMap/DrawableMap/DrawableMap";
import { useMemo } from "react";
import farmlandLoader from "../../data/farmlandLoader";
import { useFormik } from "formik";
import { useEffect } from "react";
import useCompanies from "../../hooks/useCompanies";

const NewFarmlandScreen = ({ onClose, farmlandId, onCreate }) => {
  const [open, setOpen] = useState(true);
  const [area, setArea] = useState();
  const [perimeter, setPerimeter] = useState();
  const [coordinates, setCoordinates] = useState();
  const [error, setError] = useState();
  const [owner, setOwner] = useState(null);
  const { companies } = useCompanies();

  const formik = useFormik({
    initialValues: {
      area: "",
      perimeter: "",
      type: "",
      notes: "",
    },
    onSubmit: (values) => {
      alert(JSON.stringify(values, null, 2));
    },
  });

  const handleOnClose = useCallback(() => {
    setOpen(false);
    onClose("farmlands");
  }, [onClose]);

  const onSaveFarmHandler = useCallback(() => {
    const newFarmland = {
      ...formik.values,
      ownerDisplayName: owner,
      coordinates: coordinates,
    };
    if (!newFarmland.area || !newFarmland.perimeter) {
      setError("Please fill all the required data");
      return;
    }
    onCreate(newFarmland);
    handleOnClose();
  }, [owner, coordinates, onCreate, handleOnClose]);

  const drawCompletedHandler = useCallback(
    ({ area, perimeter, coordinates }) => {
      setArea(area);
      setPerimeter(perimeter);
      setCoordinates(coordinates);
    },
    []
  );

  const optimizedMap = useMemo(
    () => <DrawableMap onDrawCompleted={drawCompletedHandler} />,
    [drawCompletedHandler]
  );

  useEffect(() => {
    if (area && perimeter) {
      formik.setFieldValue("area", area);
      formik.setFieldValue("perimeter", perimeter);
    }
  }, [area, perimeter]);

  useEffect(() => {
    if (farmlandId) {
      const farm = farmlandLoader
        .getItems()
        .find((farm) => farm.id === farmlandId);

      formik.setFieldValue("area", farm?.area || "");
      formik.setFieldValue("perimeter", farm?.perimeter || "");
      formik.setFieldValue("type", farm?.type || "");
      formik.setFieldValue("notes", farm?.notes || "");
    }
  }, [farmlandId]);

  const changeCompanyHandler = useCallback(
    (_event, newValue) => setOwner(newValue),
    []
  );

  const closeHandler = useCallback(() => {
    setError();
  }, []);

  const callToAction = (
    <Button autoFocus color="inherit" onClick={onSaveFarmHandler}>
      save
    </Button>
  );

  return (
    <FullScreenDialog
      open={open}
      handleOnClose={handleOnClose}
      title="Create new farmland"
      buttonComponent={callToAction}
    >
      <div className={classes.MapForm}>
        {optimizedMap}
        <form
          className={classes.NewFarmlandForm}
          onSubmit={formik.handleSubmit}
        >
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
            {/* <InputLabel id="owner-label">Owner</InputLabel>
            <Select
              labelId="owner-label"
              name="owner"
              label="Owner"
              value={formik.values.owner}
              onChange={formik.handleChange}
              error={formik.touched.owner && Boolean(formik.errors.email)}
            >
              {companies.map((company) => (
                <MenuItem key={company.name} value={company}>
                  {company.name}
                </MenuItem>
              ))}
            </Select> */}
            <Autocomplete
              name="owner"
              value={owner}
              onChange={changeCompanyHandler}
              options={companies.map((company) => company.name)}
              renderInput={(params) => (
                <TextField {...params} label="Company name" />
              )}
            ></Autocomplete>
          </FormControl>
          <div className={classes.buttons}></div>
        </form>
      </div>
      <Snackbar
        severity="error"
        open={!!error}
        autoHideDuration={6000}
        onClose={closeHandler}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </FullScreenDialog>
  );
};

export default NewFarmlandScreen;
