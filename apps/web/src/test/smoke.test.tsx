import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";

describe("test infra", () => {
  it("renders a component through providers", () => {
    renderWithProviders(<div>hello-test</div>);
    expect(screen.getByText("hello-test")).toBeInTheDocument();
  });
});
