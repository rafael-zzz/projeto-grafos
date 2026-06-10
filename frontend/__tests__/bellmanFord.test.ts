import { timedBellmanFord } from "@/lib/graph/wikiReport";
import { buildGraph } from "./helpers";

// NOTE — behavioral difference vs Python:
//   Python BellmanFord raises ValueError on negative cycle.
//   TS timedBellmanFord sets negativeCycle=true and returns normally.
//   Python accepts optional destination; TS always requires one.

// Same topology as Python:
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

// ─── positive weights (mirrors Python test_shortest_path_positive_weights) ────
describe("Bellman-Ford — positive weights", () => {
  test("GRU→FOR cost=23, path=[GRU,SSA,REC,FOR]", () => {
    const result = timedBellmanFord(airportGraph(), "GRU", "FOR");
    expect(result.cost).toBe(23);
    expect(result.path).toEqual(["GRU", "SSA", "REC", "FOR"]);
    expect(result.negativeCycle).toBe(false);
  });

  test("GRU→REC cost=15 via SSA, not direct 20", () => {
    const result = timedBellmanFord(airportGraph(), "GRU", "REC");
    expect(result.cost).toBe(15);
    expect(result.path).toEqual(["GRU", "SSA", "REC"]);
  });
});

// ─── negative weights (mirrors Python test_shortest_path_with_negative_weight) ─
describe("Bellman-Ford — negative weights", () => {
  test("A→C→B with C→B=-1: cost=1, path=[A,C,B]", () => {
    const g = buildGraph(["A", "B", "C"], [
      ["A", "B", 4],
      ["A", "C", 2],
      ["C", "B", -1],
    ]);
    const result = timedBellmanFord(g, "A", "B");
    expect(result.cost).toBe(1);
    expect(result.path).toEqual(["A", "C", "B"]);
    expect(result.negativeCycle).toBe(false);
  });
});

// ─── same origin/destination (mirrors Python test_same_origin_destination) ────
describe("Bellman-Ford — same origin/destination", () => {
  test("cost=0, path=[GRU]", () => {
    const result = timedBellmanFord(airportGraph(), "GRU", "GRU");
    expect(result.cost).toBe(0);
    expect(result.path).toEqual(["GRU"]);
  });
});

// ─── unreachable destination (mirrors Python test_unreachable_destination) ────
describe("Bellman-Ford — unreachable destination", () => {
  test("cost=null, path=[] (matches Python dist=inf, path=[])", () => {
    const g = buildGraph(
      ["GRU", "SSA", "MAO"],
      [["GRU", "SSA", 10]],
    );
    const result = timedBellmanFord(g, "GRU", "MAO");
    expect(result.cost).toBeNull();
    expect(result.path).toEqual([]);
    expect(result.negativeCycle).toBe(false);
  });
});

// ─── negative cycle (mirrors Python test_detects_negative_cycle) ─────────────
describe("Bellman-Ford — negative cycle detection", () => {
  // Python raises ValueError. TS sets negativeCycle=true and returns normally.
  // NOTE: TS does not set cost=null when negativeCycle=true — cost reflects
  // whatever dist[dest] holds after relaxation (unreliable due to the cycle).
  // Path reconstruction IS skipped, so path is always [] when negativeCycle=true.
  test("A→B=1, B→C=-3, C→A=1: negativeCycle=true, path=[]", () => {
    const g = buildGraph(["A", "B", "C"], [
      ["A", "B", 1],
      ["B", "C", -3],
      ["C", "A", 1],
    ]);
    const result = timedBellmanFord(g, "A", "B");
    expect(result.negativeCycle).toBe(true);
    expect(result.path).toEqual([]);
    // cost value is unreliable when negativeCycle=true — just verify it's a number
    expect(typeof result.cost === "number" || result.cost === null).toBe(true);
  });

  test("does NOT throw on negative cycle (unlike Python)", () => {
    const g = buildGraph(["A", "B", "C"], [
      ["A", "B", 1],
      ["B", "C", -3],
      ["C", "A", 1],
    ]);
    expect(() => timedBellmanFord(g, "A", "B")).not.toThrow();
  });
});

// ─── all distances (mirrors Python test_all_distances_no_destination) ─────────
// TS always requires a destination, so we test individual distances separately.
describe("Bellman-Ford — individual distances from GRU", () => {
  test("GRU=0, SSA=10, REC=15, FOR=23", () => {
    const g = airportGraph();
    expect(timedBellmanFord(g, "GRU", "GRU").cost).toBe(0);
    expect(timedBellmanFord(g, "GRU", "SSA").cost).toBe(10);
    expect(timedBellmanFord(g, "GRU", "REC").cost).toBe(15);
    expect(timedBellmanFord(g, "GRU", "FOR").cost).toBe(23);
  });
});

// ─── report metadata ──────────────────────────────────────────────────────────
describe("Bellman-Ford — report metadata", () => {
  test("elapsedMs is a non-negative number", () => {
    const result = timedBellmanFord(airportGraph(), "GRU", "FOR");
    expect(typeof result.elapsedMs).toBe("number");
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  test("origin and destination fields match input", () => {
    const result = timedBellmanFord(airportGraph(), "GRU", "FOR");
    expect(result.origin).toBe("GRU");
    expect(result.destination).toBe("FOR");
  });
});
