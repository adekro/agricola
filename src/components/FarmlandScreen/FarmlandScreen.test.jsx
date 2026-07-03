import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FarmlandScreen from "./FarmlandScreen";
import { notebookService } from "../../services/notebookService";
import { ageaCropService } from "../../services/ageaCropService";

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
    getSoilAnalysisHistory: vi.fn(async () => []),
    saveSoilAnalysis: vi.fn(),
    deleteSoilAnalysis: vi.fn(),
  },
}));

vi.mock("../../services/ageaCropService", () => ({
  ageaCropService: {
    searchCrops: vi.fn(async () => []),
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
    mockUseParams.mockReturnValue({ id: "new" });
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

  it("searches AGEA crops and saves extended crop history fields", async () => {
    mockUseParams.mockReturnValue({ id: "farm-1" });
    ageaCropService.searchCrops.mockResolvedValue([
      {
        code: "921-007-000-000",
        label: "CIPOLLA ANCHE DI TIPO LUNGO (echalion) - DA ORTO",
      },
    ]);
    notebookService.getCropHistory.mockResolvedValue([]);

    render(
      <FarmlandScreen
        farmlandId="farm-1"
        farmland={{
          id: "farm-1",
          type: "Campo 1",
          area: 12,
          perimeter: 100,
          notes: "",
          ownerDisplayName: "Azienda Test",
          coordinates: [],
          cadastralParcel: "",
          currentCrop: "",
        }}
        onClose={onClose}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Aggiungi Storico" }));

    const ageaInput = screen.getByLabelText("Coltura AGEA");
    await userEvent.type(ageaInput, "cipolla");

    await waitFor(() => {
      expect(ageaCropService.searchCrops).toHaveBeenCalledWith("cipolla");
    });

    await userEvent.click(
      await screen.findByText(
        "921-007-000-000 - CIPOLLA ANCHE DI TIPO LUNGO (echalion) - DA ORTO",
      ),
    );

    await userEvent.type(screen.getByLabelText("Superficie"), "2.5");
    await userEvent.clear(screen.getByLabelText("Anno"));
    await userEvent.type(screen.getByLabelText("Anno"), "2026");
    await userEvent.type(screen.getByLabelText("Foglio"), "7");
    await userEvent.type(screen.getByLabelText("Mappale"), "53");

    await userEvent.click(screen.getByRole("button", { name: "Aggiungi" }));

    await waitFor(() => {
      expect(notebookService.saveCropHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          farmland_id: "farm-1",
          crop: "921-007-000-000 - CIPOLLA ANCHE DI TIPO LUNGO (echalion) - DA ORTO",
          agea_code: "921-007-000-000",
          agea_label: "CIPOLLA ANCHE DI TIPO LUNGO (echalion) - DA ORTO",
          area: 2.5,
          month: expect.any(Number),
          year: 2026,
          foglio: "7",
          mappale: "53",
        }),
      );
    });
  });

  it("saves soil analysis history fields", async () => {
    mockUseParams.mockReturnValue({ id: "farm-1" });
    notebookService.getCropHistory.mockResolvedValue([]);
    notebookService.getSoilAnalysisHistory.mockResolvedValue([]);

    render(
      <FarmlandScreen
        farmlandId="farm-1"
        farmland={{
          id: "farm-1",
          type: "Campo 1",
          area: 12,
          perimeter: 100,
          notes: "",
          ownerDisplayName: "Azienda Test",
          coordinates: [],
          cadastralParcel: "",
          currentCrop: "",
        }}
        onClose={onClose}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Aggiungi analisi terreno" }));
    await userEvent.type(screen.getByLabelText("Tessitura"), "Franco limoso");
    await userEvent.type(screen.getByLabelText("pH"), "6.7");
    await userEvent.type(screen.getByLabelText("Sostanza organica (%)"), "2.4");
    await userEvent.type(screen.getByLabelText("Azoto (N)"), "58");
    await userEvent.type(screen.getByLabelText("Fosforo (P)"), "22");
    await userEvent.type(screen.getByLabelText("Potassio (K)"), "145");

    await userEvent.click(screen.getByRole("button", { name: "Salva analisi" }));

    await waitFor(() => {
      expect(notebookService.saveSoilAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          farmland_id: "farm-1",
          texture: "Franco limoso",
          ph: 6.7,
          organic_matter: 2.4,
          nitrogen: 58,
          phosphorus: 22,
          potassium: 145,
        }),
      );
    });
  });
});
