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

const HARVEST_SELECT = `
  id,
  created_at,
  harvest_date,
  farmland_id,
  company_id,
  crop,
  notes,
  owner_id,
  farmland:farmland_id(id, type, owner_display_name, current_crop),
  company:company_id(id, name)
`;

const HARVEST_BATCH_SELECT = `
  id,
  created_at,
  harvest_id,
  lot_code,
  quantity,
  unit_of_measure,
  quality,
  notes,
  owner_id
`;

const HARVEST_DESTINATION_SELECT = `
  id,
  created_at,
  harvest_batch_id,
  contact_id,
  quantity,
  destination_type,
  notes,
  owner_id,
  contact:contact_id(id, name, category, role_label)
`;

const mapFarmlandRecord = (item) => ({
  id: item.id,
  name: item.name,
  type: item.type,
  area: item.area,
  perimeter: item.perimeter,
  notes: item.notes,
  location: item.location,
  ownerDisplayName: item.owner_display_name,
  coordinates: item.coordinates,
  createdAt: item.created_at,
  cadastralParcel: item.cadastral_parcel || null,
  currentCrop: item.current_crop || null,
  company_id: item.company_id || null,
});

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

  // --- Harvests ---
  async getHarvests(filters = {}) {
    let query = supabase
      .from("harvests")
      .select(HARVEST_SELECT)
      .order("harvest_date", { ascending: false });

    if (filters.company_id) query = query.eq("company_id", filters.company_id);
    if (filters.farmland_id) query = query.eq("farmland_id", filters.farmland_id);
    if (filters.crop) query = query.ilike("crop", `%${filters.crop}%`);
    if (filters.startDate) query = query.gte("harvest_date", filters.startDate);
    if (filters.endDate) query = query.lte("harvest_date", filters.endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getHarvest(id) {
    const { data, error } = await supabase
      .from("harvests")
      .select(HARVEST_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async saveHarvest(harvest) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...harvest, owner_id: user.id };
    const { data, error } = await supabase
      .from("harvests")
      .upsert(payload)
      .select(HARVEST_SELECT);
    if (error) throw error;
    return data[0];
  },

  async deleteHarvest(id) {
    const { error } = await supabase
      .from("harvests")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getHarvestBatches(harvestId) {
    const { data, error } = await supabase
      .from("harvest_batches")
      .select(HARVEST_BATCH_SELECT)
      .eq("harvest_id", harvestId)
      .order("created_at");
    if (error) throw error;
    return data || [];
  },

  async saveHarvestBatch(batch) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...batch, owner_id: user.id };
    const { data, error } = await supabase
      .from("harvest_batches")
      .upsert(payload)
      .select(HARVEST_BATCH_SELECT);
    if (error) throw error;
    return data[0];
  },

  async deleteHarvestBatch(id) {
    const { error } = await supabase
      .from("harvest_batches")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getHarvestDestinations(batchId) {
    const { data, error } = await supabase
      .from("harvest_destinations")
      .select(HARVEST_DESTINATION_SELECT)
      .eq("harvest_batch_id", batchId)
      .order("created_at");
    if (error) throw error;
    return data || [];
  },

  async saveHarvestDestination(destination) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...destination, owner_id: user.id };
    const { data, error } = await supabase
      .from("harvest_destinations")
      .upsert(payload)
      .select(HARVEST_DESTINATION_SELECT);
    if (error) throw error;
    return data[0];
  },

  async deleteHarvestDestination(id) {
    const { error } = await supabase
      .from("harvest_destinations")
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

  async getProductsByFarmland(farmlandId) {
    const farmland = await this.getFarmland(farmlandId);
    if (!farmland?.company_id) {
      return [];
    }

    return this.getProducts(farmland.company_id);
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

  async getProductBatches(companyId, productId = null) {
    let query = supabase
      .from("inventory_batches")
      .select("*, product:product_id(id, name, category, minimum_stock)")
      .eq("company_id", companyId)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("batch_number");

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async saveProductBatch(batch) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...batch, owner_id: user.id };
    const { data, error } = await supabase
      .from("inventory_batches")
      .upsert(payload)
      .select("*, product:product_id(id, name, category, minimum_stock)");
    if (error) throw error;
    return data[0];
  },

  async deleteProductBatch(id) {
    const { error } = await supabase
      .from("inventory_batches")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getInventoryMovements(companyId, batchId = null) {
    let query = supabase
      .from("inventory_movements")
      .select("*, batch:inventory_batch_id(batch_number), product:product_id(name), operation:operation_id(id, type)")
      .eq("company_id", companyId)
      .order("movement_date", { ascending: false });

    if (batchId) {
      query = query.eq("inventory_batch_id", batchId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async saveInventoryMovement(movement) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...movement, owner_id: user.id };
    const { data, error } = await supabase
      .from("inventory_movements")
      .upsert(payload)
      .select("*, batch:inventory_batch_id(batch_number), product:product_id(name)");
    if (error) throw error;
    return data[0];
  },

  // --- Operations ---
  async getOperations(filters = {}) {
    let query = supabase
      .from("operations")
      .select("*, farmland:farmland_id(id, type, area, company_id, owner_display_name, currentCrop), product:product_id(id, name, category, company_id), batch:inventory_batch_id(id, batch_number, expiry_date), company:company_id(id, name)")
      .order("operation_date", { ascending: false });

    if (filters.farmland_id) query = query.eq("farmland_id", filters.farmland_id);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.company_id) query = query.eq("company_id", filters.company_id);
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

  async getFarmlandOperations(farmlandId) {
    return this.getOperations({ farmland_id: farmlandId });
  },

  async getFarmland(id) {
    const { data, error } = await supabase
      .from("farmlands")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getFarmlands() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("farmlands")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapFarmlandRecord);
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

  async getFarmlandSummary(farmlandId) {
    const minimumYear = new Date().getFullYear() - 4;
    const [linksResult, cropsResult, sauResult] = await Promise.all([
      supabase
        .from("farmland_cadastral_identifiers")
        .select("cadastral_identifier:cadastral_identifier_id(*)")
        .eq("farmland_id", farmlandId),
      supabase
        .from("crop_history")
        .select("*")
        .eq("farmland_id", farmlandId)
        .gte("year", minimumYear)
        .order("year", { ascending: false }),
      supabase
        .from("farmland_annual_sau")
        .select("*")
        .eq("farmland_id", farmlandId)
        .gte("year", minimumYear)
        .order("year", { ascending: false }),
    ]);
    if (linksResult.error) throw linksResult.error;
    if (cropsResult.error) throw cropsResult.error;
    if (sauResult.error) throw sauResult.error;
    return {
      cadastralIdentifiers: (linksResult.data || []).map(
        (item) => item.cadastral_identifier,
      ),
      crops: cropsResult.data || [],
      annualSau: sauResult.data || [],
    };
  },

  async addCadastralIdentifier(farmlandId, identifier) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    const normalized = {
      province: identifier.province?.trim() || "",
      municipality: identifier.municipality.trim(),
      sheet: identifier.sheet.trim(),
      parcel: identifier.parcel.trim(),
      subaltern: identifier.subaltern?.trim() || "",
    };
    let { data: cadastral, error: cadastralError } = await supabase
      .from("cadastral_identifiers")
      .upsert(normalized, {
        onConflict: "province,municipality,sheet,parcel,subaltern",
        ignoreDuplicates: true,
      })
      .select()
      .maybeSingle();
    if (cadastralError) throw cadastralError;
    if (!cadastral) {
      const existingResult = await supabase
        .from("cadastral_identifiers")
        .select("*")
        .eq("province", normalized.province)
        .eq("municipality", normalized.municipality)
        .eq("sheet", normalized.sheet)
        .eq("parcel", normalized.parcel)
        .eq("subaltern", normalized.subaltern)
        .single();
      if (existingResult.error) throw existingResult.error;
      cadastral = existingResult.data;
    }
    const { error } = await supabase
      .from("farmland_cadastral_identifiers")
      .upsert({ farmland_id: farmlandId, cadastral_identifier_id: cadastral.id, owner_id: user.id });
    if (error) throw error;
    return cadastral;
  },

  async removeCadastralIdentifier(farmlandId, identifierId) {
    const { error } = await supabase
      .from("farmland_cadastral_identifiers")
      .delete()
      .eq("farmland_id", farmlandId)
      .eq("cadastral_identifier_id", identifierId);
    if (error) throw error;
  },

  async saveAnnualSau(farmlandId, year, sau) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    const { data, error } = await supabase
      .from("farmland_annual_sau")
      .upsert({ farmland_id: farmlandId, year, sau, owner_id: user.id }, { onConflict: "farmland_id,year" })
      .select()
      .single();
    if (error) throw error;
    return data;
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

  async getFertilizationPlans(farmlandId) {
    const { data, error } = await supabase
      .from("fertilization_plans")
      .select("*")
      .eq("farmland_id", farmlandId)
      .order("recommended_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async saveFertilizationPlan(entry) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = { ...entry, owner_id: user.id };
    const { data, error } = await supabase
      .from("fertilization_plans")
      .upsert(payload)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteFertilizationPlan(id) {
    const { error } = await supabase
      .from("fertilization_plans")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getCompanyInventoryAlerts(companyId) {
    const [products, batches, movements] = await Promise.all([
      this.getProducts(companyId),
      this.getProductBatches(companyId),
      this.getInventoryMovements(companyId),
    ]);

    const movementTotals = movements.reduce((acc, movement) => {
      const direction = movement.movement_type === "unload" ? -1 : 1;
      acc[movement.inventory_batch_id] =
        (acc[movement.inventory_batch_id] || 0) +
        direction * Number(movement.quantity || 0);
      return acc;
    }, {});

    const expiry = batches
      .filter((batch) => batch.expiry_date)
      .filter((batch) => {
        const expiryDate = new Date(batch.expiry_date);
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + 30);
        return expiryDate <= threshold;
      })
      .map((batch) => ({
        type: "expiry",
        batchId: batch.id,
        productName: batch.product?.name || "-",
        batchNumber: batch.batch_number,
        expiryDate: batch.expiry_date,
      }));

    const minimumStock = products
      .filter((product) => product.minimum_stock != null)
      .map((product) => {
        const productBatches = batches.filter((batch) => batch.product_id === product.id);
        const currentStock = productBatches.reduce(
          (sum, batch) =>
            sum +
            Number(batch.initial_quantity || 0) +
            Number(movementTotals[batch.id] || 0),
          0,
        );

        return {
          type: "minimum_stock",
          productId: product.id,
          productName: product.name,
          currentStock,
          minimumStock: Number(product.minimum_stock || 0),
        };
      })
      .filter((entry) => entry.currentStock < entry.minimumStock);

    return { expiry, minimumStock };
  },
};
