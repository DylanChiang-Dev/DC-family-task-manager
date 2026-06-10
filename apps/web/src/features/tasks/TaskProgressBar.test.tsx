import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskProgressBar } from "./TaskProgressBar";

describe("TaskProgressBar", () => {
  it("shows current percent", () => {
    render(<TaskProgressBar value={40} onChange={() => {}} />);
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("emits new value on slider change", () => {
    const onChange = vi.fn();
    render(<TaskProgressBar value={40} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("進度"), { target: { value: "70" } });
    expect(onChange).toHaveBeenCalledWith(70);
  });
});
