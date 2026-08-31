# Binary Search Tree (BST)

## Definition
A Binary Search Tree is a node-based binary data structure where each node has at most two children, referred to as the left child and the right child. For any given node N: all values in the left subtree are strictly less than N's value, and all values in the right subtree are strictly greater.

## Properties
- **Ordering invariant**: left < node < right (strictly)
- **No duplicate keys** (in standard BST; variations allow duplicates)
- **Recursive structure**: Every subtree is itself a valid BST
- **In-order traversal** yields keys in sorted ascending order

## Core Operations
| Operation | Average Case | Worst Case (Unbalanced) |
|-----------|-------------|------------------------|
| Search    | O(log n)    | O(n)                   |
| Insert    | O(log n)    | O(n)                   |
| Delete    | O(log n)    | O(n)                   |

Worst case occurs when the tree degenerates into a linked list (sorted insertion).

## Step-by-Step Algorithms

### Insertion
1. Start at the root.
2. If the tree is empty, create a new node as root.
3. Compare the new key to the current node's key.
4. If new key < current, move to left child; if left is None, insert here.
5. If new key > current, move to right child; if right is None, insert here.
6. Repeat until insertion point is found.

### Search
1. Start at root.
2. If current node is None, key not found — return False.
3. If key == current node's key, return True.
4. If key < current, recurse into left subtree.
5. If key > current, recurse into right subtree.

### Deletion (Three Cases)
- **Case 1 — Node is a leaf**: Simply remove the node.
- **Case 2 — Node has one child**: Replace the node with its child.
- **Case 3 — Node has two children**: Find the in-order successor (smallest key in the right subtree), copy its value to the node, then delete the successor.

## Complexity
- **Time**: O(h) per operation where h is the height; O(log n) average, O(n) worst.
- **Space**: O(n) for storage; O(h) recursion stack.

## Edge Cases
- Inserting already-existing key (duplicates policy).
- Deleting the root node.
- Tree degenerating to a linked list due to sorted input.
- Searching in an empty tree.

## Interview Focus
- Know how to write iterative versions of search and insert to avoid stack overflow.
- Be able to validate whether an arbitrary binary tree is a valid BST (use range checking, not just child comparison).
- Balanced BST variants: AVL Tree, Red-Black Tree, treap.

## Advanced Insight
- **Self-balancing BSTs** (AVL, Red-Black) guarantee O(log n) worst case.
- **Augmented BSTs** can support order-statistics (k-th smallest) in O(log n) by storing subtree sizes.
- BSTs underpin sorted container implementations: `std::map`/`std::set` (C++), `TreeMap` (Java).

## Practice Problems
1. LeetCode 98: Validate Binary Search Tree
2. LeetCode 700: Search in a BST
3. LeetCode 701: Insert into a BST
4. LeetCode 450: Delete Node in a BST
5. LeetCode 230: Kth Smallest Element in a BST

## Revision Summary
BST = ordered binary tree. Every operation is O(log n) average, O(n) worst. Deletion with two children uses in-order successor. Fix worst-case with self-balancing variants.

---
*Source: Curated Knowledge Base v1.0 | Derived from CLRS §12, MIT OCW 6.006*
