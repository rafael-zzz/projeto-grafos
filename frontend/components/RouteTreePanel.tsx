"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { GraphData, RouteTreeData } from "@/lib/graph/types";
import {
	buildRouteTreeData,
	createRouteSelection,
	type RouteSelection,
	type RouteSelectionTarget,
} from "@/lib/graph/routeTree";

export function RouteTreePanel({
	graph,
	routes,
	setRoutes,
	data,
	onResult,
	selectionTarget,
	setSelectionTarget,
	onClose,
}: {
	graph: GraphData;
	routes: RouteSelection[];
	setRoutes: Dispatch<SetStateAction<RouteSelection[]>>;
	data: RouteTreeData | null;
	onResult: (result: RouteTreeData | null) => void;
	selectionTarget: RouteSelectionTarget;
	setSelectionTarget: Dispatch<SetStateAction<RouteSelectionTarget>>;
	onClose: () => void;
}) {
	const [error, setError] = useState<string | null>(null);

	const sharedEdges = data?.edges.filter((edge) => (edge.attributes.routes?.length ?? 0) > 1) ?? [];
	const editingNote = selectionTarget ? `Clique no mapa para preencher ${selectionTarget.field === "origin" ? "a origem" : "o destino"}.` : "Clique em um campo e depois no mapa para preencher.";

	function updateRoute(id: string, field: "origin" | "destination", value: string) {
		setRoutes((current) => current.map((route) => (route.id === id ? { ...route, [field]: value } : route)));
		onResult(null);
		setError(null);
	}

	function addRoute() {
		const nextRoute = createRouteSelection(routes.length);
		setRoutes((current) => [...current, nextRoute]);
		setSelectionTarget({ routeId: nextRoute.id, field: "origin" });
		onResult(null);
		setError(null);
	}

	function removeRoute(id: string) {
		setRoutes((current) => (current.length === 1 ? current : current.filter((route) => route.id !== id)));
		setSelectionTarget((current) => (current?.routeId === id ? null : current));
		onResult(null);
		setError(null);
	}

	function generateRouteTree() {
		try {
			const normalizedRoutes = routes.map((route) => ({
				...route,
				origin: route.origin.trim().toUpperCase(),
				destination: route.destination.trim().toUpperCase(),
			}));

			if (normalizedRoutes.every((route) => !route.origin && !route.destination)) {
				throw new Error("Adicione ao menos um percurso.");
			}

			if (normalizedRoutes.some((route) => !route.origin || !route.destination)) {
				throw new Error("Preencha origem e destino em cada percurso.");
			}

			const result = buildRouteTreeData(graph, normalizedRoutes);
			onResult(result);
			setError(null);
		} catch (caughtError) {
			setError(caughtError instanceof Error ? caughtError.message : "Não foi possível gerar o percurso.");
		}
	}

	function clearRouteTree() {
		const nextRoute = createRouteSelection(0);
		setRoutes([nextRoute]);
		setSelectionTarget({ routeId: nextRoute.id, field: "origin" });
		setError(null);
		onResult(null);
	}

	return (
		<div className="flex h-full w-full flex-col overflow-hidden border-l border-zinc-200 bg-white">
			<div className="flex items-start justify-between border-b border-zinc-100 px-4 py-3">
				<div>
					<p className="text-sm font-bold text-zinc-800">Percurso destacado</p>
					<p className="mt-0.5 text-xs text-zinc-500">
						Selecione os aeroportos diretamente no mapa.
					</p>
				</div>
				<button
					onClick={onClose}
					className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
				>
					×
				</button>
			</div>

			<div className="border-b border-zinc-100 px-4 py-3">
				<div className="grid grid-cols-3 gap-3">
					<div className="flex flex-col gap-0.5">
						<span className="text-[10px] uppercase tracking-wide text-zinc-400">Rotas</span>
						<span className="text-xl font-bold text-zinc-800">{data?.routes.length ?? 0}</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-[10px] uppercase tracking-wide text-zinc-400">Nós</span>
						<span className="text-xl font-bold text-zinc-800">{data?.nodes.length ?? 0}</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-[10px] uppercase tracking-wide text-zinc-400">Arestas</span>
						<span className="text-xl font-bold text-zinc-800">{data?.edges.length ?? 0}</span>
					</div>
				</div>
				{sharedEdges.length > 0 && (
					<p className="mt-2 text-xs text-zinc-500">
						{sharedEdges.length} aresta(s) são compartilhadas entre as rotas.
					</p>
				)}
			</div>

			<div className="border-b border-zinc-100 px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Seleção direta</p>
						<p className="mt-0.5 text-xs text-zinc-500">{editingNote}</p>
					</div>
					<button
						onClick={addRoute}
						className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
					>
						Adicionar percurso
					</button>
				</div>

				<div className="mt-3 flex flex-col gap-3">
					{routes.map((route, index) => (
						<div key={route.id} className="rounded border border-zinc-100 bg-zinc-50 p-3">
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: route.color }} />
									<p className="text-xs font-semibold text-zinc-700">Percurso {index + 1}</p>
								</div>
								{routes.length > 1 && (
									<button
										onClick={() => removeRoute(route.id)}
										className="rounded px-2 py-1 text-[10px] font-semibold text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
									>
										Remover
									</button>
								)}
							</div>
							<div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
								<input
									list="route-tree-nodes"
									value={route.origin}
									onChange={(event) => updateRoute(route.id, "origin", event.target.value)}
									onFocus={() => setSelectionTarget({ routeId: route.id, field: "origin" })}
									placeholder="Origem"
									className={`rounded border px-2 py-1.5 text-xs text-zinc-800 outline-none ${selectionTarget?.routeId === route.id && selectionTarget.field === "origin" ? "border-zinc-500" : "border-zinc-200"}`}
								/>
								<input
									list="route-tree-nodes"
									value={route.destination}
									onChange={(event) => updateRoute(route.id, "destination", event.target.value)}
									onFocus={() => setSelectionTarget({ routeId: route.id, field: "destination" })}
									placeholder="Destino"
									className={`rounded border px-2 py-1.5 text-xs text-zinc-800 outline-none ${selectionTarget?.routeId === route.id && selectionTarget.field === "destination" ? "border-zinc-500" : "border-zinc-200"}`}
								/>
							</div>
						</div>
					))}
				</div>

				<datalist id="route-tree-nodes">
					{graph.nodes.map((node) => (
						<option key={node.key} value={node.key}>
							{node.attributes.city} · {node.attributes.region}
						</option>
					))}
				</datalist>

				{error && <p className="mt-2 text-[10px] text-red-500">{error}</p>}

				<div className="mt-3 flex gap-2">
					<button
						onClick={generateRouteTree}
						className="flex-1 rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
					>
						Gerar percurso
					</button>
					<button
						onClick={clearRouteTree}
						className="rounded border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
					>
						Limpar
					</button>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				<p className="sticky top-0 border-b border-zinc-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
					{data ? "Rotas geradas" : "Rotas em edição"}
				</p>
				{data ? (
					<div className="divide-y divide-zinc-50">
						{data.routes.map((route) => (
							<div key={route.id} className="px-4 py-3">
								<div className="flex items-center gap-2">
									<span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: route.color }} />
									<div className="min-w-0 flex-1">
										<p className="text-xs font-semibold text-zinc-800">{route.label}</p>
										<p className="text-[10px] text-zinc-500">
											{route.origin} → {route.destination} · custo {route.cost.toFixed(4)} · {route.hops} trecho(s)
										</p>
									</div>
								</div>
								<p className="mt-2 text-[10px] leading-5 text-zinc-500">
									{route.path.map((icao, index) => (
										<span key={`${route.id}-${icao}`}>
											<span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700">{icao}</span>
											{index < route.path.length - 1 && <span className="mx-1 text-zinc-300">→</span>}
										</span>
									))}
								</p>
							</div>
						))}
					</div>
				) : (
					<div className="px-4 py-3 text-xs text-zinc-400">
						{routes.map((route, index) => (
							<p key={route.id} className={index > 0 ? "mt-2" : undefined}>
								Percurso {index + 1}: {route.origin || "origem"} → {route.destination || "destino"}
							</p>
						))}
					</div>
				)}
			</div>
		</div>
	);
}