import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../lib/supabaseClient";
import { getPoligonoMappale, parseExcelRows } from "./catastoService";

function createQueryMock(result) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    then: undefined,
  };

  query.eq.mockImplementation((column, value) => {
    if (column === "mappale") {
      return Promise.resolve(result);
    }
    return query;
  });

  return query;
}

describe("parseExcelRows", () => {
  it("ignora l'header e normalizza comune, foglio e mappale", () => {
    const text = [
      "Comune\tFoglio\tMappale",
      "  Stradella \t002\t000745 ",
      " Broni \t 03 \t 0010",
    ].join("\n");

    expect(parseExcelRows(text)).toEqual([
      {
        comune: "STRADELLA",
        foglio: "2",
        mappale: "745",
      },
      {
        comune: "BRONI",
        foglio: "3",
        mappale: "10",
      },
    ]);
  });

  it("supporta anche separatori punto e virgola", () => {
    const text = "Stradella;0001;0005";

    expect(parseExcelRows(text)).toEqual([
      {
        comune: "STRADELLA",
        foglio: "1",
        mappale: "5",
      },
    ]);
  });
});

describe("getPoligonoMappale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("legge il mappale da Supabase e normalizza il payload per la mappa", async () => {
    const query = createQueryMock({
      data: [
        {
          admin_code: "I968",
          comune: "STRADELLA",
          foglio: "300",
          mappale: "53",
          label: "53",
          national_reference: "I968_000300.53",
          bbox_4326: [9.29, 45.08, 9.3, 45.09],
          polygon_4326: [
            [9.29, 45.08],
            [9.3, 45.08],
            [9.3, 45.09],
            [9.29, 45.08],
          ],
        },
      ],
      error: null,
    });

    supabase.from.mockReturnValue(query);

    await expect(
      getPoligonoMappale({
        comune: "stradella",
        foglio: "03",
        mappale: "0053",
      }),
    ).resolves.toEqual({
      adminCode: "I968",
      comune: "STRADELLA",
      foglio: "3",
      mappale: "53",
      label: "53",
      nationalReference: "I968_000300.53",
      bbox4326: [9.29, 45.08, 9.3, 45.09],
      polygon4326: [
        [9.29, 45.08],
        [9.3, 45.08],
        [9.3, 45.09],
        [9.29, 45.08],
      ],
      source: "supabase",
      validated: true,
    });

    expect(supabase.from).toHaveBeenCalledWith("cadastral_parcels");
    expect(query.eq).toHaveBeenNthCalledWith(1, "comune", "STRADELLA");
    expect(query.in).toHaveBeenCalledWith("foglio", [
      "3",
      "300",
      "000003",
    ]);
    expect(query.eq).toHaveBeenNthCalledWith(2, "mappale", "53");
  });

  it("accetta il lookup per admin code quando disponibile", async () => {
    const query = createQueryMock({
      data: [
        {
          admin_code: "I968",
          comune: "STRADELLA",
          foglio: "300",
          mappale: "53",
          label: "53",
          national_reference: "I968_000300.53",
          bbox_4326: [9.29, 45.08, 9.3, 45.09],
          polygon_4326: [
            [9.29, 45.08],
            [9.3, 45.08],
            [9.3, 45.09],
            [9.29, 45.08],
          ],
        },
      ],
      error: null,
    });

    supabase.from.mockReturnValue(query);

    await getPoligonoMappale({
      adminCode: "i968",
      comune: "stradella",
      foglio: "3",
      mappale: "53",
    });

    expect(query.eq).toHaveBeenNthCalledWith(1, "admin_code", "I968");
  });

  it("fallisce se Supabase non restituisce una geometria valida", async () => {
    const query = createQueryMock({
      data: [{ bbox_4326: [9.29, 45.08, 9.3, 45.09], polygon_4326: null }],
      error: null,
    });

    supabase.from.mockReturnValue(query);

    await expect(
      getPoligonoMappale({
        comune: "STRADELLA",
        foglio: "3",
        mappale: "53",
      }),
    ).rejects.toThrow("Nessuna geometria disponibile per questa particella");
  });
});
