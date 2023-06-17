import React, { useState, useEffect } from "react";
import companyLoader from "../../data/companyLoader";
import { AppBar, IconButton, Toolbar, Typography, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FullScreenDialog from "../UI/FullScreenDialog/FullScreenDialog";
import { useFormik } from "formik";
import * as Yup from "yup";
import TextField from "@mui/material/TextField";
import classes from "./NewCompanyScreen.module.css";

const ValidateSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
  email: Yup.string().email("Invalid email"),
});

const NewCompanyScreen = ({ onClose, companyId }) => {
  const [open, setOpen] = useState(true);

  const handleOnClose = () => {
    setOpen(false);
    onClose("companies");
  };

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      website: "",
      notes: "",
    },
    validationSchema: ValidateSchema,
    onSubmit: (values) => {
      alert(JSON.stringify(values, null, 2));
    },
  });

  useEffect(() => {
    companyLoader.init();

    let list = companyLoader.getItems(companyId)[0];

    formik.setFieldValue("name", companyId ? list.name : "");
    formik.setFieldValue("email", companyId ? list.email : "");
    formik.setFieldValue("phone", companyId ? list.phone : "");
    formik.setFieldValue("website", companyId ? list.website : "");
    formik.setFieldValue("notes", companyId ? list.notes : "");
  }, [companyId, formik]);

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
            Create new company
          </Typography>
          <Button autoFocus color="inherit" onClick={handleOnClose}>
            save
          </Button>
        </Toolbar>
      </AppBar>
      <div className={classes.layoutContentItem}>
        <form onSubmit={formik.handleSubmit} className={classes.form}>
          <TextField
            fullWidth
            label="Name"
            id="name"
            name="name"
            onChange={formik.handleChange}
            value={formik.values.name}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
          />

          <TextField
            fullWidth
            label="Email"
            id="email"
            name="email"
            type="email"
            onChange={formik.handleChange}
            value={formik.values.email}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />

          <TextField
            fullWidth
            label="Phone"
            type="tel"
            name="phone"
            onChange={formik.handleChange}
            value={formik.values.phone}
          />

          <TextField
            fullWidth
            label="Website"
            type="text"
            name="website"
            onChange={formik.handleChange}
            value={formik.values.website}
          />

          <TextField
            fullWidth
            label="Notes"
            type="text"
            name="notes"
            onChange={formik.handleChange}
            value={formik.values.notes}
            multiline={true}
          />
          <div className={classes.submitcontainer}>
            <button
              variant="contained"
              type="submit"
              className={classes.buttonsubmit}
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </FullScreenDialog>
  );
};

export default NewCompanyScreen;
