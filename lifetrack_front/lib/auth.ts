'use client'

import { getClient, resetClient } from './helpers/api-client'
import { setToken, setUser, removeToken, User } from './helpers/auth'

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        name
        telegramId
        isService
        isActive
      }
    }
  }
`

const REGISTER_MUTATION = `
  mutation Register($email: String!, $password: String!, $name: String!) {
    register(email: $email, password: $password, name: $name) {
      token
      user {
        id
        email
        name
        telegramId
        isService
        isActive
      }
    }
  }
`

const ME_QUERY = `
  query Me {
    me {
      id
      email
      name
      telegramId
      isService
      isActive
    }
  }
`

export type AuthResponse = {
  token: string
  user: User
}

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = {
  email: string
  password: string
  name: string
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const client = getClient()
  
  const result = await client.mutation(LOGIN_MUTATION, input).toPromise()
  
  if (result.error) {
    throw new Error(result.error.message || 'Login failed')
  }
  
  if (!result.data?.login) {
    throw new Error('Invalid response from server')
  }
  
  const { token, user } = result.data.login
  
  // Store token and user in localStorage
  setToken(token)
  setUser(user)
  
  return { token, user }
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const client = getClient()
  
  const result = await client.mutation(REGISTER_MUTATION, input).toPromise()
  
  if (result.error) {
    throw new Error(result.error.message || 'Registration failed')
  }
  
  if (!result.data?.register) {
    throw new Error('Invalid response from server')
  }
  
  const { token, user } = result.data.register
  
  // Store token and user in localStorage
  setToken(token)
  setUser(user)
  
  return { token, user }
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getClient()
  
  const result = await client.query(ME_QUERY, {}).toPromise()
  
  if (result.error || !result.data?.me) {
    return null
  }
  
  const user = result.data.me
  setUser(user)
  
  return user
}

export async function logout(): Promise<void> {
  removeToken()
  resetClient()
  // Optionally redirect to login page
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}
