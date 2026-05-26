export type NodeAttrs = {
	label: string;
	city: string;
	region: string;
	x: number;
	y: number;
	size: number;
	color: string;
	routes?: string[];
	route_labels?: string[];
	route_colors?: string[];
};

export type GraphNode = { key: string; attributes: NodeAttrs };

export type RoutePath = {
	id: string;
	label: string;
	origin: string;
	destination: string;
	cost: number;
	path: string[];
	hops: number;
	color: string;
};

export type GraphEdge = {
	key: string;
	source: string;
	target: string;
	attributes: {
		weight: number;
		connection_type: string;
		flights: number;
		size: number;
		color: string;
		routes?: string[];
		route_labels?: string[];
		route_colors?: string[];
		highlight?: boolean;
	};
};

export type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };

export type RouteTreeData = GraphData & {
	routes: RoutePath[];
};
