import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const useFarmlands = () => {
  const [farmlands, setFarmlands] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mapFromSupabase = (item) => ({
    id: item.id,
    type: item.type,
    area: item.area,
    perimeter: item.perimeter,
    notes: item.notes,
    location: item.location,
    ownerDisplayName: item.owner_display_name,
    coordinates: item.coordinates,
    createdAt: item.created_at,
  });

  const mapToSupabase = (item, userId) => ({
    type: item.type,
    area: item.area,
    perimeter: item.perimeter,
    notes: item.notes,
    location: item.location,
    owner_display_name: item.ownerDisplayName,
    coordinates: item.coordinates,
    owner_id: userId,
  });

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
      setFarmlands(data.map(mapFromSupabase));
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
    if (farmlands.length > 0) {
      const uniqueCompanies = [
        ...new Set(
          farmlands
            .map((f) => f.ownerDisplayName)
            .filter(Boolean)
        ),
      ];
      setCompanies(uniqueCompanies);
    }
  }, [farmlands]);

  const addFarmland = useCallback(async (newFarmland) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("farmlands")
        .insert([mapToSupabase(newFarmland, user.id)])
        .select();

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
      const { error } = await supabase
        .from("farmlands")
        .delete()
        .eq("id", id);

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

      const { data, error } = await supabase
        .from("farmlands")
        .update(mapToSupabase(updatedFarmland, user.id))
        .eq("id", id)
        .select();

      if (error) throw error;

      const updatedItem = mapFromSupabase(data[0]);
      setFarmlands((prev) =>
        prev.map((f) => (f.id === id ? updatedItem : f))
      );
      return updatedItem;
    } catch (err) {
      console.error("Error updating farmland:", err);
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    farmlands,
    addFarmland,
    removeFarmland,
    updateFarmland,
    reloadFarmland: fetchFarmlands,
    companies,
    loading,
    error,
  };
};

export default useFarmlands;
