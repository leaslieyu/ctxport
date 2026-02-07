import { describe, it, expect } from "vitest";
import { getByPath, resolveTemplate } from "../manifest/utils";

describe("getByPath", () => {
  it("retrieves value from a flat object", () => {
    expect(getByPath({ name: "hello" }, "name")).toBe("hello");
  });

  it("retrieves value from a nested object", () => {
    const obj = { a: { b: { c: "deep" } } };
    expect(getByPath(obj, "a.b.c")).toBe("deep");
  });

  it("returns undefined when path does not exist", () => {
    expect(getByPath({ a: 1 }, "b")).toBe(undefined);
    expect(getByPath({ a: 1 }, "a.b.c")).toBe(undefined);
  });

  it("returns undefined when obj is null/undefined", () => {
    expect(getByPath(null, "a")).toBe(undefined);
    expect(getByPath(undefined, "a")).toBe(undefined);
  });

  it("returns undefined when intermediate path is null", () => {
    const obj = { a: { b: null } };
    expect(getByPath(obj, "a.b.c")).toBe(undefined);
  });

  it("retrieves number and boolean values", () => {
    const obj = { count: 42, active: true };
    expect(getByPath(obj, "count")).toBe(42);
    expect(getByPath(obj, "active")).toBe(true);
  });

  it("retrieves arrays", () => {
    const obj = { items: [1, 2, 3] };
    expect(getByPath(obj, "items")).toEqual([1, 2, 3]);
  });

  it("returns value for empty-string key or undefined", () => {
    expect(getByPath({ "": "empty-key" }, "")).toBe("empty-key");
    expect(getByPath({ a: 1 }, "")).toBe(undefined);
  });

  it("returns undefined when intermediate path is undefined", () => {
    const obj = { a: { b: undefined } };
    expect(getByPath(obj, "a.b.c")).toBe(undefined);
  });

  it("returns undefined when obj is a non-object primitive", () => {
    expect(getByPath(42, "a")).toBe(undefined);
    expect(getByPath("string", "a")).toBe(undefined);
    expect(getByPath(true, "a")).toBe(undefined);
  });

  it("returns undefined when intermediate node does not exist", () => {
    const obj = { a: { b: { c: 1 } } };
    expect(getByPath(obj, "a.x.c")).toBe(undefined);
  });

  it("retrieves falsy values (0, false, empty string)", () => {
    const obj = { zero: 0, empty: "", no: false };
    expect(getByPath(obj, "zero")).toBe(0);
    expect(getByPath(obj, "empty")).toBe("");
    expect(getByPath(obj, "no")).toBe(false);
  });
});

describe("resolveTemplate", () => {
  it("replaces a single variable", () => {
    const result = resolveTemplate(
      "https://api.example.com/{id}",
      { id: "123" },
    );
    expect(result).toBe("https://api.example.com/123");
  });

  it("replaces multiple variables", () => {
    const result = resolveTemplate(
      "https://api.example.com/{org}/conversations/{id}",
      { org: "my-org", id: "conv-456" },
    );
    expect(result).toBe(
      "https://api.example.com/my-org/conversations/conv-456",
    );
  });

  it("encodes values with encodeURIComponent", () => {
    const result = resolveTemplate(
      "https://api.example.com/{name}",
      { name: "hello world" },
    );
    expect(result).toBe("https://api.example.com/hello%20world");
  });

  it("replaces multiple occurrences of the same variable", () => {
    const result = resolveTemplate(
      "{id}/details/{id}",
      { id: "abc" },
    );
    expect(result).toBe("abc/details/abc");
  });

  it("returns template unchanged when no variables match", () => {
    const result = resolveTemplate(
      "https://api.example.com/static",
      { id: "123" },
    );
    expect(result).toBe("https://api.example.com/static");
  });

  it("returns empty string for empty template", () => {
    expect(resolveTemplate("", { id: "123" })).toBe("");
  });

  it("returns template unchanged when variables object is empty", () => {
    const result = resolveTemplate("https://api.example.com/{id}", {});
    expect(result).toBe("https://api.example.com/{id}");
  });

  it("correctly encodes special characters in values", () => {
    const result = resolveTemplate(
      "https://api.example.com/{query}",
      { query: "a=1&b=2" },
    );
    expect(result).toBe("https://api.example.com/a%3D1%26b%3D2");
  });

  it("correctly encodes Unicode characters in values", () => {
    const result = resolveTemplate(
      "https://api.example.com/{name}",
      { name: "你好世界" },
    );
    expect(result).toContain("api.example.com/");
    expect(decodeURIComponent(result)).toBe(
      "https://api.example.com/你好世界",
    );
  });
});
