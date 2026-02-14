-- Drop learning plan DAG tables
DROP TRIGGER IF EXISTS update_learning_plan_nodes_updated_at ON learning_plan_nodes;
DROP TABLE IF EXISTS learning_plan_edges;
DROP TABLE IF EXISTS learning_plan_nodes;
