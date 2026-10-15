import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { RichTextEditor } from "./rich-text-editor";

// Guards the Tiptap v3 upgrade: extension setup, list markup, and external value sync.
describe("RichTextEditor (Tiptap v3)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders without duplicate-extension warnings and keeps tight-list markup", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <RichTextEditor
        value="<p>Hello <u>world</u> <a href='https://example.com'>link</a></p><ul><li><p>one</p></li></ul>"
        onChange={() => {}}
      />,
    );

    await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
    const pm = container.querySelector(".ProseMirror")!;
    expect(pm.textContent).toContain("Hello world");
    expect(pm.querySelector("u")?.textContent).toBe("world");
    expect(pm.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    expect(pm.querySelector("ul")?.classList.contains("tight-list")).toBe(true);
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/duplicate extension/i);
  });

  it("syncs an external value change without firing onChange", async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <RichTextEditor value="<p>first</p>" onChange={onChange} />,
    );
    await waitFor(() => expect(container.querySelector(".ProseMirror")?.textContent).toBe("first"));

    rerender(<RichTextEditor value="<p>second</p>" onChange={onChange} />);
    await waitFor(() => expect(container.querySelector(".ProseMirror")?.textContent).toBe("second"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
