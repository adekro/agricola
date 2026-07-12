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
  it("interpreta le sei colonne XLS e i decimali italiani", () => {
    const text = [
      "COMUNE\tPROV\tFOGLIO\tMAPPALE\tTIPO UTILIZZO\tSUPERFICIE",
      " Stradella \tPV\t002\t000745\t870-011-000-000 ORZO - FAVE\t9,1337",
    ].join("\n");

    expect(parseExcelRows(text)).toEqual([
      {
        lineNumber: 2,
        comune: "STRADELLA",
        provincia: "PV",
        foglio: "2",
        mappale: "745",
        utilizzo: "870-011-000-000 ORZO - FAVE",
        ageaCode: "870-011-000-000",
        crop: "ORZO - FAVE",
        superficie: 9.1337,
        valid: true,
        duplicate: false,
        rowKey: "STRADELLA|PV|2|745|870-011-000-000",
      },
    ]);
  });

  it("segnala righe duplicate senza scartarle silenziosamente", () => {
    const row = "Stradella\tPV\t1\t5\t921-007-000-000 CIPOLLA\t0,5";
    const result = parseExcelRows(`${row}\n${row}`);
    expect(result[0].valid).toBe(true);
    expect(result[1]).toMatchObject({ valid: false, duplicate: true });
  });
});

describe("getPoligonoMappale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn(),
    });
  });

  it("usa la geometria live dell'API quando disponibile", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        comune: "STRADELLA",
        mappale: "53",
        label: "53",
        validated: true,
        source: "wfs",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [9.29, 45.08],
            [9.3, 45.08],
            [9.3, 45.09],
            [9.29, 45.08],
          ]],
        },
      }),
    });

    await expect(
      getPoligonoMappale({
        comune: "stradella",
        foglio: "03",
        mappale: "0053",
      }),
    ).resolves.toEqual({
      adminCode: null,
      comune: "STRADELLA",
      foglio: "3",
      mappale: "53",
      label: "53",
      nationalReference: null,
      bbox4326: [9.29, 45.08, 9.3, 45.09],
      polygon4326: [
        [9.29, 45.08],
        [9.3, 45.08],
        [9.3, 45.09],
        [9.29, 45.08],
      ],
      source: "wfs",
      validated: true,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/catasto-poligono?comune=STRADELLA&foglio=3&mappale=53",
    );
    expect(supabase.from).not.toHaveBeenCalled();
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

    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        comune: "STRADELLA",
        mappale: "53",
        validated: true,
        source: "wfs",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [9.29, 45.08],
            [9.3, 45.08],
            [9.3, 45.09],
          ]],
        },
      }),
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
      bbox4326: [9.2903385, 45.0785122, 9.3003385, 45.0885122],
      polygon4326: [
        [9.2903385, 45.0785122],
        [9.3003385, 45.0785122],
        [9.3003385, 45.0885122],
        [9.2903385, 45.0785122],
      ],
      source: "supabase",
      validated: true,
    });

    expect(global.fetch).toHaveBeenCalled();
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

    global.fetch.mockResolvedValue({
      ok: false,
      json: vi.fn(),
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

    global.fetch.mockResolvedValue({
      ok: false,
      json: vi.fn(),
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
