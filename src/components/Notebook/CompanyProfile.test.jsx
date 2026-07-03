import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import CompanyProfile from "./CompanyProfile";
import { notebookService } from "../../services/notebookService";

vi.mock("../../services/notebookService", () => ({
  notebookService: {
    getCompanies: vi.fn(),
    saveCompany: vi.fn(),
    deleteCompany: vi.fn(),
  },
}));

describe("CompanyProfile", () => {
  beforeEach(() => {
    notebookService.getCompanies.mockResolvedValue([
      {
        id: "company-1",
        name: "Azienda Test",
        vat_number: "IT123",
        owner_name: "Mario Rossi",
        address: "Via Roma",
        phone: "123456",
        email: "test@example.com",
        authorized_operators: [],
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("apre la route contatti dalla lista aziende", async () => {
    const user = userEvent.setup ? userEvent.setup() : userEvent;

    render(
      <MemoryRouter initialEntries={["/notebook/company"]}>
        <Routes>
          <Route path="/notebook/company" element={<CompanyProfile />} />
          <Route path="/notebook/company/:companyId/contacts" element={<div>Dettaglio contatti</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByTitle("Contatti principali"));

    expect(screen.getByText("Dettaglio contatti")).toBeInTheDocument();
  });
});
