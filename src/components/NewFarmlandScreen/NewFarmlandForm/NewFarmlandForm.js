import { TextField } from "@mui/material";
import { useFormik } from "formik";
import { useEffect } from "react";
import * as Yup from "yup";
import classes from "./NewFarmlandForm.module.scss";

const ValidateSchema = Yup.object().shape({
  type: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
});

const NewFarmlandForm = ({ area, perimeter }) => {
  const formik = useFormik({
    initialValues: {
      area: "",
      perimeter: "",
      type: "",
      notes: "",
      ownerDisplayName: "",
    },
    validationSchema: ValidateSchema,
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

  return (
    <form className={classes.NewFarmlandForm} onSubmit={formik.handleSubmit}>
      <TextField
        onChange={formik.handleChange}
        value={formik.values.area}
        label="Area"
        name="area"
        disabled
        className={classes.Input}
      />
      <TextField
        onChange={formik.handleChange}
        value={formik.values.perimeter}
        label="Perimeter"
        name="perimeter"
        disabled
        className={classes.Input}
      />
      <TextField
        onChange={formik.handleChange}
        value={formik.values.type}
        label="Type of farming"
        name="type"
        className={classes.Input}
      />
      <TextField
        onChange={formik.handleChange}
        value={formik.values.notes}
        label="Notes"
        name="notes"
        className={classes.Input}
      />
      {/* <TextField label="Location" name="location" /> */}
      <TextField
        onChange={formik.handleChange}
        value={formik.values.ownerDisplayName}
        label="Owner"
        name="ownerDisplayName"
        className={classes.Input}
      />
      <div className={classes.buttons}></div>
    </form>
  );
};

export default NewFarmlandForm;
