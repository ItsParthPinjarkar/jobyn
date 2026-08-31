# Sorting Algorithms (Merge Sort & Quick Sort)

## Definition
Sorting algorithms arrange elements in a list in a specific order (most commonly ascending or descending). Merge Sort and Quick Sort are two of the most popular divide-and-conquer sorting algorithms used in modern software development and engineering interviews.

## Properties
- **Divide and Conquer**: Both algorithms recursively break down the sorting problem into smaller, easily solvable sub-problems.
- **Stability**: 
  - **Merge Sort**: Stable (preserves the relative order of equal elements).
  - **Quick Sort**: Unstable (can reorder equal elements).
- **In-Place Sorting**:
  - **Merge Sort**: No (requires auxiliary memory proportional to the list size).
  - **Quick Sort**: Yes (reorders elements directly in the array, using minimal recursion stack memory).

## Core Complexities
| Algorithm | Best Case | Average Case | Worst Case | Space Complexity |
|-----------|-----------|--------------|------------|------------------|
| Merge Sort| O(n log n) | O(n log n)  | O(n log n)  | O(n)             |
| Quick Sort| O(n log n) | O(n log n)  | O(n^2)     | O(log n) average |

Worst case for Quick Sort occurs when the pivot chosen is consistently the smallest or largest element (e.g., already sorted array without randomized pivots).

## Step-by-Step Algorithms

### Merge Sort
1. **Divide**: Split the array into two halves at the midpoint.
2. **Conquer**: Recursively apply Merge Sort to the left and right halves.
3. **Combine**: Merge the two sorted halves into a single sorted array:
   - Compare elements from both sorted lists one by one.
   - Insert the smaller element into the result array and increment its index.
   - Append any remaining elements from either list when the other is exhausted.

### Quick Sort (Lomuto Partition Scheme)
1. **Choose Pivot**: Pick an element as the pivot (often the last element).
2. **Partition**: Rearrange the array so that all elements smaller than the pivot go to its left, and all elements larger go to its right:
   - Keep a pointer `i` tracking the boundary of smaller elements.
   - Loop through elements with pointer `j`. If `array[j] < pivot`, increment `i` and swap `array[i]` with `array[j]`.
   - Swap the pivot element with the element at `array[i + 1]` to place pivot in its final sorted position.
3. **Recurse**: Recursively apply Quick Sort to the left partition (elements before the pivot) and right partition (elements after the pivot).

## Complexity Analysis
- **Merge Sort**: Always O(n log n) time because the array is divided strictly in half at each step (log n levels), and merging takes O(n) time at each level.
- **Quick Sort**: O(n log n) average. Worst case is O(n^2) when partitioning is highly unbalanced. Randomized pivots or median-of-three selection mitigates worst-case scenarios.

## Edge Cases
- Empty array or single-element array (already sorted).
- Array with all identical elements.
- Array that is already sorted in ascending or descending order.
- Highly unbalanced pivots in Quick Sort.

## Interview Focus
- Be prepared to discuss when to use Merge Sort vs Quick Sort (Merge Sort is stable and preferred for linked lists or external sorting; Quick Sort is in-place and fast in practice).
- Implement partitioning schemes (Lomuto vs Hoare).
- Explain how to optimize Quick Sort to guarantee O(n log n) using randomized pivots or dual-pivot techniques (like in Java's standard sort).

## Practice Problems
1. LeetCode 912: Sort an Array
2. LeetCode 148: Sort List
3. LeetCode 215: Kth Largest Element in an Array (Quickselect)
4. LeetCode 56: Merge Intervals
5. LeetCode 327: Count of Range Sum (advanced divide-and-conquer application)

## Revision Summary
Merge Sort = stable, O(n log n) guaranteed, O(n) extra space, split in middle, merge halves.
Quick Sort = unstable, O(n log n) average, O(1) extra auxiliary space, partition around pivot, recursively sort partitions.

---
*Source: Curated Knowledge Base v1.0 | Derived from trekhleb/javascript-algorithms & CLRS §2 & §7*
