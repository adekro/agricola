import { render, screen } from "@testing-library/react";
import Side from "./Side";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// Mock the SideItem component
vi.mock("./SideItem", () => ({
  default: ({ label }) => <div>{label}</div>,
}));

describe("Side Component", () => {
  const mockOnSelect = vi.fn();
  const farmlands = [
    { id: 1, area: 100, perimeter: 40 },
    { id: 2, area: 200, perimeter: 60 },
  ];

  it("renders correctly with provided farmlands statistics", () => {
    render(<Side onSelect={mockOnSelect} active="dashboard" farmlands={farmlands} />);

    expect(screen.getByText("NUMERO DI CAMPI")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();

    expect(screen.getByText("AREA TOTALE")).toBeDefined();
    expect(screen.getByText("300m²")).toBeDefined();

    expect(screen.getByText("PERIMETRO")).toBeDefined();
    expect(screen.getByText("100m")).toBeDefined();
  });

  it("renders zero values when no farmlands are provided", () => {
    render(<Side onSelect={mockOnSelect} active="dashboard" farmlands={[]} />);

    expect(screen.getByText("0")).toBeDefined();
    expect(screen.getByText("0m²")).toBeDefined();
    expect(screen.getByText("0m")).toBeDefined();
  });
});
