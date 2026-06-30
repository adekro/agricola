import { supabase } from "../lib/supabaseClient";

export const notebookService = {
  // --- Companies ---
  async getCompanies() {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");
    if (error) throw error;
    return data;
  },

  async saveCompany(company) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...company, owner_id: user.id };
    const { data, error } = await supabase
      .from("companies")
      .upsert(payload)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteCompany(id) {
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // --- Inventory Products ---
  async getProducts(companyId = null) {
    let query = supabase
      .from("inventory_products")
      .select("*")
      .order("name");

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async saveProduct(product) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...product, owner_id: user.id };
    const { data, error } = await supabase
      .from("inventory_products")
      .upsert(payload)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteProduct(id) {
    const { error } = await supabase
      .from("inventory_products")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // --- Operations ---
  async getOperations(filters = {}) {
    let query = supabase
      .from("operations")
      .select("*, farmland:farmland_id(type, owner_display_name), product:product_id(name)")
      .order("operation_date", { ascending: false });

    if (filters.farmland_id) query = query.eq("farmland_id", filters.farmland_id);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.startDate) query = query.gte("operation_date", filters.startDate);
    if (filters.endDate) query = query.lte("operation_date", filters.endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async saveOperation(operation) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...operation, owner_id: user.id };
    const { data, error } = await supabase
      .from("operations")
      .upsert(payload)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteOperation(id) {
    const { error } = await supabase
      .from("operations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // --- Crop History ---
  async getCropHistory(farmlandId) {
    const { data, error } = await supabase
      .from("crop_history")
      .select("*")
      .eq("farmland_id", farmlandId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async saveCropHistory(entry) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...entry, owner_id: user.id };
    const { data, error } = await supabase
      .from("crop_history")
      .upsert(payload)
      .select();
    if (error) throw error;
    return data[0];
  },
};
