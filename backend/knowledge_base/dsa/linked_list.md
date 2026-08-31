# Linked List

## Definition
A Linked List is a linear data structure where each element (called a node) stores a value and a pointer to the next node in the sequence. Unlike arrays, linked list nodes are not stored in contiguous memory locations.

**Types**:
- **Singly Linked List**: Each node points to the next node only.
- **Doubly Linked List**: Each node has pointers to both next and previous nodes.
- **Circular Linked List**: The last node points back to the head.

## Properties
- Dynamic size — grows/shrinks at runtime without reallocation.
- Sequential access only — no random access by index (unlike arrays).
- Extra memory overhead per node (the pointer field).
- Efficient at head insertions and deletions: O(1).

## Core Operations
| Operation         | Time     |
|-------------------|----------|
| Access by index   | O(n)     |
| Search            | O(n)     |
| Insert at head    | O(1)     |
| Insert at tail    | O(1)*    |
| Insert at middle  | O(n)     |
| Delete at head    | O(1)     |
| Delete at tail    | O(n) SLL |

*O(1) at tail requires a tail pointer.

## Step-by-Step Algorithms

### Insertion at Head
1. Create a new node with the value.
2. Set new node's next = head.
3. Update head = new node.

### Reversal (Iterative — most common interview question)
1. Initialize prev = None, curr = head.
2. While curr is not None:
   - Store next = curr.next.
   - Set curr.next = prev.
   - Move prev = curr.
   - Move curr = next.
3. Return prev (new head).

### Detecting a Cycle (Floyd's Algorithm)
1. Initialize slow = head, fast = head.
2. While fast and fast.next are not None:
   - slow = slow.next (1 step).
   - fast = fast.next.next (2 steps).
   - If slow == fast, cycle detected.
3. If loop exits without meeting, no cycle.

## Complexity
- **Time**: O(n) for most traversal-based operations.
- **Space**: O(1) extra for iterative algorithms; O(n) for recursive approaches.

## Edge Cases
- Empty list (head == None).
- Single-node list.
- Cycle detection: tail points to head vs. middle.
- Merging two sorted linked lists.

## Interview Focus
- Know reversal by heart — iterative and recursive.
- Floyd's cycle detection is a guaranteed question.
- Learn "find middle of linked list" using slow/fast pointers (tortoise and hare).
- Know how to remove N-th node from end in one pass.

## Advanced Insight
- **Skip List**: A layered linked list that achieves O(log n) search through multiple levels of express lanes. Used in Redis sorted sets.
- **XOR Linked List**: Saves memory by storing XOR of prev and next addresses.
- Practical use: OS memory allocators, browser back/forward navigation, undo system.

## Practice Problems
1. LeetCode 206: Reverse Linked List
2. LeetCode 141: Linked List Cycle
3. LeetCode 21: Merge Two Sorted Lists
4. LeetCode 19: Remove Nth Node From End
5. LeetCode 160: Intersection of Two Linked Lists

## Revision Summary
Linked list = dynamic, sequential, pointer-based. O(1) head insert. O(n) access. Reversal and cycle detection are core interview questions. Slow/fast pointer is the master technique.

---
*Source: Curated Knowledge Base v1.0 | Derived from CLRS §10, GeeksforGeeks DSA course*
