import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
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
import * as Yup from "yup";

const ValidateSchema = Yup.object().shape({
  area: Yup.string().required("Required"),
  perimeter: Yup.string().required("Required"),
  owner: Yup.object().required("Required"),
});

const NewFarmlandScreen = ({ onClose, farmlandId }) => {
  const [open, setOpen] = useState(true);
  const [area, setArea] = useState();
  const [perimeter, setPerimeter] = useState();
  const [coordinates, setCoordinates] = useState();
  const { companies } = useCompanies();

  const handleOnClose = useCallback(() => {
    setOpen(false);
    onClose("farmlands");
  }, [onClose]);

  const onSaveFarmHandler = () => {
    const data = farmlandLoader.getItems();
    const newFarmland = {
      ...formik.values,
      ownerDisplayName: formik.values.owner.name,
      coordinates: coordinates,
    };
    farmlandLoader.storeItems([...data, newFarmland]);
    handleOnClose();
  };

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
      owner: "",
    },
    ValidateSchema: ValidateSchema,
    onSubmit: (values) => {
      alert(JSON.stringify(values, null, 2));
    },
  });

  useEffect(() => {
    if (area && perimeter) {
      formik.setFieldValue("area", area);
      formik.setFieldValue("perimeter", perimeter);
    }
  }, [area, perimeter, formik]);

  useEffect(() => {
    if (farmlandId) {
      const farm = farmlandLoader
        .getItems()
        .find((farm) => farm.id === farmlandId);

      formik.setFieldValue("area", farm?.area || "");
      formik.setFieldValue("perimeter", farm?.perimeter || "");
      formik.setFieldValue("type", farm?.type || "");
      formik.setFieldValue("notes", farm?.notes || "");
      formik.setFieldValue("owner", farm?.owner || "");
    }
  }, [farmlandId, formik]);

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
        {/* <NewFarmlandForm area={area} perimeter={perimeter} /> */}
        <form
          className={classes.NewFarmlandForm}
          onSubmit={formik.handleSubmit}
        >
          <TextField
            onChange={formik.handleChange}
            value={formik.values.area}
            label="Area"
            name="area"
            disabled
            className={classes.Input}
            fullWidth
            error={formik.touched.area && Boolean(formik.errors.email)}
          />
          <TextField
            onChange={formik.handleChange}
            value={formik.values.perimeter}
            label="Perimeter"
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
          {/* <TextField label="Location" name="location" /> */}
          <FormControl fullWidth className={classes.Input}>
            <InputLabel id="owner-label">Owner</InputLabel>
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
            </Select>
          </FormControl>
          <div className={classes.buttons}></div>
        </form>
      </div>
    </FullScreenDialog>
  );
};

export default NewFarmlandScreen;
