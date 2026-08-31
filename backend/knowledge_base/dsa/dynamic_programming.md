# Dynamic Programming (DP)

## Definition
Dynamic Programming is an algorithm design paradigm that solves complex problems by breaking them into simpler overlapping subproblems, solving each only once, and storing the results (memoization or tabulation) to avoid redundant computation.

## Properties
- **Optimal Substructure**: An optimal solution to the problem contains optimal solutions to its subproblems.
- **Overlapping Subproblems**: The same subproblems are solved repeatedly (unlike Divide & Conquer where subproblems don't overlap).
- **Two approaches**: Top-down (memoization with recursion) and Bottom-up (tabulation with iteration).

## Patterns
1. **1D DP** — linear array: Fibonacci, climbing stairs, house robber.
2. **2D DP (Grid)** — matrix: Unique paths, minimum path sum.
3. **Interval DP** — solve on sub-intervals: Matrix chain multiplication.
4. **Sequence DP** — LCS, LIS, edit distance.
5. **Knapsack** — 0/1 knapsack, unbounded knapsack.

## Step-by-Step: Fibonacci (Memoization)
1. Define state: dp[n] = nth Fibonacci number.
2. Base cases: dp[0]=0, dp[1]=1.
3. Transition: dp[n] = dp[n-1] + dp[n-2].
4. Cache memo = {} to avoid recomputation.

## Step-by-Step: 0/1 Knapsack (Tabulation)
1. Create dp[0..W] initialized to 0 where W = capacity.
2. For each item (weight w, value v): iterate W down to w.
   - dp[j] = max(dp[j], dp[j-w] + v).
3. Answer is dp[W].

## Complexity
- **Time**: O(n×W) for knapsack, O(n²) for LIS (naive), O(n log n) LIS (optimized).
- **Space**: O(n×W) which can often be reduced to O(W) with space optimization.

## Edge Cases
- Empty input array (return 0 or base value).
- Single element.
- Negative weights or values (special handling required).

## Interview Focus
- "Can we use DP?" → Check: optimal substructure + overlapping subproblems.
- Always define the state clearly before writing any code.
- Reduce 2D DP to 1D when only the previous row is needed.
- Know LCS, LIS, Edit Distance by heart.

## Practice Problems
1. LeetCode 70: Climbing Stairs
2. LeetCode 322: Coin Change
3. LeetCode 300: Longest Increasing Subsequence
4. LeetCode 1143: Longest Common Subsequence
5. LeetCode 72: Edit Distance

## Revision Summary
DP = recursion + memoization OR iteration + tabulation. Define state, base case, transition. Common patterns: 1D, 2D, knapsack, sequence. Always optimize space when only previous row needed.

---
*Source: Curated Knowledge Base v1.0 | Derived from CLRS §15, MIT OCW 6.006*
