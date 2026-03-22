import { fireEvent, render, waitFor } from "@testing-library/preact";
import { beforeEach, describe, expect, it } from "vitest";
import { useTheme } from "@/hooks/use-theme";

function ThemeHarness() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={() => setTheme("dark")}>
        Dark
      </button>
    </div>
  );
}

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("persists theme selection as JSON and applies class", async () => {
    const { getByText } = render(<ThemeHarness />);
    fireEvent.click(getByText("Dark"));

    await waitFor(() => {
      expect(localStorage.getItem("app-theme")).toBe("\"dark\"");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("normalizes legacy raw theme values", async () => {
    localStorage.setItem("app-theme", "dark");
    render(<ThemeHarness />);

    await waitFor(() => {
      expect(localStorage.getItem("app-theme")).toBe("\"dark\"");
    });
  });
});
