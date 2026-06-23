import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FarmlandScreen from "./FarmlandScreen";

const mockUseFarmlands = vi.fn();
const mockUseParams = vi.fn(() => ({ id: "new" }));
const mockUseOutletContext = vi.fn(() => ({}));

vi.mock("../../hooks/useFarmlands", () => ({
  default: () => mockUseFarmlands(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useOutletContext: () => mockUseOutletContext(),
  };
});

vi.mock("../UI/FullScreenDialog/FullScreenDialog", () => ({
  default: ({ children, buttonComponent, title }) => (
    <div>
      <h1>{title}</h1>
      {buttonComponent}
      {children}
    </div>
  ),
}));

vi.mock("../WorldMap/DrawableMap/DrawableMap", () => ({
  default: () => <div>DrawableMap</div>,
}));

vi.mock("../WorldMap/WorldMap", () => ({
  default: () => <div>WorldMap</div>,
}));

vi.mock("./SatelliteIndices/SatelliteIndices", () => ({
  default: () => <div>SatelliteIndices</div>,
}));

vi.mock("../UI/Modal/Modal", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../../config/mapProviders", () => ({
  getEnabledMapProviders: () => [],
}));

vi.mock("../../config/satelliteLayers", () => ({
  getEnabledSatelliteLayers: () => [],
}));

vi.mock("../../config/cadastralLayers", () => ({
  getEnabledCadastralLayers: () => [],
}));

vi.mock("../../services/satelliteService", () => ({
  satelliteService: {
    getSatelliteIndices: vi.fn(),
  },
}));

vi.mock("../../services/notebookService", () => ({
  notebookService: {
    getCropHistory: vi.fn(async () => []),
    saveCropHistory: vi.fn(),
  },
}));

vi.mock("../../hooks/useCadastralWmsError", () => ({
  useCadastralWmsError: vi.fn(),
}));

describe("FarmlandScreen company creation flow", () => {
  const onClose = vi.fn();
  const onCreate = vi.fn();
  const onUpdate = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFarmlands.mockReturnValue({
      companies: [
        { id: "c1", name: "Acme Farm" },
        { id: "c2", name: "Beta Farm" },
      ],
      createCompany: vi.fn(),
    });
  });

  const renderScreen = () =>
    render(
      <FarmlandScreen
        farmlandId="new"
        onClose={onClose}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    );

  it("shows companies from the hook", async () => {
    renderScreen();

    await userEvent.click(screen.getByLabelText("Company name"));

    expect(await screen.findByText("Acme Farm")).toBeInTheDocument();
    expect(screen.getByText("Beta Farm")).toBeInTheDocument();
  });

  it("does not open the dialog when the company already exists with different casing", async () => {
    renderScreen();

    const input = screen.getByLabelText("Company name");
    await userEvent.type(input, "acme farm");

    await waitFor(() => {
      expect(input).toHaveValue("Acme Farm");
    });

    expect(screen.queryByText("Nuova azienda")).not.toBeInTheDocument();
  });

  it("opens quick create and saves a new company", async () => {
    const createCompany = vi.fn(async ({ name }) => ({ id: "c3", name }));
    mockUseFarmlands.mockReturnValue({
      companies: [{ id: "c1", name: "Acme Farm" }],
      createCompany,
    });

    renderScreen();

    const input = screen.getByLabelText("Company name");
    await userEvent.type(input, "New Farm");
    await userEvent.click(await screen.findByText("Crea nuova azienda: New Farm"));

    expect(screen.getByText("Nuova azienda")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome azienda")).toHaveValue("New Farm");

    await userEvent.click(screen.getByRole("button", { name: "Salva azienda" }));

    await waitFor(() => {
      expect(createCompany).toHaveBeenCalledWith({ name: "New Farm" });
      expect(screen.queryByText("Nuova azienda")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Company name")).toHaveValue("New Farm");
    });
  });

  it("keeps the dialog open when company save fails", async () => {
    const createCompany = vi.fn(async () => {
      throw new Error("save failed");
    });
    mockUseFarmlands.mockReturnValue({
      companies: [{ id: "c1", name: "Acme Farm" }],
      createCompany,
    });

    renderScreen();

    const input = screen.getByLabelText("Company name");
    await userEvent.type(input, "Gamma Farm");
    await userEvent.click(await screen.findByText("Crea nuova azienda: Gamma Farm"));
    await userEvent.click(screen.getByRole("button", { name: "Salva azienda" }));

    expect(await screen.findByText("save failed")).toBeInTheDocument();
    expect(screen.getByText("Nuova azienda")).toBeInTheDocument();
  });
});
