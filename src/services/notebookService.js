import { supabase } from "../lib/supabaseClient";

const COMPANY_CONTACT_SELECT = `
  id,
  company_id,
  owner_id,
  category,
  name,
  role_label,
  phone,
  email,
  notes,
  is_primary,
  created_at
`;

const COMPANY_DOCUMENT_SELECT = `
  id,
  company_id,
  owner_id,
  title,
  document_type,
  reference_number,
  issue_date,
  expiry_date,
  file_url,
  notes,
  created_at
`;

const buildLegacyOwnerContact = (company) => {
  if (!company?.owner_name?.trim()) {
    return null;
  }

  return {
    id: `legacy-owner-${company.id}`,
    company_id: company.id,
    owner_id: company.owner_id,
    category: "owner",
    name: company.owner_name,
    role_label: "Titolare",
    phone: company.phone || "",
    email: company.email || "",
    notes: "Contatto derivato dal campo legacy owner_name.",
    is_primary: true,
    created_at: company.created_at,
    is_legacy: true,
  };
};

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

  async getCompany(id) {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .maybeSingle();
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
    const savedCompany = data[0];

    if (savedCompany.owner_name?.trim()) {
      const { data: ownerContacts, error: ownerContactsError } = await supabase
        .from("company_contacts")
        .select("id")
        .eq("company_id", savedCompany.id)
        .eq("category", "owner")
        .order("created_at", { ascending: true });
      if (ownerContactsError) throw ownerContactsError;

      const primaryOwnerContact = ownerContacts?.[0];
      const ownerPayload = {
        id: primaryOwnerContact?.id,
        company_id: savedCompany.id,
        owner_id: user.id,
        category: "owner",
        name: savedCompany.owner_name.trim(),
        role_label: "Titolare",
        phone: savedCompany.phone || "",
        email: savedCompany.email || "",
        is_primary: true,
      };

      const { error: ownerUpsertError } = await supabase
        .from("company_contacts")
        .upsert(ownerPayload);
      if (ownerUpsertError) throw ownerUpsertError;
    }

    return savedCompany;
  },

  async deleteCompany(id) {
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // --- Company Contacts ---
  async getCompanyContacts(companyId, category = null) {
    let query = supabase
      .from("company_contacts")
      .select(COMPANY_CONTACT_SELECT)
      .eq("company_id", companyId)
      .order("category")
      .order("is_primary", { ascending: false })
      .order("name");

    if (category) {
      query = query.eq("category", category);
    }

    const [{ data, error }, company] = await Promise.all([
      query,
      this.getCompany(companyId),
    ]);
    if (error) throw error;

    const contacts = data || [];
    const includesOwnerCategory = !category || category === "owner";
    const hasOwner = contacts.some((item) => item.category === "owner");
    const legacyOwner = includesOwnerCategory && !hasOwner
      ? buildLegacyOwnerContact(company)
      : null;

    return legacyOwner ? [legacyOwner, ...contacts] : contacts;
  },

  async saveCompanyContact(contact) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...contact, owner_id: user.id };
    const { data, error } = await supabase
      .from("company_contacts")
      .upsert(payload)
      .select(COMPANY_CONTACT_SELECT);
    if (error) throw error;
    return data[0];
  },

  async deleteCompanyContact(id) {
    const { error } = await supabase
      .from("company_contacts")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // --- Company Documents ---
  async getCompanyDocuments(companyId) {
    const { data, error } = await supabase
      .from("company_documents")
      .select(COMPANY_DOCUMENT_SELECT)
      .eq("company_id", companyId)
      .order("expiry_date", { ascending: true })
      .order("title");
    if (error) throw error;
    return data || [];
  },

  async saveCompanyDocument(document) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...document, owner_id: user.id };
    const { data, error } = await supabase
      .from("company_documents")
      .upsert(payload)
      .select(COMPANY_DOCUMENT_SELECT);
    if (error) throw error;
    return data[0];
  },

  async deleteCompanyDocument(id) {
    const { error } = await supabase
      .from("company_documents")
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

  // --- Soil Analysis History ---
  async getSoilAnalysisHistory(farmlandId) {
    const { data, error } = await supabase
      .from("soil_analysis_history")
      .select("*")
      .eq("farmland_id", farmlandId)
      .order("analysis_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async saveSoilAnalysis(entry) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...entry, owner_id: user.id };
    const { data, error } = await supabase
      .from("soil_analysis_history")
      .upsert(payload)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteSoilAnalysis(id) {
    const { error } = await supabase
      .from("soil_analysis_history")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
