/**
 * Learning Plans API Client
 * Handles CRUD operations for learning plans with DAG visualization
 */

import { getClient } from './helpers/api-client';

// ============================================================================
// Types
// ============================================================================

export interface Schedule {
  frequency: string;
  durationMinutes: number;
  preferredTimes: string[];
  preferredDays: number[];
  autoSchedule: boolean;
}

export interface LearningPlanNode {
  id: string;
  learningPlanId: string;
  skillId?: string;
  skill?: {
    id: string;
    name: string;
    level?: string;
  };
  title: string;
  description?: string;
  plannedHours: number;
  completedHours: number;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPlanEdge {
  id: string;
  learningPlanId: string;
  sourceNodeId: string;
  targetNodeId: string;
  createdAt: string;
}

export interface LearningPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  skillIds: string[];
  skills: Array<{
    id: string;
    name: string;
    level?: string;
  }>;
  schedule: Schedule;
  targetHoursPerWeek?: number;
  startDate: string;
  endDate?: string;
  completedHours: number;
  nodes: LearningPlanNode[];
  edges: LearningPlanEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLearningPlanInput {
  name: string;
  description?: string;
  skillIds: string[];
  schedule: Schedule;
  targetHoursPerWeek?: number;
  startDate: string;
  endDate?: string;
}

export interface UpdateLearningPlanInput {
  name?: string;
  description?: string;
  skillIds?: string[];
  schedule?: Schedule;
  targetHoursPerWeek?: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateNodeInput {
  learningPlanId: string;
  skillId?: string;
  title: string;
  description?: string;
  plannedHours: number;
  positionX: number;
  positionY: number;
}

export interface UpdateNodeInput {
  skillId?: string;
  title?: string;
  description?: string;
  plannedHours?: number;
  completedHours?: number;
  positionX?: number;
  positionY?: number;
}

export interface CreateEdgeInput {
  learningPlanId: string;
  sourceNodeId: string;
  targetNodeId: string;
}

// ============================================================================
// GraphQL Queries & Mutations
// ============================================================================

const LEARNING_PLAN_FIELDS = `
  id
  userId
  name
  description
  skillIds
  skills {
    id
    name
    level
  }
  schedule {
    frequency
    durationMinutes
    preferredTimes
    preferredDays
    autoSchedule
  }
  targetHoursPerWeek
  startDate
  endDate
  completedHours
  nodes {
    id
    learningPlanId
    skillId
    skill {
      id
      name
      level
    }
    title
    description
    plannedHours
    completedHours
    positionX
    positionY
    createdAt
    updatedAt
  }
  edges {
    id
    learningPlanId
    sourceNodeId
    targetNodeId
    createdAt
  }
  createdAt
  updatedAt
`;

const NODE_FIELDS = `
  id
  learningPlanId
  skillId
  skill {
    id
    name
    level
  }
  title
  description
  plannedHours
  completedHours
  positionX
  positionY
  createdAt
  updatedAt
`;

const EDGE_FIELDS = `
  id
  learningPlanId
  sourceNodeId
  targetNodeId
  createdAt
`;

// ============================================================================
// Learning Plan Operations
// ============================================================================

export async function getLearningPlans(): Promise<LearningPlan[]> {
  const query = `
    query GetLearningPlans {
      learningPlans {
        ${LEARNING_PLAN_FIELDS}
      }
    }
  `;

  const client = getClient();
  const result = await client.query(query, {}).toPromise();
  
  if (result.error) {
    console.error('Error fetching learning plans:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data?.learningPlans || [];
}

export async function getLearningPlan(id: string): Promise<LearningPlan> {
  const query = `
    query GetLearningPlan($id: UUID!) {
      learningPlan(id: $id) {
        ${LEARNING_PLAN_FIELDS}
      }
    }
  `;

  const client = getClient();
  const result = await client.query(query, { id }).toPromise();
  
  if (result.error) {
    console.error('Error fetching learning plan:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data?.learningPlan;
}

export async function createLearningPlan(
  input: CreateLearningPlanInput
): Promise<LearningPlan> {
  const mutation = `
    mutation CreateLearningPlan($input: CreateLearningPlanInput!) {
      createLearningPlan(input: $input) {
        ${LEARNING_PLAN_FIELDS}
      }
    }
  `;

  const client = getClient();
  const result = await client.mutation(mutation, { input }).toPromise();
  
  if (result.error) {
    console.error('Error creating learning plan:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data.createLearningPlan;
}

export async function updateLearningPlan(
  id: string,
  input: UpdateLearningPlanInput
): Promise<LearningPlan> {
  const mutation = `
    mutation UpdateLearningPlan($id: UUID!, $input: UpdateLearningPlanInput!) {
      updateLearningPlan(id: $id, input: $input) {
        ${LEARNING_PLAN_FIELDS}
      }
    }
  `;

  const client = getClient();
  const result = await client.mutation(mutation, { id, input }).toPromise();
  
  if (result.error) {
    console.error('Error updating learning plan:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data.updateLearningPlan;
}

export async function deleteLearningPlan(id: string): Promise<boolean> {
  const mutation = `
    mutation DeleteLearningPlan($id: UUID!) {
      deleteLearningPlan(id: $id)
    }
  `;

  const client = getClient();
  const result = await client.mutation(mutation, { id }).toPromise();
  
  if (result.error) {
    console.error('Error deleting learning plan:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data.deleteLearningPlan;
}

// ============================================================================
// Node Operations
// ============================================================================

export async function createNode(input: CreateNodeInput): Promise<LearningPlanNode> {
  const mutation = `
    mutation CreateLearningPlanNode($input: CreateLearningPlanNodeInput!) {
      createLearningPlanNode(input: $input) {
        ${NODE_FIELDS}
      }
    }
  `;

  const client = getClient();
  const result = await client.mutation(mutation, { input }).toPromise();
  
  if (result.error) {
    console.error('Error creating node:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data.createLearningPlanNode;
}

export async function updateNode(
  id: string,
  input: UpdateNodeInput
): Promise<LearningPlanNode> {
  const mutation = `
    mutation UpdateLearningPlanNode($id: UUID!, $input: UpdateLearningPlanNodeInput!) {
      updateLearningPlanNode(id: $id, input: $input) {
        ${NODE_FIELDS}
      }
    }
  `;

  const client = getClient();
  const result = await client.mutation(mutation, { id, input }).toPromise();
  
  if (result.error) {
    console.error('Error updating node:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data.updateLearningPlanNode;
}

export async function deleteNode(id: string): Promise<boolean> {
  const mutation = `
    mutation DeleteLearningPlanNode($id: UUID!) {
      deleteLearningPlanNode(id: $id)
    }
  `;

  const client = getClient();
  const result = await client.mutation(mutation, { id }).toPromise();
  
  if (result.error) {
    console.error('Error deleting node:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data.deleteLearningPlanNode;
}

// ============================================================================
// Edge Operations
// ============================================================================

export async function createEdge(input: CreateEdgeInput): Promise<LearningPlanEdge> {
  const mutation = `
    mutation CreateLearningPlanEdge($input: CreateLearningPlanEdgeInput!) {
      createLearningPlanEdge(input: $input) {
        ${EDGE_FIELDS}
      }
    }
  `;

  const client = getClient();
  const result = await client.mutation(mutation, { input }).toPromise();
  
  if (result.error) {
    console.error('Error creating edge:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data.createLearningPlanEdge;
}

export async function deleteEdge(id: string): Promise<boolean> {
  const mutation = `
    mutation DeleteLearningPlanEdge($id: UUID!) {
      deleteLearningPlanEdge(id: $id)
    }
  `;

  const client = getClient();
  const result = await client.mutation(mutation, { id }).toPromise();
  
  if (result.error) {
    console.error('Error deleting edge:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data.deleteLearningPlanEdge;
}
