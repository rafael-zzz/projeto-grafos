from dataclasses import dataclass
from typing import Iterable, Protocol


class NeighborView(Protocol):
    destination: str
    cost: float


class GraphProtocol(Protocol):
    def has_node(self, node_id: str) -> bool: ...
    def neighbors(self, node_id: str) -> Iterable[NeighborView]: ...
    def nodes(self) -> list[str]: ...


@dataclass
class Connection:
    destination: str
    cost: float
    connection_type: str = ""
    justification: str = ""


class AirportGraph:
    def __init__(self) -> None:
        self._airport_attributes: dict[str, dict] = {}
        self._adjacency: dict[str, list[Connection]] = {}

    def add_airport(self, iata: str, **attributes) -> None:
        if iata in self._airport_attributes:
            raise ValueError(f"Duplicate airport: {iata}")
        self._airport_attributes[iata] = attributes
        self._adjacency[iata] = []

    def add_connection(
        self,
        origin: str,
        destination: str,
        cost: float,
        connection_type: str = "",
        justification: str = "",
    ) -> None:
        for iata in (origin, destination):
            if iata not in self._airport_attributes:
                raise ValueError(f"Unknown airport: {iata}")
        if origin == destination:
            raise ValueError(f"Self-loop not allowed: {origin}")
        self._adjacency[origin].append(
            Connection(destination, cost, connection_type, justification)
        )
        self._adjacency[destination].append(
            Connection(origin, cost, connection_type, justification)
        )

    def neighbors(self, airport: str) -> list[Connection]:
        return self._adjacency.get(airport, [])

    def airports(self) -> list[str]:
        return list(self._airport_attributes.keys())

    def nodes(self) -> list[str]:
        return self.airports()

    def connections(self) -> list[tuple[str, str, float]]:
        seen: set[tuple[str, str]] = set()
        result = []
        for origin, conns in self._adjacency.items():
            for conn in conns:
                pair = tuple(sorted([origin, conn.destination]))
                if pair not in seen:
                    seen.add(pair)  # type: ignore[arg-type]
                    result.append((origin, conn.destination, conn.cost))
        return result

    def degree(self, airport: str) -> int:
        return len(self._adjacency.get(airport, []))

    def has_airport(self, iata: str) -> bool:
        return iata in self._airport_attributes

    def has_node(self, node_id: str) -> bool:
        return self.has_airport(node_id)

    def airport_attributes(self, iata: str) -> dict:
        return self._airport_attributes.get(iata, {})
