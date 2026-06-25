import { describe, expect, it } from "vitest";
import { parseExcelRows } from "./catastoService";

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
