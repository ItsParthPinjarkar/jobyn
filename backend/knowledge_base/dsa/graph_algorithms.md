# Graph Algorithms

## Definition
A graph G = (V, E) consists of a set of vertices V and a set of edges E connecting pairs of vertices. Graphs model networks, social connections, road maps, and dependency systems.

**Types**: Directed / Undirected, Weighted / Unweighted, Cyclic / Acyclic, Connected / Disconnected.

## Representations
- **Adjacency List**: `dict[node] = [neighbors]` — O(V + E) space. Preferred for sparse graphs.
- **Adjacency Matrix**: `matrix[i][j]` — O(V²) space. Fast edge lookup O(1).

## Core Algorithms

### BFS (Breadth-First Search)
Used for: shortest path in unweighted graph, level-order traversal.
1. Initialize queue with start node, visited set.
2. While queue not empty: dequeue node, process, enqueue unvisited neighbors.
3. **Complexity**: O(V + E) time, O(V) space.

### DFS (Depth-First Search)
Used for: cycle detection, topological sort, connected components, maze solving.
1. Start at node, mark visited.
2. Recurse into each unvisited neighbor.
3. **Complexity**: O(V + E) time, O(V) stack space.

### Dijkstra's Algorithm (Shortest Path — Weighted, Non-negative)
1. Initialize dist[] = infinity for all, dist[src] = 0.
2. Use a min-heap (priority queue).
3. Pop minimum-distance node, relax all edges.
4. **Complexity**: O((V + E) log V) with binary heap.

### Topological Sort (DAG Only)
**Kahn's Algorithm (BFS)**:
1. Compute in-degree for all nodes.
2. Enqueue all nodes with in-degree 0.
3. Process: dequeue, add to result, decrement neighbors' in-degree, enqueue if 0.
4. If result has all nodes → valid topo sort; else → cycle exists.

## Complexity Summary
| Algorithm    | Time        | Space |
|--------------|-------------|-------|
| BFS/DFS      | O(V+E)      | O(V)  |
| Dijkstra     | O((V+E)logV)| O(V)  |
| Bellman-Ford | O(VE)       | O(V)  |
| Floyd-Warshall| O(V³)      | O(V²) |

## Edge Cases
- Disconnected graphs (run BFS/DFS from every unvisited node).
- Self-loops and parallel edges.
- Negative weight cycles (Dijkstra fails; use Bellman-Ford).
- DAG check before topological sort.

## Interview Focus
- BFS for shortest path unweighted. Dijkstra for weighted.
- Cycle detection: DFS coloring (white/gray/black) for directed; union-find for undirected.
- Topological sort is fundamental for build systems, task scheduling, course prerequisites.

## Practice Problems
1. LeetCode 200: Number of Islands
2. LeetCode 207: Course Schedule (Topological Sort)
3. LeetCode 743: Network Delay Time (Dijkstra)
4. LeetCode 994: Rotting Oranges (BFS)
5. LeetCode 269: Alien Dictionary

---
*Source: Curated Knowledge Base v1.0 | Derived from CLRS §22-25, MIT OCW 6.006*
