import { runDfs, getDfsTreeEdges } from "@/lib/graph/dfs";
import { buildGraph } from "./helpers";

// NOTE — behavioral difference vs Python:
//   Python DFS explicitly classifies back edges and returns has_cycle flag.
//   TS runDfs only records depth/prev; cycle detection is implicit (nodes not
//   re-visited). Tests here verify traversal correctness, not cycle reporting.

// Linear: A → B → C → D
const linearGraph = () =>
  buildGraph(["A", "B", "C", "D"], [
    ["A", "B", 1],
    ["B", "C", 1],
    ["C", "D", 1],
  ]);

// DAG: A → B → D, A → D (cross-edge shortcut)
const dagGraph = () =>
  buildGraph(["A", "B", "C", "D"], [
    ["A", "B", 1],
    ["B", "C", 1],
    ["A", "D", 1],
  ]);

// Graph with back-edge: A → B → C → A
const cyclicGraph = () =>
  buildGraph(["A", "B", "C"], [
    ["A", "B", 1],
    ["B", "C", 1],
    ["C", "A", 1],
  ]);

// ─── depth correctness ────────────────────────────────────────────────────────
describe("DFS — linear graph", () => {
  test("levels: A=0, B=1, C=2, D=3", () => {
    const { levels } = runDfs(linearGraph(), "A");
    expect(levels.get("A")).toBe(0);
    expect(levels.get("B")).toBe(1);
    expect(levels.get("C")).toBe(2);
    expect(levels.get("D")).toBe(3);
  });

  test("all nodes reachable", () => {
    const { levels } = runDfs(linearGraph(), "A");
    expect([...levels.keys()].sort()).toEqual(["A", "B", "C", "D"]);
  });

  test("maxLevel = 3", () => {
    const { maxLevel } = runDfs(linearGraph(), "A");
    expect(maxLevel).toBe(3);
  });
});

describe("DFS — DAG graph", () => {
  test("D reached via direct edge A→D (depth 1), not A→B→C→D", () => {
    const { levels } = runDfs(dagGraph(), "A");
    // DFS visits A→B→C first; D is reached via A→D but C is already done
    expect(levels.get("A")).toBe(0);
    expect(levels.get("B")).toBe(1);
    expect(levels.get("C")).toBe(2);
    // D is visited from A (second adjacency) at depth 1
    expect(levels.get("D")).toBe(1);
  });

  test("all nodes reachable", () => {
    const { levels } = runDfs(dagGraph(), "A");
    expect(levels.size).toBe(4);
  });
});

describe("DFS — cyclic graph", () => {
  test("each node visited exactly once (no infinite loop)", () => {
    const { levels } = runDfs(cyclicGraph(), "A");
    expect(levels.size).toBe(3);
    expect(levels.get("A")).toBe(0);
    expect(levels.get("B")).toBe(1);
    expect(levels.get("C")).toBe(2);
  });

  test("back-edge C→A is not followed (A already visited)", () => {
    // A's level stays 0, not overwritten
    const { levels } = runDfs(cyclicGraph(), "A");
    expect(levels.get("A")).toBe(0);
  });
});

// ─── isolated node ────────────────────────────────────────────────────────────
describe("DFS — isolated node", () => {
  test("only origin in levels, maxLevel=0", () => {
    const g = buildGraph(["X"], []);
    const { levels, maxLevel } = runDfs(g, "X");
    expect(levels.get("X")).toBe(0);
    expect(levels.size).toBe(1);
    expect(maxLevel).toBe(0);
  });
});

// ─── prev map and tree edges ──────────────────────────────────────────────────
describe("DFS — prev and tree edges", () => {
  test("origin has null parent", () => {
    const { prev } = runDfs(linearGraph(), "A");
    expect(prev.get("A")).toBeNull();
  });

  test("tree edges A-B, B-C, C-D present", () => {
    const { prev } = runDfs(linearGraph(), "A");
    const edges = getDfsTreeEdges(prev);
    expect(edges.has("A-B")).toBe(true);
    expect(edges.has("B-C")).toBe(true);
    expect(edges.has("C-D")).toBe(true);
  });
});
