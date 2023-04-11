import { useCallback, useEffect } from "react";
import { useState } from "react";
import farmlandLoader from "../data/farmlandLoader";

const useFarmlands = () => {
  const [farmlands, setFarmlands] = useState([]);

  useEffect(() => {
    farmlandLoader.init();
    setFarmlands(farmlandLoader.getItems());
  }, []);

  const addFarmland = useCallback((newFarmland) => {
    setFarmlands((previousFarmlands) => {
      const updated = previousFarmlands.concat(newFarmland);

      return updated;
    });
  }, []);

  const removeFarmland = useCallback((id) => {
    setFarmlands((previousFarmlands) => {
      const updated = previousFarmlands.filter(
        (farmland) => farmland.id !== id
      );

      return updated;
    });
  }, []);

  const updateFarmland = useCallback((id, updatedFarmland) => {
    setFarmlands((previousFarmlands) => {
      const farmlandToUpdate = {
        ...previousFarmlands.find((farmland) => farmland.id === id),
        ...updatedFarmland,
      };
      const updated = previousFarmlands.map((farmland) =>
        farmland.id === id ? farmlandToUpdate : farmland
      );

      return updated;
    });
  }, []);

  return { farmlands, addFarmland, removeFarmland, updateFarmland };
};

export default useFarmlands;
