-- Add learning plan nodes table for DAG structure
CREATE TABLE learning_plan_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learning_plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  planned_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  completed_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_plan_nodes_plan_id ON learning_plan_nodes(learning_plan_id);
CREATE INDEX idx_learning_plan_nodes_skill_id ON learning_plan_nodes(skill_id);

-- Add learning plan edges table for DAG dependencies
CREATE TABLE learning_plan_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learning_plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES learning_plan_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES learning_plan_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_node_id, target_node_id)
);

CREATE INDEX idx_learning_plan_edges_plan_id ON learning_plan_edges(learning_plan_id);
CREATE INDEX idx_learning_plan_edges_source ON learning_plan_edges(source_node_id);
CREATE INDEX idx_learning_plan_edges_target ON learning_plan_edges(target_node_id);

-- Add triggers for updated_at
CREATE TRIGGER update_learning_plan_nodes_updated_at BEFORE UPDATE ON learning_plan_nodes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
