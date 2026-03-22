import { fireEvent, render } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "@/components/toast";

function ToastHarness() {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast("Hello", "info")}>
      Toast
    </button>
  );
}

describe("ToastProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-dismisses toasts after the timeout", () => {
    vi.useFakeTimers();
    const { getByText, queryByText } = render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(getByText("Toast"));
    expect(getByText("Hello")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(queryByText("Hello")).toBeNull();
  });
});
