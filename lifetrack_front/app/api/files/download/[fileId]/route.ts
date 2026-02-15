import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { fileId } = await context.params

    // Forward Authorization header
    const headers: HeadersInit = {}
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    // Fetch file from backend
    const response = await fetch(`${BACKEND_URL}/files/download/${fileId}`, {
      headers,
    })

    if (!response.ok) {
      return new NextResponse('File not found', { status: response.status })
    }

    // Get the file data and headers
    const blob = await response.blob()
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream'
    const contentDisposition = response.headers.get('Content-Disposition') || 'attachment'

    // Return the file with proper headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    })
  } catch (error) {
    console.error('File download proxy error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
