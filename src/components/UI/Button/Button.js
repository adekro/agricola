import "./Button.css";

const Button = (props) => {
  return (
    <button {...props} className="Button">
      {props.children}
    </button>
  );
};

export default Button;
