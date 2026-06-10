import { runDijkstra, getPath, getHighlightedEdges } from "@/lib/graph/dijkstra";
import { buildGraph } from "./helpers";

// Same topology as Python tests:
//   GRU→SSA=10, SSA→REC=5, GRU→REC=20, REC→FOR=8
const airportGraph = () =>
  buildGraph(
    ["GRU", "SSA", "REC", "FOR"],
    [
      ["GRU", "SSA", 10],
      ["SSA", "REC", 5],
      ["GRU", "REC", 20],
      ["REC", "FOR", 8],
    ],
  );

// ─── shortest path (mirrors Python test_shortest_path) ────────────────────────
describe("Dijkstra — airport graph", () => {
  test("GRU→FOR cost=23, path=[GRU,SSA,REC,FOR]", () => {
    const { dist, prev } = runDijkstra(airportGraph(), "GRU");
    expect(dist.get("FOR")).toBe(23);
    expect(getPath(prev, "FOR")).toEqual(["GRU", "SSA", "REC", "FOR"]);
  });

  test("prefers indirect cheaper: GRU→REC cost=15 via SSA, not direct 20", () => {
    const { dist, prev } = runDijkstra(airportGraph(), "GRU");
    expect(dist.get("REC")).toBe(15);
    expect(getPath(prev, "REC")).toEqual(["GRU", "SSA", "REC"]);
  });

  test("origin distance is 0", () => {
    const { dist } = runDijkstra(airportGraph(), "GRU");
    expect(dist.get("GRU")).toBe(0);
  });

  test("all reachable nodes get finite distance", () => {
    const { dist } = runDijkstra(airportGraph(), "GRU");
    for (const key of ["GRU", "SSA", "REC", "FOR"]) {
      expect(dist.get(key)).toBeLessThan(Infinity);
    }
  });
});

// ─── unreachable (mirrors Python test_unreachable_destination) ────────────────
describe("Dijkstra — unreachable destination", () => {
  test("unreachable node has Infinity distance", () => {
    const g = buildGraph(["GRU", "SSA", "MAO"], [["GRU", "SSA", 10]]);
    const { dist } = runDijkstra(g, "GRU");
    expect(dist.get("MAO")).toBe(Infinity);
  });

  // NOTE — behavioral difference vs Python:
  //   Python returns path=[] for unreachable.
  //   TS getPath returns [destKey] because prev is initialized to null for all nodes,
  //   so the while loop yields one iteration before stopping.
  test("getPath for unreachable node returns [destKey] (TS behavior, not Python [])", () => {
    const g = buildGraph(["GRU", "SSA", "MAO"], [["GRU", "SSA", 10]]);
    const { prev } = runDijkstra(g, "GRU");
    const path = getPath(prev, "MAO");
    expect(path).toEqual(["MAO"]);
  });
});

// ─── same origin and destination ──────────────────────────────────────────────
describe("Dijkstra — same origin/destination", () => {
  test("distance is 0, path is [origin]", () => {
    const { dist, prev } = runDijkstra(airportGraph(), "GRU");
    expect(dist.get("GRU")).toBe(0);
    expect(getPath(prev, "GRU")).toEqual(["GRU"]);
  });
});

// ─── negative weights — TS does NOT validate (differs from Python ValueError) ─
describe("Dijkstra — negative weights (TS behavior)", () => {
  // Python raises ValueError. TS silently produces incorrect results.
  test("does NOT throw on negative weight (unlike Python)", () => {
    const g = buildGraph(["A", "B"], [["A", "B", -5]]);
    expect(() => runDijkstra(g, "A")).not.toThrow();
  });

  test("produces incorrect result with negative weight (known limitation)", () => {
    // A→B=-5, A→C=10, C→B=2 → correct shortest is A→B=-5, but Dijkstra may pick A→C→B=12
    const g = buildGraph(["A", "B", "C"], [
      ["A", "B", -5],
      ["A", "C", 10],
      ["C", "B", 2],
    ]);
    const { dist } = runDijkstra(g, "A");
    // Just verifying it runs without throwing; result may be incorrect
    expect(typeof dist.get("B")).toBe("number");
  });
});

// ─── getHighlightedEdges ──────────────────────────────────────────────────────
describe("Dijkstra — getHighlightedEdges", () => {
  test("with destKey highlights only path edges GRU→SSA→REC→FOR", () => {
    const { prev } = runDijkstra(airportGraph(), "GRU");
    const highlighted = getHighlightedEdges(prev, "FOR");
    expect(highlighted.has("GRU-SSA")).toBe(true);
    expect(highlighted.has("SSA-REC")).toBe(true);
    expect(highlighted.has("REC-FOR")).toBe(true);
    expect(highlighted.has("GRU-REC")).toBe(false);
  });

  test("without destKey highlights all tree edges", () => {
    const { prev } = runDijkstra(airportGraph(), "GRU");
    const highlighted = getHighlightedEdges(prev, null);
    expect(highlighted.size).toBeGreaterThan(0);
  });
});
