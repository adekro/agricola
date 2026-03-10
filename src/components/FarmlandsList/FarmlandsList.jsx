import FarmlandCard from "./FarmlandCard/FarmlandCard";

import styles from "./FarmlandList.module.scss";
import { useOutletContext } from "react-router-dom";

const FarmlandsList = (props) => {
  const context = useOutletContext() || {};
  const farmlands = props.farmlands || context.farmlands || [];
  const onClick = props.onClick || context.onClick || (() => {});

  const onViewHandler = (id) => {
    onClick(id);
  };

  return (
    <div>
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
    </div>
  );
};

export default FarmlandsList;
