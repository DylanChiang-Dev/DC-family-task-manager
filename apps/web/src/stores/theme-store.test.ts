import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "./theme-store";

describe("theme-store", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    useThemeStore.setState({ theme: "light" });
  });

  it("applies dark class when theme changes", () => {
    useThemeStore.getState().setTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    useThemeStore.getState().setTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
