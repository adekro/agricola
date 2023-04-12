import "./Button.scss";

const Button = (props) => {
  return (
    <button {...props} className="Button">
      {props.children}
    </button>
  );
};

export default Button;
