import type { GraphData, RouteTreeData } from "./types";
import { getPath, runDijkstra } from "./dijkstra";

const ROUTE_COLORS = ["#f59e0b", "#0ea5e9", "#10b981", "#8b5cf6", "#ef4444", "#14b8a6"];

export type RouteSelection = {
	id: string;
	origin: string;
	destination: string;
	color: string;
};

export type RouteSelectionTarget = {
	routeId: string;
	field: "origin" | "destination";
} | null;

export function createRouteSelection(index: number): RouteSelection {
	return {
		id: `route-${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
		origin: "",
		destination: "",
		color: ROUTE_COLORS[index % ROUTE_COLORS.length],
	};
}

function appendUnique(values: string[], value: string) {
	if (!values.includes(value)) {
		values.push(value);
	}
}

function findDirectedEdge(graph: GraphData, origin: string, destination: string) {
	return graph.edges.find((edge) => edge.source === origin && edge.target === destination) ?? null;
}

export function buildRouteTreeData(graph: GraphData, routeSelections: RouteSelection[]): RouteTreeData {
	if (!routeSelections.length) {
		throw new Error("Adicione ao menos um percurso.");
	}

	const nodeMap = new Map(graph.nodes.map((node) => [node.key, node]));
	const nodes: RouteTreeData["nodes"] = [];
	const edges: RouteTreeData["edges"] = [];
	const routes: RouteTreeData["routes"] = [];
	const nodeEntries = new Map<string, RouteTreeData["nodes"][number]>();
	const edgeEntries = new Map<string, RouteTreeData["edges"][number]>();

	routeSelections.forEach((selection, index) => {
		const origin = selection.origin.trim().toUpperCase();
		const destination = selection.destination.trim().toUpperCase();
		if (!origin || !destination) {
			throw new Error(`Preencha origem e destino no percurso ${index + 1}.`);
		}
		if (!nodeMap.has(origin)) {
			throw new Error(`Aeroporto "${origin}" não encontrado.`);
		}
		if (!nodeMap.has(destination)) {
			throw new Error(`Aeroporto "${destination}" não encontrado.`);
		}
		if (origin === destination) {
			throw new Error(`Origem e destino iguais no percurso ${index + 1}.`);
		}

		const { dist, prev } = runDijkstra(graph, origin);
		const distance = dist.get(destination) ?? Infinity;
		if (distance === Infinity) {
			throw new Error(`Sem caminho de ${origin} para ${destination}.`);
		}

		const path = getPath(prev, destination);
		const originNode = nodeMap.get(origin)!;
		const destinationNode = nodeMap.get(destination)!;
		const routeId = selection.id || `route-${index + 1}`;
		const label = `${originNode.attributes.city} → ${destinationNode.attributes.city}`;
		const color = selection.color;

		routes.push({
			id: routeId,
			label,
			origin,
			destination,
			cost: Number(distance.toFixed(4)),
			path,
			hops: Math.max(path.length - 1, 0),
			color,
		});

		for (const icao of path) {
			const node = nodeMap.get(icao);
			if (!node) continue;

			const nodeEntry = nodeEntries.get(icao) ?? {
				key: icao,
				attributes: {
					label: icao,
					city: node.attributes.city,
					region: node.attributes.region,
					x: node.attributes.x,
					y: node.attributes.y,
					size: 10,
					color: node.attributes.color,
					routes: [],
					route_labels: [],
					route_colors: [],
				},
			};

			appendUnique(nodeEntry.attributes.routes ?? [], routeId);
			appendUnique(nodeEntry.attributes.route_labels ?? [], label);
			appendUnique(nodeEntry.attributes.route_colors ?? [], color);
			nodeEntry.attributes.size = 10 + 2 * (nodeEntry.attributes.routes?.length ?? 0);
			nodeEntries.set(icao, nodeEntry);
		}

		for (let i = 0; i < path.length - 1; i += 1) {
			const source = path[i];
			const target = path[i + 1];
			const edge = findDirectedEdge(graph, source, target);
			if (!edge) {
				throw new Error(`Aresta ausente no trecho ${source} -> ${target}.`);
			}

			const edgeKey = `${source}-${target}`;
			const edgeEntry = edgeEntries.get(edgeKey) ?? {
				key: edgeKey,
				source,
				target,
				attributes: {
					weight: edge.attributes.weight,
					connection_type: edge.attributes.connection_type || "path",
					flights: edge.attributes.flights,
					size: 2,
					color,
					routes: [],
					route_labels: [],
					route_colors: [],
					highlight: true,
				},
			};

			appendUnique(edgeEntry.attributes.routes ?? [], routeId);
			appendUnique(edgeEntry.attributes.route_labels ?? [], label);
			appendUnique(edgeEntry.attributes.route_colors ?? [], color);
			edgeEntry.attributes.size = 2 + (edgeEntry.attributes.routes?.length ?? 0);
			edgeEntry.attributes.color = (edgeEntry.attributes.routes?.length ?? 0) > 1 ? "#111827" : edgeEntry.attributes.route_colors?.[0] ?? color;
			edgeEntries.set(edgeKey, edgeEntry);
		}
	});

	for (const node of nodeEntries.values()) {
		nodes.push(node);
	}

	for (const edge of edgeEntries.values()) {
		const routeCount = edge.attributes.routes?.length ?? 0;
		edge.attributes.color = routeCount > 1 ? "#111827" : edge.attributes.route_colors?.[0] ?? edge.attributes.color;
		edges.push(edge);
	}

	return { routes, nodes, edges };
}