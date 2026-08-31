# Heap (Binary Heap)

## Definition
A Heap is a complete binary tree that satisfies the heap property. In a **Max-Heap**, every parent node is greater than or equal to its children. In a **Min-Heap**, every parent node is less than or equal to its children. Heaps are typically implemented using arrays.

## Properties
- **Complete binary tree**: All levels are fully filled except possibly the last, which is filled from left to right.
- **Array representation**: For node at index i, left child = 2i+1, right child = 2i+2, parent = (i-1)//2.
- **Heap property**: max-heap → parent ≥ children; min-heap → parent ≤ children.
- Root always holds the maximum (max-heap) or minimum (min-heap) element.

## Core Operations
| Operation      | Time     |
|----------------|----------|
| Find max/min   | O(1)     |
| Insert         | O(log n) |
| Delete max/min | O(log n) |
| Heapify        | O(n)     |
| Heap Sort      | O(n log n) |

## Step-by-Step Algorithms

### Insert (Sift-Up)
1. Append the new element at the end of the array.
2. Compare with its parent.
3. If heap property is violated, swap with parent.
4. Repeat until the element is in the correct position (root or heap property satisfied).

### Extract Max/Min (Sift-Down)
1. Replace the root with the last element.
2. Remove the last element.
3. Sift-down: compare the root with its children.
4. Swap with the larger child (max-heap) or smaller child (min-heap).
5. Repeat until heap property is restored.

### Build Heap (Heapify) from Array
1. Start from the last non-leaf node: index = n//2 - 1.
2. Sift-down each node from this index to 0.
3. This builds a valid heap in O(n) time (not O(n log n)).

## Complexity
- **Time**: O(log n) insert/delete, O(1) peek, O(n) heapify.
- **Space**: O(n) for storing the heap.

## Edge Cases
- Heap with one element.
- Heapifying an already-sorted array.
- Handling equal elements (stability — heaps are not stable).

## Interview Focus
- Know how Python's `heapq` module works: it's always a min-heap.
- Max-heap in Python: negate values (`-x`).
- "K largest elements" / "K closest point" problems always use heaps.
- Heap sort: O(n log n), in-place, not stable.

## Advanced Insight
- **Fibonacci Heap**: Supports decrease-key in amortized O(1), used in Dijkstra's for optimal performance O(E + V log V).
- **D-ary Heap**: Children count = d; useful when inserts heavily outnumber deletes.
- Priority queues in operating system schedulers and event simulation systems.

## Practice Problems
1. LeetCode 215: Kth Largest Element in an Array
2. LeetCode 347: Top K Frequent Elements
3. LeetCode 295: Find Median from Data Stream
4. LeetCode 23: Merge K Sorted Lists
5. LeetCode 621: Task Scheduler

## Revision Summary
Heap = complete binary tree + heap property. Array-backed. O(log n) insert/extract. O(n) build. Used for priority queues, top-K problems, and graph algorithms. Python heapq is min-heap always.

---
*Source: Curated Knowledge Base v1.0 | Derived from CLRS §6, MIT OCW 6.006 Lecture 4*
