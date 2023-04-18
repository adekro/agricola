import styles from "./Search.module.scss";

const Search = ({ mode, onChange }) => {
  return (
    <>
      {mode != "" && (
        <input
          className={styles.Search}
          type={"text"}
          placeholder={`Search ${
            mode === "farmlands" ? "farmlands" : "companies"
          } ...`}
          name="search"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </>
  );
};

export default Search;
