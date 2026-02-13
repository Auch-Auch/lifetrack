'use client'

import { getClient } from './helpers/api-client'

export type Skill = {
  id: string
  name: string
  level?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type CreateSkillInput = {
  name: string
  level?: string
  notes?: string
}

export type UpdateSkillInput = {
  name?: string
  level?: string
  notes?: string
}

// GraphQL Queries
const GET_SKILLS_QUERY = `
  query GetSkills {
    skills {
      id
      name
      level
      notes
      createdAt
      updatedAt
    }
  }
`

const GET_SKILL_QUERY = `
  query GetSkill($id: UUID!) {
    skill(id: $id) {
      id
      name
      level
      notes
      createdAt
      updatedAt
    }
  }
`

const CREATE_SKILL_MUTATION = `
  mutation CreateSkill($input: CreateSkillInput!) {
    createSkill(input: $input) {
      id
      name
      level
      notes
      createdAt
      updatedAt
    }
  }
`

const UPDATE_SKILL_MUTATION = `
  mutation UpdateSkill($id: UUID!, $input: UpdateSkillInput!) {
    updateSkill(id: $id, input: $input) {
      id
      name
      level
      notes
      createdAt
      updatedAt
    }
  }
`

const DELETE_SKILL_MUTATION = `
  mutation DeleteSkill($id: UUID!) {
    deleteSkill(id: $id)
  }
`

// API Functions
export async function getSkills(): Promise<Skill[]> {
  const client = getClient()
  const result = await client.query(GET_SKILLS_QUERY, {}).toPromise()
  
  if (result.error) {
    console.error('Error fetching skills:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.skills || []
}

export async function getSkillById(id: string): Promise<Skill | null> {
  const client = getClient()
  const result = await client.query(GET_SKILL_QUERY, { id }).toPromise()
  
  if (result.error) {
    console.error('Error fetching skill:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data?.skill || null
}

export async function createSkill(input: CreateSkillInput): Promise<Skill> {
  const client = getClient()
  const result = await client.mutation(CREATE_SKILL_MUTATION, { input }).toPromise()
  
  if (result.error) {
    console.error('Error creating skill:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.createSkill
}

export async function updateSkill(id: string, input: UpdateSkillInput): Promise<Skill> {
  const client = getClient()
  const result = await client.mutation(UPDATE_SKILL_MUTATION, { id, input }).toPromise()
  
  if (result.error) {
    console.error('Error updating skill:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.updateSkill
}

export async function deleteSkill(id: string): Promise<boolean> {
  const client = getClient()
  const result = await client.mutation(DELETE_SKILL_MUTATION, { id }).toPromise()
  
  if (result.error) {
    console.error('Error deleting skill:', result.error)
    throw new Error(result.error.message)
  }
  
  return result.data.deleteSkill
}
