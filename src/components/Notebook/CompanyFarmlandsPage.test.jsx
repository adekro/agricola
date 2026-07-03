import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CompanyWorkspace from "./CompanyWorkspace";
import CompanyFarmlandsPage from "./CompanyFarmlandsPage";
import { notebookService } from "../../services/notebookService";

const mockLayoutContext = vi.fn(() => ({}));

vi.mock("../../services/notebookService", () => ({
  notebookService: {
    getCompany: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useOutletContext: () => mockLayoutContext(),
  };
});

describe("CompanyFarmlandsPage", () => {
  beforeEach(() => {
    notebookService.getCompany.mockResolvedValue({
      id: "company-1",
      name: "Azienda Test",
      owner_name: "Mario Rossi",
      address: "Via Roma",
      vat_number: "IT123",
      phone: "123456",
      email: "mario@example.com",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filtra i terreni per azienda e apre la scheda appezzamento", async () => {
    const openFarmland = vi.fn();
    mockLayoutContext.mockReturnValue({
      farmlands: [
        {
          id: "farm-1",
          type: "Campo Nord",
          ownerDisplayName: "Azienda Test",
          area: 12,
          perimeter: 100,
          cadastralParcel: "7/53",
          currentCrop: "Mais",
        },
        {
          id: "farm-2",
          type: "Campo Sud",
          ownerDisplayName: "Altra Azienda",
          area: 8,
          perimeter: 80,
          cadastralParcel: "8/12",
          currentCrop: "Soia",
        },
      ],
      onClick: openFarmland,
    });

    render(
      <MemoryRouter initialEntries={["/notebook/company/company-1/farmlands"]}>
        <Routes>
          <Route path="/notebook/company/:companyId" element={<CompanyWorkspace />}>
            <Route path="farmlands" element={<CompanyFarmlandsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Campo Nord")).toBeInTheDocument();
    expect(screen.queryByText("Campo Sud")).not.toBeInTheDocument();

    const user = userEvent.setup ? userEvent.setup() : userEvent;
    await user.click(screen.getByRole("button", { name: "Apri scheda" }));

    expect(openFarmland).toHaveBeenCalledWith("farm-1");
  });
});
