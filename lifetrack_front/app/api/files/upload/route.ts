import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const directory = formData.get('directory') as string || '/'
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Get auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read file as buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Prepare storage path (data/files/)
    const storageRoot = process.env.FILE_STORAGE_PATH || join(process.cwd(), '../data/files')
    
    // Ensure storage directory exists
    if (!existsSync(storageRoot)) {
      await mkdir(storageRoot, { recursive: true })
    }

    // Generate unique filename if file exists
    let filename = file.name
    let storagePath = join(storageRoot, filename)
    let counter = 1
    
    while (existsSync(storagePath)) {
      const ext = filename.substring(filename.lastIndexOf('.'))
      const base = filename.substring(0, filename.lastIndexOf('.'))
      filename = `${base}_${counter}${ext}`
      storagePath = join(storageRoot, filename)
      counter++
    }

    // Write file to disk
    await writeFile(storagePath, buffer)

    // Create file record in backend via GraphQL
    const mutation = `
      mutation CreateFile($input: CreateFileInput!) {
        createFile(input: $input) {
          id
          filename
          directory
          originalFilename
          mimeType
          fileSize
          createdAt
        }
      }
    `

    const graphqlResponse = await fetch(`${BACKEND_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            filename: file.name,
            directory: directory,
            originalFilename: file.name,
            mimeType: file.type || 'application/octet-stream',
            fileSize: file.size,
            storagePath: filename, // Relative path
            tags: [],
            description: null,
          },
        },
      }),
    })

    const result = await graphqlResponse.json()

    if (result.errors) {
      // Clean up file if database insert failed
      const fs = await import('fs/promises')
      await fs.unlink(storagePath).catch(() => {})
      
      return NextResponse.json(
        { error: result.errors[0]?.message || 'Failed to create file record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      file: result.data.createFile,
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
