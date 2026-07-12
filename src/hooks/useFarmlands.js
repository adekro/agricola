import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const normalizeCompanyName = (name = "") => name.trim().toLowerCase();

const mapFromSupabase = (item) => ({
  id: item.id,
  name: item.name,
  type: item.type,
  area: item.area,
  perimeter: item.perimeter,
  notes: item.notes,
  location: item.location,
  ownerDisplayName: item.owner_display_name,
  coordinates: item.coordinates,
  geometry: item.geometry || null,
  company_id: item.company_id || null,
  createdAt: item.created_at,
  cadastralParcel: item.cadastral_parcel || null,
  currentCrop: item.current_crop || null,
});

const mapCompanyFromSupabase = (item) => ({
  id: item.id,
  name: item.name,
  vat_number: item.vat_number,
  owner_name: item.owner_name,
  authorized_operators: item.authorized_operators,
  owner_id: item.owner_id,
  created_at: item.created_at,
});

const mapToSupabase = (item, userId) => ({
  name: item.name,
  type: item.type,
  area: item.area,
  perimeter: item.perimeter,
  notes: item.notes,
  location: item.location,
  owner_display_name: item.ownerDisplayName,
  coordinates: item.coordinates,
  geometry: item.geometry || null,
  company_id: item.company_id || null,
  owner_id: userId,
  cadastral_parcel: item.cadastralParcel,
  current_crop: item.currentCrop,
});

const shouldRetryWithoutCadastralParcel = (error) =>
  error?.code === "PGRST204" &&
  typeof error?.message === "string" &&
  error.message.includes("cadastral_parcel");

const removeCadastralParcel = (payload) => {
  const { cadastral_parcel, ...rest } = payload;
  return rest;
};

const useFarmlands = () => {
  const [farmlands, setFarmlands] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCompanies = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCompanies([]);
        return;
      }

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setCompanies((data || []).map(mapCompanyFromSupabase));
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError(err.message);
    }
  }, []);

  const fetchFarmlands = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("farmlands")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFarmlands((data || []).map(mapFromSupabase));
    } catch (err) {
      console.error("Error fetching farmlands:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFarmlands();
  }, [fetchFarmlands]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const addFarmland = useCallback(async (newFarmland) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const payload = mapToSupabase(newFarmland, user.id);
      let { data, error } = await supabase
        .from("farmlands")
        .insert([payload])
        .select();

      if (error && shouldRetryWithoutCadastralParcel(error)) {
        ({ data, error } = await supabase
          .from("farmlands")
          .insert([removeCadastralParcel(payload)])
          .select());
      }

      if (error) throw error;

      const addedItem = mapFromSupabase(data[0]);
      setFarmlands((prev) => [addedItem, ...prev]);
      return addedItem;
    } catch (err) {
      console.error("Error adding farmland:", err);
      setError(err.message);
      throw err;
    }
  }, []);

  const removeFarmland = useCallback(async (id) => {
    try {
      const { error } = await supabase.from("farmlands").delete().eq("id", id);

      if (error) throw error;
      setFarmlands((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Error removing farmland:", err);
      setError(err.message);
      throw err;
    }
  }, []);

  const updateFarmland = useCallback(async (id, updatedFarmland) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const payload = mapToSupabase(updatedFarmland, user.id);
      let { data, error } = await supabase
        .from("farmlands")
        .update(payload)
        .eq("id", id)
        .select();

      if (error && shouldRetryWithoutCadastralParcel(error)) {
        ({ data, error } = await supabase
          .from("farmlands")
          .update(removeCadastralParcel(payload))
          .eq("id", id)
          .select());
      }

      if (error) throw error;

      const updatedItem = mapFromSupabase(data[0]);
      setFarmlands((prev) => prev.map((f) => (f.id === id ? updatedItem : f)));
      return updatedItem;
    } catch (err) {
      console.error("Error updating farmland:", err);
      setError(err.message);
      throw err;
    }
  }, []);

  const createCompany = useCallback(
    async (companyDraft) => {
      const normalizedName = normalizeCompanyName(companyDraft?.name);
      if (!normalizedName) {
        throw new Error("Company name is required");
      }

      const existingCompany = companies.find(
        (company) => normalizeCompanyName(company.name) === normalizedName,
      );
      if (existingCompany) {
        return existingCompany;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const payload = {
          name: companyDraft.name.trim(),
          vat_number: companyDraft.vat_number || null,
          owner_name: companyDraft.owner_name || null,
          authorized_operators: companyDraft.authorized_operators || [],
          owner_id: user.id,
        };

        const { data, error } = await supabase
          .from("companies")
          .insert([payload])
          .select();

        if (error) throw error;

        const createdCompany = mapCompanyFromSupabase(data[0]);
        setCompanies((prev) => {
          const withoutDuplicate = prev.filter(
            (company) =>
              normalizeCompanyName(company.name) !==
              normalizeCompanyName(createdCompany.name),
          );

          return [...withoutDuplicate, createdCompany].sort((left, right) =>
            left.name.localeCompare(right.name),
          );
        });
        return createdCompany;
      } catch (err) {
        console.error("Error creating company:", err);
        setError(err.message);
        throw err;
      }
    },
    [companies],
  );

  return {
    farmlands,
    addFarmland,
    removeFarmland,
    updateFarmland,
    reloadFarmland: fetchFarmlands,
    companies,
    reloadCompanies: fetchCompanies,
    createCompany,
    loading,
    error,
  };
};

export default useFarmlands;
