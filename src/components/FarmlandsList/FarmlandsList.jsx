import FarmlandCard from "./FarmlandCard/FarmlandCard";
import styles from "./FarmlandList.module.scss";
import { useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import { notebookService } from "../../services/notebookService";

const FarmlandsList = (props) => {
  const context = useOutletContext() || {};
  const farmlands = props.farmlands || context.farmlands || [];
  const onClick = props.onClick || context.onClick || (() => {});
  const [summaries, setSummaries] = useState({});

  useEffect(() => {
    let active = true;
    const loadSummaries = async () => {
      try {
        const entries = await Promise.all(
          farmlands.map(async (farmland) => {
            const [summary, operations] = await Promise.all([
              notebookService.getFarmlandSummary(farmland.id),
              notebookService.getFarmlandOperations(farmland.id),
            ]);
            return [
              farmland.id,
              {
                crops: summary.crops.slice(0, 5),
                annualSau: summary.annualSau,
                treatments: operations
                  .filter((operation) => operation.type === "Trattamento fitosanitario")
                  .slice(0, 5),
              },
            ];
          }),
        );
        if (active) setSummaries(Object.fromEntries(entries));
      } catch (error) {
        console.error("Error loading farmland list summaries:", error);
      }
    };
    loadSummaries();
    return () => {
      active = false;
    };
  }, [farmlands]);

  const onViewHandler = (id) => {
    onClick(id);
  };

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
            summary={summaries[farm.id]}
            key={farm.id}
            id={farm.id}
            onView={onViewHandler}
          />
        ))}
    </div>
  );
};

export default FarmlandsList;
