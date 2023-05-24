import { useCallback, useEffect } from "react";
import { useState } from "react";
import farmlandLoader from "../data/farmlandLoader";

const useFarmlands = () => {
  const [farmlands, setFarmlands] = useState([]);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    if (!farmlandLoader.getItems()) {
      farmlandLoader.init();
    }
    setFarmlands(farmlandLoader.getItems());
  }, []);

  useEffect(() => {
    if (farmlands) {
      let companiesFound = [];
      const filteredCompanies = farmlands
        .reduce((accumulator, current) => {
          if (!accumulator.find((item) => item === current.ownerDisplayName)) {
            accumulator = accumulator.concat(current.ownerDisplayName);
          }
          return accumulator;
        }, companiesFound)
        .filter(Boolean);

      setCompanies(filteredCompanies);
    }
  }, [farmlands]);

  const addFarmland = useCallback((newFarmland) => {
    setFarmlands((previousFarmlands) => {
      const newFieldWithId = newFarmland.id
        ? newFarmland
        : { ...newFarmland, id: `${new Date().getTime()}` };
      const updated = previousFarmlands.concat(newFieldWithId);

      farmlandLoader.storeItems(updated);

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

  return { farmlands, addFarmland, removeFarmland, updateFarmland, companies };
};

export default useFarmlands;
