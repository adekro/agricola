import classes from "./BackButton.module.css";
const BackButton = ({ onClick }) => {
  const backHandler = () => {
    onClick();
  };

  return (
    <div className={classes.layoutContentBack}>
      <button onClick={backHandler} className={classes.button}>
        X
      </button>
    </div>
  );
};
export default BackButton;
