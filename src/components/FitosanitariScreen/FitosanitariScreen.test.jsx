import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import FitosanitariScreen from "./FitosanitariScreen";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import * as indexedDB from "../../lib/indexedDB";

vi.mock("../../lib/indexedDB", () => ({
  getProducts: vi.fn(),
  getLastUpdated: vi.fn(),
  saveProducts: vi.fn(),
  openDB: vi.fn(),
}));

const mockProducts = [
  {
    denominazione_prodotto: "Product A",
    stato_amministrativo: "In commercio",
    sostanze_attive: "Substance X",
    ragione_sociale: "Company 1",
    num_registrazione: "123",
    data_registrazione: "2023-01-01",
  },
  {
    denominazione_prodotto: "Product B",
    stato_amministrativo: "Revocato",
    sostanze_attive: "Substance Y",
    ragione_sociale: "Company 2",
    num_registrazione: "456",
    data_registrazione: "2023-02-02",
  },
];

describe("FitosanitariScreen Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexedDB.getProducts.mockResolvedValue(mockProducts);
    indexedDB.getLastUpdated.mockResolvedValue({ value: "test.json" });
  });

  it("renders products from indexedDB", async () => {
    render(<FitosanitariScreen />);

    expect(await screen.findByText("Product A")).toBeDefined();
    expect(await screen.findByText("Product B")).toBeDefined();
    expect(screen.getByText("File: test.json")).toBeDefined();
  });

  it("filters products by text search", async () => {
    render(<FitosanitariScreen />);

    await screen.findByText("Product A");

    const searchInput = screen.getByPlaceholderText("Cerca prodotti...");
    fireEvent.change(searchInput, { target: { value: "Product A" } });

    expect(screen.queryByText("Product A")).not.toBeNull();
    expect(screen.queryByText("Product B")).toBeNull();
  });

  it("filters products by status", async () => {
    render(<FitosanitariScreen />);

    await screen.findByText("Product A");

    // Open the status select
    const statusSelect = screen.getByLabelText("Stato");
    fireEvent.mouseDown(statusSelect);

    // The options are rendered in a portal, so we look for them in the document
    const listbox = await screen.findByRole("listbox");
    const option = within(listbox).getByText("Revocato");
    fireEvent.click(option);

    await waitFor(() => {
        expect(screen.queryByText("Product A")).toBeNull();
        expect(screen.queryByText("Product B")).not.toBeNull();
    });
  });
});
