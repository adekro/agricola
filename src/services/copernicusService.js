const copernicusBaseUrl = import.meta.env.VITE_COPERNICUS_BASE_URL;

const ODATA_PRODUCTS_PATH = "/odata/v1/Products";

const escapeODataString = (value = "") => String(value).replace(/'/g, "''");

const toIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const normalizePolygon = (coordinates = []) => {
  if (!Array.isArray(coordinates) || coordinates.length < 4) return null;

  const ring = coordinates
    .filter((point) => Array.isArray(point) && point.length >= 2)
    .map(([lon, lat]) => [Number(lon), Number(lat)])
    .filter(
      ([lon, lat]) =>
        Number.isFinite(lon) &&
        Number.isFinite(lat) &&
        lon >= -180 &&
        lon <= 180 &&
        lat >= -90 &&
        lat <= 90,
    );

  if (ring.length < 4) return null;

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }

  return ring;
};

const polygonToODataGeography = (polygon) => {
  if (!polygon) return null;
  const pointList = polygon.map(([lon, lat]) => `${lon} ${lat}`).join(",");
  return `geography'SRID=4326;POLYGON((${pointList}))'`;
};

const clampInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const buildFilter = (params = {}) => {
  const {
    collection = "SENTINEL-2",
    dateFrom,
    dateTo,
    maxCloudCoverage,
    polygon,
    productType,
    nameStartsWith,
  } = params;

  const filters = [];

  if (collection) {
    filters.push(`Collection/Name eq '${escapeODataString(collection)}'`);
  }

  const fromIso = toIso(dateFrom);
  const toIsoDate = toIso(dateTo);
  if (fromIso) {
    filters.push(`ContentDate/Start gt ${fromIso}`);
  }
  if (toIsoDate) {
    filters.push(`ContentDate/Start lt ${toIsoDate}`);
  }

  if (Number.isFinite(Number(maxCloudCoverage))) {
    filters.push(
      `Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' and att/OData.CSC.DoubleAttribute/Value le ${Number(maxCloudCoverage).toFixed(2)})`,
    );
  }

  if (productType) {
    filters.push(
      `Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq '${escapeODataString(productType)}')`,
    );
  }

  if (nameStartsWith) {
    filters.push(`startswith(Name,'${escapeODataString(nameStartsWith)}')`);
  }

  const normalizedPolygon = normalizePolygon(polygon);
  if (normalizedPolygon) {
    const geography = polygonToODataGeography(normalizedPolygon);
    filters.push(`OData.CSC.Intersects(area=${geography})`);
  }

  return filters.join(" and ");
};

/**
 * Service to interact with Copernicus Data Space Ecosystem APIs.
 */
export const copernicusService = {
  /**
   * Search for available products in the catalog.
   * @param {Object} params - Search parameters (bbox, dateFrom, dateTo, etc.)
   */
  async searchCatalog(params) {
    if (!copernicusBaseUrl) return null;

    try {
      const query = new URLSearchParams();
      const filter = buildFilter(params);

      if (filter) {
        query.set("$filter", filter);
      }

      query.set("$orderby", params?.orderBy || "ContentDate/Start desc");
      query.set("$top", String(clampInt(params?.top, 20, 1, 1000)));
      query.set("$skip", String(clampInt(params?.skip, 0, 0, 10000)));

      if (params?.count) {
        query.set("$count", "true");
      }

      if (params?.expand?.length) {
        query.set("$expand", params.expand.join(","));
      }

      if (params?.select?.length) {
        query.set("$select", params.select.join(","));
      }

      const response = await fetch(
        `${copernicusBaseUrl}${ODATA_PRODUCTS_PATH}?${query.toString()}`,
      );
      if (!response.ok) throw new Error("Catalog search failed");

      const payload = await response.json();
      return {
        items: payload.value || [],
        count: payload["@odata.count"] || null,
        nextLink: payload["@odata.nextLink"] || null,
      };
    } catch (error) {
      console.error("Copernicus Catalog Error:", error);
      return null;
    }
  },
};
