import styles from "./Header.module.scss";

const Header = ({ children }) => {
  return (
    <header className={styles.Header}>
      <a href="#default" className={styles.logo}>
        <img src="/logolabel.png" />
      </a>
      {children}
      <div className={styles["header-right"]}>
        <a className={styles.active} href="#home">
          Home
        </a>
        <a href="#contact">Contact</a>
        <a href="#about">About</a>
      </div>
    </header>
  );
};

export default Header;
