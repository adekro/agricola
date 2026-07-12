import FarmlandCard from "./FarmlandCard/FarmlandCard";
import FarmlandScreen from "../FarmlandScreen/FarmlandScreen";

import styles from "./FarmlandList.module.scss";
import { useOutletContext } from "react-router-dom";

const FarmlandsList = (props) => {
  const context = useOutletContext() || {};
  const farmlands = props.farmlands || context.farmlands || [];
  const onClick = props.onClick || context.onClick || (() => {});

  const onViewHandler = (id) => {
    onClick(id);
  };

  console.log("FarmlandsList rendering with farmlands:", farmlands);

  return (
    <div className={styles.farmlandList}>
      {farmlands &&
        farmlands.map((farm) => (
          <FarmlandCard
            name={farm.name}
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
    </div>
  );
};

export default FarmlandsList;
