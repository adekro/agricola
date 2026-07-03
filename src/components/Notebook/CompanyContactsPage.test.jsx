import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CompanyWorkspace from "./CompanyWorkspace";
import CompanyContactsPage from "./CompanyContactsPage";
import { notebookService } from "../../services/notebookService";

vi.mock("../../services/notebookService", () => ({
  notebookService: {
    getCompany: vi.fn(),
    getCompanyContacts: vi.fn(),
  },
}));

describe("CompanyContactsPage", () => {
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

    notebookService.getCompanyContacts.mockImplementation(async (_companyId, category) => {
      if (category === "owner") {
        return [
          {
            id: "legacy-owner-company-1",
            company_id: "company-1",
            category: "owner",
            name: "Mario Rossi",
            role_label: "Titolare",
            phone: "123456",
            email: "mario@example.com",
            notes: "Contatto derivato dal campo legacy owner_name.",
            is_primary: true,
            is_legacy: true,
          },
        ];
      }

      return [];
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("mostra il proprietario legacy nella sezione contatti", async () => {
    render(
      <MemoryRouter initialEntries={["/notebook/company/company-1/contacts"]}>
        <Routes>
          <Route path="/notebook/company/:companyId" element={<CompanyWorkspace />}>
            <Route path="contacts" element={<CompanyContactsPage sectionKey="contacts" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Mario Rossi")).toBeInTheDocument();
    expect(screen.getByText("Legacy")).toBeInTheDocument();
    expect(screen.getByText("Contatti principali")).toBeInTheDocument();
  });
});
