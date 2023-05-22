import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  Button,
  TextField,
  FormControl,
  Autocomplete,
  Snackbar,
  Alert,
  Dialog,
  Card,
  CardContent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";
import { useState, useCallback } from "react";
import classes from "./NewFarmlandScreen.module.scss";
import DrawableMap from "../WorldMap/DrawableMap/DrawableMap";
import { useMemo } from "react";
import farmlandLoader from "../../data/farmlandLoader";
import { useFormik } from "formik";
import { useEffect } from "react";
import useCompanies from "../../hooks/useCompanies";

const NewFarmlandScreen = ({ onClose, farmlandId }) => {
  const [isNewFarmland, setIsNewFarmland] = useState(farmlandId ? false : true);
  const [isDelFarmland, setIsDelFarmland] = useState(false);
  const [open, setOpen] = useState(true);
  const [area, setArea] = useState();
  const [perimeter, setPerimeter] = useState();
  const [coordinates, setCoordinates] = useState();
  const [error, setError] = useState();
  const [owner, setOwner] = useState(null);
  const { companies } = useCompanies();

  const handleOnClose = useCallback(() => {
    setOpen(false);
    onClose("farmlands");
  }, [onClose]);

  const handleDelOnClose = useCallback(() => {
    setIsDelFarmland(false);
  }, [isDelFarmland]);

  const onSaveFarmHandler = useCallback(() => {
    const data = farmlandLoader.getItems();
    const newFarmland = {
      ...formik.values,
      ownerDisplayName: owner,
      coordinates: coordinates,
    };
    if (!newFarmland.area || !newFarmland.perimeter) {
      setError("Please fill all the required data");
      return;
    }
    farmlandLoader.storeItems([...data, newFarmland]);
    handleOnClose();
  }, [owner, coordinates]);

  const deleteHandler = useCallback(() => {
    setIsDelFarmland(true);
  }, []);
  const confirmDelete = useCallback(() => {
    setIsDelFarmland(false);
    setOpen(false);
    onClose("farmlands");

    const data = farmlandLoader.getItems();
    const updated = data.filter((farmland) => farmland.id !== farmlandId);
    farmlandLoader.storeItems(updated);
    handleOnClose();
  }, []);

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

  return (
    <FullScreenDialog open={open} handleOnClose={handleOnClose}>
      <AppBar sx={{ position: "relative" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleOnClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Create new farmland
          </Typography>
          <Button autoFocus color="inherit" onClick={onSaveFarmHandler}>
            save
          </Button>
        </Toolbar>
      </AppBar>
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
          <div className={classes.buttons}>
            <Button onClick={deleteHandler}>delete farmland</Button>
          </div>
        </form>
      </div>
      {isDelFarmland && (
        <Dialog
          open={open}
          onClose={handleDelOnClose}
          // TransitionComponent={Transition}
        >
          <Card>
            <AppBar sx={{ position: "relative" }}>
              <Toolbar>
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={handleDelOnClose}
                  aria-label="close"
                >
                  <CloseIcon />
                </IconButton>
                <Typography
                  sx={{ ml: 2, flex: 1 }}
                  variant="h6"
                  component="div"
                >
                  Delete farmland
                </Typography>
              </Toolbar>
            </AppBar>
            <CardContent>
              <h2>Do you want to delete this farmland?</h2>

              <Button onClick={confirmDelete}>delete</Button>
            </CardContent>
          </Card>
        </Dialog>
      )}
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
