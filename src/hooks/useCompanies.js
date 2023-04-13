import { useCallback, useEffect } from "react";
import { useState } from "react";
import companyLoader from "../data/companyLoader";

const useCompanies = () => {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    companyLoader.init();
    setCompanies(companyLoader.getItems());
  }, []);

  const addCompany = useCallback((newCompany) => {
    setCompanies((previousCompanies) => {
      const updated = previousCompanies.concat(newCompany);

      return updated;
    });
  }, []);

  const removeCompany = useCallback((id) => {
    setCompanies((previousCompanies) => {
      const updated = previousCompanies.filter(
        (company) => company.id !== id
      );

      return updated;
    });
  }, []);

  const updatedCompany = useCallback((id, updatedCompany) => {
    setCompanies((previousCompanies) => {
      const companyToUpdate = {
        ...previousCompanies.find((company) => company.id === id),
        ...updatedCompany,
      };
      const updated = previousCompanies.map((company) =>
        company.id === id ? companyToUpdate : company
      );

      return updated;
    });
  }, []);

  return { companies, addCompany, removeCompany, updatedCompany };
};

export default useCompanies;
