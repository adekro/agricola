import React, { useEffect } from "react";
import classes from "./CompanyScreen.module.css";
import { useFormik } from "formik";
import * as Yup from "yup";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import companyLoader from "../../../data/companyLoader";
import BackButton from "../../UI/BackButton/BackButton";

const ValidateSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
  email: Yup.string().email("Invalid email"),
});

const CompanyScreen = ({ onBack, companyId }) => {
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

    formik.setFieldValue("name", list.name);
    formik.setFieldValue("email", list.email);
    formik.setFieldValue("phone", list.phone);
    formik.setFieldValue("website", list.website);
    formik.setFieldValue("notes", list.notes);
  }, []);

  const backHandler = () => {
    onBack("companies");
  };

  return (
    <div className={classes.layoutBody}>
      <div className={classes.layoutContent}>
        <BackButton onClick={backHandler} />
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
      </div>
    </div>
  );
};
export default CompanyScreen;
