import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment, TextField } from "@mui/material";

const Search = ({ mode, onChange, className }) => {
  return (
    <>
      {mode !== "" && (
        <div className={className}>
          <TextField
            id="search"
            name="search"
            placeholder={`Search ${
              mode === "farmlands" ? "farmlands" : "companies"
            } ...`}
            type={"text"}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      )}
    </>
  );
};

export default Search;
