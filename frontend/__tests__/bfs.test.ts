import { runBfs, getBfsTreeEdges } from "@/lib/graph/bfs";
import { buildGraph } from "./helpers";

// ─── fixtures ────────────────────────────────────────────────────────────────
// Linear: A → B → C → D
const linearGraph = () =>
  buildGraph(["A", "B", "C", "D"], [
    ["A", "B", 1],
    ["B", "C", 1],
    ["C", "D", 1],
  ]);

// Branching: A → B → D, A → C → E
const branchingGraph = () =>
  buildGraph(["A", "B", "C", "D", "E"], [
    ["A", "B", 1],
    ["A", "C", 1],
    ["B", "D", 1],
    ["C", "E", 1],
  ]);

// ─── level correctness ───────────────────────────────────────────────────────
describe("BFS — linear graph", () => {
  test("levels: A=0, B=1, C=2, D=3", () => {
    const { levels } = runBfs(linearGraph(), "A");
    expect(levels.get("A")).toBe(0);
    expect(levels.get("B")).toBe(1);
    expect(levels.get("C")).toBe(2);
    expect(levels.get("D")).toBe(3);
  });

  test("all nodes reachable", () => {
    const { levels } = runBfs(linearGraph(), "A");
    expect([...levels.keys()].sort()).toEqual(["A", "B", "C", "D"]);
  });

  test("maxLevel = 3", () => {
    const { maxLevel } = runBfs(linearGraph(), "A");
    expect(maxLevel).toBe(3);
  });
});

describe("BFS — branching graph", () => {
  test("B and C are at level 1, D and E at level 2", () => {
    const { levels } = runBfs(branchingGraph(), "A");
    expect(levels.get("A")).toBe(0);
    expect(levels.get("B")).toBe(1);
    expect(levels.get("C")).toBe(1);
    expect(levels.get("D")).toBe(2);
    expect(levels.get("E")).toBe(2);
  });

  test("BFS order: parent before children", () => {
    const { prev } = runBfs(branchingGraph(), "A");
    // D's parent is B → B was visited before D (implicit from levels)
    expect(prev.get("D")).toBe("B");
    expect(prev.get("E")).toBe("C");
  });
});

// ─── single node ─────────────────────────────────────────────────────────────
describe("BFS — isolated node", () => {
  test("only origin visited, level 0, maxLevel 0", () => {
    const g = buildGraph(["X"], []);
    const { levels, maxLevel } = runBfs(g, "X");
    expect(levels.get("X")).toBe(0);
    expect(levels.size).toBe(1);
    expect(maxLevel).toBe(0);
  });
});

// ─── disconnected nodes ───────────────────────────────────────────────────────
describe("BFS — disconnected graph", () => {
  test("unreachable nodes are not in levels map", () => {
    // A → B, C is isolated
    const g = buildGraph(["A", "B", "C"], [["A", "B", 1]]);
    const { levels } = runBfs(g, "A");
    expect(levels.has("A")).toBe(true);
    expect(levels.has("B")).toBe(true);
    expect(levels.has("C")).toBe(false);
  });
});

// ─── prev / tree edges ────────────────────────────────────────────────────────
describe("BFS — prev map and tree edges", () => {
  test("origin has null parent", () => {
    const { prev } = runBfs(linearGraph(), "A");
    expect(prev.get("A")).toBeNull();
  });

  test("getBfsTreeEdges returns correct edge keys", () => {
    const { prev } = runBfs(linearGraph(), "A");
    const treeEdges = getBfsTreeEdges(prev);
    expect(treeEdges.has("A-B")).toBe(true);
    expect(treeEdges.has("B-C")).toBe(true);
    expect(treeEdges.has("C-D")).toBe(true);
  });
});
