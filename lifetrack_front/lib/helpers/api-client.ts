'use client'

import { Client, cacheExchange, fetchExchange, makeOperation } from 'urql'
import { authExchange } from '@urql/exchange-auth'
import { getToken, removeToken } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/graphql'

// Create urql client with auth support
export const createClient = () => {
  return new Client({
    url: API_URL,
    fetch: fetch.bind(globalThis),
    exchanges: [
      cacheExchange,
      authExchange(async (utils) => {
        return {
          addAuthToOperation(operation) {
            const token = getToken()
            if (!token) return operation

            const fetchOptions = typeof operation.context.fetchOptions === 'function' 
              ? operation.context.fetchOptions() 
              : operation.context.fetchOptions || {}

            return makeOperation(operation.kind, operation, {
              ...operation.context,
              fetchOptions: {
                ...fetchOptions,
                headers: {
                  ...(fetchOptions.headers || {}),
                  Authorization: `Bearer ${token}`,
                },
              },
            })
          },
          didAuthError(error) {
            return error.graphQLErrors.some(
              (e) => e.extensions?.code === 'UNAUTHORIZED' || e.message.includes('unauthorized')
            )
          },
          async refreshAuth() {
            // If auth fails, logout user
            removeToken()
          },
        }
      }),
      fetchExchange,
    ],
  })
}

// Singleton client instance
let clientInstance: Client | null = null

export const getClient = () => {
  if (!clientInstance) {
    clientInstance = createClient()
  }
  return clientInstance
}

// Reset client (useful after logout)
export const resetClient = () => {
  clientInstance = null
}
