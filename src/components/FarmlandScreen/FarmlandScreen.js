import {
  Button,
  TextField,
  FormControl,
  Autocomplete,
  Snackbar,
  Alert,
  styled,
} from "@mui/material";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";
import { useState, useCallback } from "react";
import classes from "./FarmlandScreen.module.scss";
import DrawableMap from "../WorldMap/DrawableMap/DrawableMap";
import { useMemo } from "react";
import farmlandLoader from "../../data/farmlandLoader";
import { useFormik } from "formik";
import { useEffect } from "react";
import useFarmlands from "../../hooks/useFarmlands";
import Modal from "../UI/Modal/Modal";
import WorldMap from "../WorldMap/WorldMap";

export const ResponsiveDiv = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  // [theme.breakpoints.up("md")]: {
  //   width: "initial",
  // },
  // [theme.breakpoints.up("lg")]: {
  //   width: "700px",
  // },
}));

const FarmlandScreen = ({
  onClose,
  farmlandId,
  onCreate,
  onUpdate,
  farmland,
  onDelete,
}) => {
  const [open, setOpen] = useState(true);
  const [area, setArea] = useState();
  const [perimeter, setPerimeter] = useState();
  const [coordinates, setCoordinates] = useState();
  const [error, setError] = useState();
  const [owner, setOwner] = useState("");
  const { companies } = useFarmlands();
  const [isDelFarmland, setIsDelFarmland] = useState(false);

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

  const handleOnClose = useCallback(() => {
    setOpen(false);
    onClose();
  }, [onClose]);

  const onSaveFarmHandler = useCallback(() => {
    const newFarmland = {
      ...formik.values,
      ownerDisplayName: owner,
      coordinates: farmland ? farmland.coordinates : coordinates,
    };
    if (!newFarmland.area || !newFarmland.perimeter) {
      setError("Please fill all the required data");
      return;
    }
    if (farmland) {
      onUpdate(farmlandId, newFarmland);
    } else {
      onCreate(newFarmland);
    }

    handleOnClose();
  }, [owner, coordinates, onCreate, handleOnClose, formik.values]);

  const drawCompletedHandler = useCallback(
    ({ area, perimeter, coordinates }) => {
      setArea(area);
      setPerimeter(perimeter);
      setCoordinates(coordinates);
    },
    []
  );

  const deleteHandler = useCallback(() => {
    setIsDelFarmland(true);
  }, []);

  const handleDelOnClose = useCallback(() => {
    setIsDelFarmland(false);
  }, [isDelFarmland]);

  const confirmDelete = useCallback(() => {
    setIsDelFarmland(false);
    onDelete(farmland.id);
    handleOnClose();
  }, [farmland, onDelete, handleOnClose]);

  const optimizedMap = useMemo(
    () => <DrawableMap onDrawCompleted={drawCompletedHandler} />,
    [drawCompletedHandler]
  );

  const map = useMemo(
    () => <WorldMap coordinates={farmland ? farmland.coordinates : null} />,
    [farmland]
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

  useEffect(() => {
    if (farmland) {
      setOwner(farmland.ownerDisplayName);
    }
  }, []);

  const changeCompanyHandler = useCallback((_event, newValue) => {
    if (newValue) {
      setOwner(newValue);
    } else {
      setOwner("");
    }
  }, []);

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
      <ResponsiveDiv className={classes.MapForm}>
        <div className={classes.MapContent}>
          {!farmland && optimizedMap}
          {farmland && map}
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
          </form>
        </div>
        {farmland && (
          <div className={classes.detailsWrapper}>
            <Button onClick={deleteHandler}>Delete farmland</Button>
          </div>
        )}
      </ResponsiveDiv>

      <Snackbar
        severity="error"
        open={!!error}
        autoHideDuration={6000}
        onClose={closeHandler}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>

      {isDelFarmland && (
        <Modal
          open={isDelFarmland}
          title="Delete farmland"
          confirmButtonLabel="Delete"
          onClose={handleDelOnClose}
          onConfirm={confirmDelete}
        >
          <h2>Do you want to delete this farmland?</h2>
        </Modal>
      )}
    </FullScreenDialog>
  );
};

export default FarmlandScreen;
