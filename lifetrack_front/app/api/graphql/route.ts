import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080/query'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Forward Authorization header if present
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers,
      body,
    })

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('GraphQL proxy error:', error)
    return NextResponse.json(
      { errors: [{ message: 'Internal server error' }] },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for GraphQL queries
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')
    const variables = url.searchParams.get('variables')
    
    if (!query) {
      return NextResponse.json(
        { errors: [{ message: 'Query parameter is required' }] },
        { status: 400 }
      )
    }

    const params = new URLSearchParams()
    params.append('query', query)
    if (variables) {
      params.append('variables', variables)
    }

    const headers: HeadersInit = {}
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const response = await fetch(`${BACKEND_URL}?${params}`, {
      method: 'GET',
      headers,
    })

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('GraphQL proxy error:', error)
    return NextResponse.json(
      { errors: [{ message: 'Internal server error' }] },
      { status: 500 }
    )
  }
}
