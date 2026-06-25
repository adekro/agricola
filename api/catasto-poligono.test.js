import { describe, expect, it } from "vitest";
import { validateWfsParcel } from "./catasto-poligono";

describe("validateWfsParcel", () => {
  it("scarta i risultati demo come ACQUA001", () => {
    const result = validateWfsParcel(
      {
        "CP:LABEL": "ACQUA001",
        "CP:NATIONALCADASTRALREFERENCE": "DEMO-ACQUA001",
        "CP:ADMINUNITNAME": "LAGO DI COMO",
      },
      {
        comune: "STRADELLA",
        foglio: "2",
        mappale: "745",
      },
    );

    expect(result).toEqual({
      valid: false,
      reason: "Risposta WFS dimostrativa",
    });
  });

  it("accetta un match coerente con comune, foglio e mappale", () => {
    const result = validateWfsParcel(
      {
        "CP:LABEL": "2.745",
        "CP:NATIONALCADASTRALREFERENCE": "STRADELLA-2.745",
        "CP:ADMINUNITNAME": "STRADELLA",
      },
      {
        comune: "Stradella",
        foglio: "02",
        mappale: "0745",
      },
    );

    expect(result).toEqual({
      valid: true,
    });
  });
});
