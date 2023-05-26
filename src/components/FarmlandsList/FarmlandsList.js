import { styled } from "@mui/material";
import FarmlandCard from "./FarmlandCard/FarmlandCard";

import styles from "./FarmlandList.module.scss";

const FarmlandsList = ({ farmlands, onClick }) => {
  const onViewHandler = (id) => {
    onClick(id);
  };

  const ResponsiveList = styled("div")(({ theme }) => ({
    // [theme.breakpoints.down("md")]: {
    //   display: "flex",
    //   flexDirection: "column",
    //   flexWrap: "no-wrap",
    // },
    // [theme.breakpoints.up("md")]: {
    //   display: "flex",
    //   flexDirection: "column",
    //   flexWrap: "no-wrap",
    // },
    // [theme.breakpoints.up("lg")]: {
    //   display: "flex",
    //   flexDirection: "row",
    //   flexWrap: "wrap",
    // },
  }));

  return (
    <ResponsiveList className={styles.FarmlandList}>
      {farmlands &&
        farmlands.map((farm) => (
          <FarmlandCard
            type={farm.type}
            area={farm.area}
            perimeter={farm.perimeter}
            location={farm.location}
            ownerDisplayName={farm.ownerDisplayName}
            key={farm.id}
            id={farm.id}
            onView={onViewHandler}
          />
        ))}
    </ResponsiveList>
  );
};

export default FarmlandsList;
