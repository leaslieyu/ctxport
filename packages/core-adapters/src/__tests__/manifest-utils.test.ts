import { describe, it, expect } from "vitest";
import { getByPath, resolveTemplate } from "../manifest/utils";

describe("getByPath", () => {
  it("从扁平对象中取值", () => {
    expect(getByPath({ name: "hello" }, "name")).toBe("hello");
  });

  it("从嵌套对象中取值", () => {
    const obj = { a: { b: { c: "deep" } } };
    expect(getByPath(obj, "a.b.c")).toBe("deep");
  });

  it("路径不存在时返回 undefined", () => {
    expect(getByPath({ a: 1 }, "b")).toBe(undefined);
    expect(getByPath({ a: 1 }, "a.b.c")).toBe(undefined);
  });

  it("obj 为 null/undefined 时返回 undefined", () => {
    expect(getByPath(null, "a")).toBe(undefined);
    expect(getByPath(undefined, "a")).toBe(undefined);
  });

  it("中间路径为 null 时返回 undefined", () => {
    const obj = { a: { b: null } };
    expect(getByPath(obj, "a.b.c")).toBe(undefined);
  });

  it("可以取到数字和布尔值", () => {
    const obj = { count: 42, active: true };
    expect(getByPath(obj, "count")).toBe(42);
    expect(getByPath(obj, "active")).toBe(true);
  });

  it("可以取到数组", () => {
    const obj = { items: [1, 2, 3] };
    expect(getByPath(obj, "items")).toEqual([1, 2, 3]);
  });

  it("空路径返回空字符串键的值或 undefined", () => {
    expect(getByPath({ "": "empty-key" }, "")).toBe("empty-key");
    expect(getByPath({ a: 1 }, "")).toBe(undefined);
  });

  it("中间路径为 undefined 时返回 undefined", () => {
    const obj = { a: { b: undefined } };
    expect(getByPath(obj, "a.b.c")).toBe(undefined);
  });

  it("obj 为非对象原始值时返回 undefined", () => {
    expect(getByPath(42, "a")).toBe(undefined);
    expect(getByPath("string", "a")).toBe(undefined);
    expect(getByPath(true, "a")).toBe(undefined);
  });

  it("路径中包含不存在的中间节点时返回 undefined", () => {
    const obj = { a: { b: { c: 1 } } };
    expect(getByPath(obj, "a.x.c")).toBe(undefined);
  });

  it("可以取到 falsy 值（0, false, 空字符串）", () => {
    const obj = { zero: 0, empty: "", no: false };
    expect(getByPath(obj, "zero")).toBe(0);
    expect(getByPath(obj, "empty")).toBe("");
    expect(getByPath(obj, "no")).toBe(false);
  });
});

describe("resolveTemplate", () => {
  it("替换单个变量", () => {
    const result = resolveTemplate(
      "https://api.example.com/{id}",
      { id: "123" },
    );
    expect(result).toBe("https://api.example.com/123");
  });

  it("替换多个变量", () => {
    const result = resolveTemplate(
      "https://api.example.com/{org}/conversations/{id}",
      { org: "my-org", id: "conv-456" },
    );
    expect(result).toBe(
      "https://api.example.com/my-org/conversations/conv-456",
    );
  });

  it("对值进行 encodeURIComponent", () => {
    const result = resolveTemplate(
      "https://api.example.com/{name}",
      { name: "hello world" },
    );
    expect(result).toBe("https://api.example.com/hello%20world");
  });

  it("替换同一变量的多次出现", () => {
    const result = resolveTemplate(
      "{id}/details/{id}",
      { id: "abc" },
    );
    expect(result).toBe("abc/details/abc");
  });

  it("无匹配变量时原样返回", () => {
    const result = resolveTemplate(
      "https://api.example.com/static",
      { id: "123" },
    );
    expect(result).toBe("https://api.example.com/static");
  });

  it("空模板返回空字符串", () => {
    expect(resolveTemplate("", { id: "123" })).toBe("");
  });

  it("空变量对象时原样返回模板", () => {
    const result = resolveTemplate("https://api.example.com/{id}", {});
    expect(result).toBe("https://api.example.com/{id}");
  });

  it("特殊字符的值被正确编码", () => {
    const result = resolveTemplate(
      "https://api.example.com/{query}",
      { query: "a=1&b=2" },
    );
    expect(result).toBe("https://api.example.com/a%3D1%26b%3D2");
  });

  it("值包含 Unicode 字符时被正确编码", () => {
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
