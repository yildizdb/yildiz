#TODO
#arcs src, dst, distance => kca1_edges kca1_node_id, other_node_id, depth
#nodes

WITH paths (node, path, cost, rnk, lev) AS (
    SELECT a.dst, a.src || ',' || a.dst, a.distance, 1, 1
    FROM arcs a
    WHERE a.src = :SRC
    UNION ALL
    SELECT a.dst, 
            p.path || ',' || a.dst, 
            p.cost + a.distance, 
            Rank () OVER (PARTITION BY a.dst ORDER BY p.cost + a.distance),
            p.lev + 1
    FROM paths p
    JOIN arcs a
        ON a.src = p.nodeWITH paths (node, path, lev, rn) AS (
SELECT a.dst, To_Char(a.dst), 1, 1
  FROM arcs_v a
WHERE a.src = &SRC
    AND p.rnk = 1
)  SEARCH DEPTH FIRST BY node SET line_no

CYCLE node SET lp TO '*' DEFAULT ' ', paths_ranked AS (
SELECT lev, node, path, cost, Rank () OVER (PARTITION BY node ORDER BY cost) rnk_t, lp, line_no
  FROM paths
  WHERE rnk = 1
)

SELECT LPad (node, 1 + 2* (lev - 1), '.') node, lev, path, cost, lp
  FROM paths_ranked
  WHERE rnk_t = 1
  ORDER BY line_no