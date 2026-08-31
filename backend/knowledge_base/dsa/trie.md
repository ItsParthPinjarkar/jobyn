# Trie (Prefix Tree)

## Definition
A Trie, also called a prefix tree, is an ordered tree-like search data structure used to store a dynamic set or associative array where the keys are usually strings. Unlike a binary search tree, no node in the tree stores the key associated with that node; instead, its position in the tree defines the key with which it is associated. All descendants of a node have a common prefix of the string associated with that node.

## Properties
- **Root Node**: The root of the trie represents the empty string `""` and has children corresponding to the starting characters of stored words.
- **Node Structure**: Each node contains:
  - A map/dictionary or fixed-size array mapping characters to child nodes.
  - A boolean flag `is_end_of_word` (or `isWord`) indicating if a complete word terminates at this node.
- **Prefix Sharing**: Any words sharing a common prefix share the same ancestor nodes up to the length of the prefix.

## Core Operations
| Operation | Complexity (Time) | Complexity (Space) |
|-----------|-------------------|-------------------|
| Insert    | O(m)              | O(m * n) worst    |
| Search    | O(m)              | O(1)              |
| StartsWith| O(p)              | O(1)              |

Where:
- `m` is the length of the word being inserted or searched.
- `p` is the length of the prefix.
- `n` is the number of words stored.

## Step-by-Step Algorithms

### Insertion (Word: "cat")
1. Start at the root node.
2. For each character `char` in the word:
   - Check if `char` exists in the current node's children.
   - If not, create a new TrieNode and insert it into the current node's children.
   - Move to the child node corresponding to `char`.
3. After processing all characters, mark `is_end_of_word = True` on the final node.

### Search (Word: "cat")
1. Start at the root node.
2. For each character `char` in the word:
   - Check if `char` exists in the current node's children.
   - If not, the word does not exist — return `False`.
   - Move to the child node corresponding to `char`.
3. After visiting all characters, return the value of `is_end_of_word` (True if it's a complete word, False if it's just a prefix).

### StartsWith (Prefix: "ca")
1. Start at the root node.
2. For each character `char` in the prefix:
   - Check if `char` exists in the current node's children.
   - If not, no word starts with this prefix — return `False`.
   - Move to the child node corresponding to `char`.
3. Return `True` once all characters in the prefix are successfully matched.

## Edge Cases
- Inserting or searching an empty string `""`.
- Searching a word that is a prefix of another word (e.g., searching "car" when only "carpet" is inserted).
- Inserting duplicate words (should not duplicate nodes, only set the end-of-word flag).
- Standard alphabet sizing (e.g., lowercase a-z only vs. full Unicode mapping).

## Interview Focus
- Be ready to implement a standard `Trie` class from scratch including insert, search, and startsWith.
- Autocomplete: Using DFS from the prefix terminal node to fetch all matching word extensions.
- Space Optimization: Radix Tree (compact trie where consecutive single-child nodes are merged into one).

## Practice Problems
1. LeetCode 208: Implement Trie (Prefix Tree)
2. LeetCode 211: Design Add and Search Words Data Structure
3. LeetCode 212: Word Search II (Backtracking + Trie)
4. LeetCode 648: Replace Words
5. LeetCode 745: Prefix and Suffix Search (advanced double trie)

## Revision Summary
Trie = prefix tree. Keys are paths from root. O(m) insertions and search where m is string length. Used heavily for dictionary operations, autocomplete, and prefix lookups.

---
*Source: Curated Knowledge Base v1.0 | Derived from trekhleb/javascript-algorithms & CLRS §12*
