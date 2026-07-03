import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HarvestsPage from "./HarvestsPage";
import { notebookService } from "../../services/notebookService";

vi.mock("../../services/notebookService", () => ({
  notebookService: {
    getFarmlands: vi.fn(),
    getCompanies: vi.fn(),
    getHarvests: vi.fn(),
    getHarvest: vi.fn(),
    saveHarvest: vi.fn(),
    deleteHarvest: vi.fn(),
    getHarvestBatches: vi.fn(),
    saveHarvestBatch: vi.fn(),
    deleteHarvestBatch: vi.fn(),
    getHarvestDestinations: vi.fn(),
    saveHarvestDestination: vi.fn(),
    deleteHarvestDestination: vi.fn(),
    getCompanyContacts: vi.fn(),
  },
}));

describe("HarvestsPage", () => {
  beforeEach(() => {
    notebookService.getFarmlands.mockResolvedValue([
      {
        id: "farm-1",
        type: "Campo Nord",
        ownerDisplayName: "Azienda Test",
        currentCrop: "Mais",
      },
    ]);
    notebookService.getCompanies.mockResolvedValue([
      { id: "company-1", name: "Azienda Test" },
    ]);
    notebookService.getHarvests.mockResolvedValue([]);
    notebookService.getCompanyContacts.mockResolvedValue([
      { id: "contact-1", name: "Cliente Uno", category: "client" },
    ]);
    notebookService.saveHarvest.mockResolvedValue({ id: "harvest-1" });
    notebookService.getHarvestBatches.mockResolvedValue([]);
    notebookService.saveHarvestBatch.mockResolvedValue({ id: "batch-1" });
    notebookService.saveHarvestDestination.mockResolvedValue({ id: "dest-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("precompila coltura e salva raccolta con lotto e destinazione", async () => {
    render(
      <MemoryRouter>
        <HarvestsPage />
      </MemoryRouter>,
    );

    const user = userEvent.setup ? userEvent.setup() : userEvent;

    await user.click(await screen.findByRole("button", { name: "Nuova raccolta" }));
    await user.selectOptions(screen.getByLabelText("Appezzamento"), "farm-1");

    expect(screen.getByDisplayValue("Mais")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Quantita"), "10");
    await user.type(screen.getByLabelText("Qualita"), "Prima scelta");
    await user.selectOptions(screen.getByLabelText("Cliente finale"), "contact-1");
    await user.type(screen.getByLabelText("Quantita destinata"), "8");
    await user.click(screen.getByRole("button", { name: "Salva" }));

    expect(notebookService.saveHarvest).toHaveBeenCalled();
    expect(notebookService.saveHarvestBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        harvest_id: "harvest-1",
        quantity: 10,
        quality: "Prima scelta",
      }),
    );
    expect(notebookService.saveHarvestDestination).toHaveBeenCalledWith(
      expect.objectContaining({
        harvest_batch_id: "batch-1",
        contact_id: "contact-1",
        quantity: 8,
      }),
    );
  });
});
