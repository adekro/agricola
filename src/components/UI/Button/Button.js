import styles from "./Button.module.scss";

const Button = (props) => {
  return (
    <button {...props} className={styles.Button}>
      {props.children}
    </button>
  );
};

export default Button;
