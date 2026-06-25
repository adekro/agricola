import { describe, expect, it } from "vitest";
import {
  validateGmlParcel,
  parseGmlParcels,
  extractParcelGeometry,
} from "../src/lib/catastoGml";

describe("catasto-gml", () => {
  it("valida un parcel GML coerente con comune, foglio e mappale", () => {
    const parcel = {
      "CP:LABEL": "2.745",
      "CP:NATIONALCADASTRALREFERENCE": "STRADELLA-2.745",
      "CP:ADMINUNITNAME": "STRADELLA",
    };

    const result = validateGmlParcel(parcel, {
      comune: "Stradella",
      foglio: "02",
      mappale: "0745",
    });

    expect(result).toEqual({ valid: true });
  });

  it("scarta un parcel GML non coerente con il comune", () => {
    const parcel = {
      "CP:LABEL": "1.100",
      "CP:NATIONALCADASTRALREFERENCE": "MILANO-1.100",
      "CP:ADMINUNITNAME": "MILANO",
    };

    const result = validateGmlParcel(parcel, {
      comune: "STRADELLA",
      foglio: "2",
      mappale: "745",
    });

    expect(result).toEqual({
      valid: false,
      reason: "GML non coerente con il comune richiesto",
    });
  });

  it("scarta un parcel GML non coerente con foglio e mappale", () => {
    const parcel = {
      "CP:LABEL": "3.100",
      "CP:NATIONALCADASTRALREFERENCE": "STRADELLA-3.100",
      "CP:ADMINUNITNAME": "STRADELLA",
    };

    const result = validateGmlParcel(parcel, {
      comune: "STRADELLA",
      foglio: "2",
      mappale: "745",
    });

    expect(result).toEqual({
      valid: false,
      reason: "GML non coerente con foglio e mappale richiesti",
    });
  });

  it("parseGmlParcels restituisce un array vuoto per XML non valido", () => {
    const result = parseGmlParcels("<root>no feature collection</root>");
    expect(result).toEqual([]);
  });

  it("extractParcelGeometry restituisce null per geometria mancante", () => {
    const result = extractParcelGeometry({});
    expect(result).toBeNull();
  });
});
