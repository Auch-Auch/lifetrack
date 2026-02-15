'use client'

import { create } from 'zustand'
import type { File, Directory, FileFilter } from '@/lib/files'
import {
  getFiles as apiGetFiles,
  getFile as apiGetFile,
  getDirectories as apiGetDirectories,
  getDirectory as apiGetDirectory,
  updateFile as apiUpdateFile,
  deleteFile as apiDeleteFile,
  moveFile as apiMoveFile,
  createDirectory as apiCreateDirectory,
  deleteDirectory as apiDeleteDirectory,
} from '@/lib/files'

type FileState = {
  // State
  files: File[]
  directories: Directory[]
  currentDirectory: Directory | null
  loading: boolean
  error: string | null
  totalCount: number
  
  // File Operations
  fetchFiles: (filter?: FileFilter, limit?: number, offset?: number) => Promise<void>
  getFileById: (id: string) => File | undefined
  updateFile: (id: string, input: {
    filename?: string
    directory?: string
    tags?: string[]
    description?: string
  }) => Promise<File>
  deleteFile: (id: string, removeFromStorage?: boolean) => Promise<void>
  moveFile: (id: string, newDirectory: string) => Promise<File>
  
  // Directory Operations
  fetchDirectories: (parentPath?: string) => Promise<void>
  fetchDirectory: (path: string) => Promise<void>
  createDirectory: (path: string) => Promise<Directory>
  deleteDirectory: (path: string, recursive?: boolean) => Promise<void>
  
  // Helper Operations
  searchFiles: (query: string, type?: string) => void
  getAllTags: () => string[]
  
  // Error handling
  clearError: () => void
}

export const useFileStore = create<FileState>()((set, get) => ({
  files: [],
  directories: [],
  currentDirectory: null,
  loading: false,
  error: null,
  totalCount: 0,
  
  clearError: () => set({ error: null }),
  
  fetchFiles: async (filter, limit = 50, offset = 0) => {
    try {
      set({ loading: true, error: null })
      const result = await apiGetFiles(filter, limit, offset)
      set({
        files: result.nodes,
        totalCount: result.totalCount,
        loading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch files',
        loading: false
      })
    }
  },
  
  getFileById: (id) => {
    return get().files.find(f => f.id === id)
  },
  
  updateFile: async (id, input) => {
    try {
      set({ loading: true, error: null })
      const updated = await apiUpdateFile(id, input)
      set(state => ({
        files: state.files.map(f => f.id === id ? updated : f),
        loading: false
      }))
      return updated
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update file',
        loading: false
      })
      throw error
    }
  },
  
  deleteFile: async (id, removeFromStorage = true) => {
    try {
      set({ loading: true, error: null })
      await apiDeleteFile(id, removeFromStorage)
      set(state => ({
        files: state.files.filter(f => f.id !== id),
        totalCount: state.totalCount - 1,
        loading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete file',
        loading: false
      })
      throw error
    }
  },
  
  moveFile: async (id, newDirectory) => {
    try {
      set({ loading: true, error: null })
      const updated = await apiMoveFile(id, newDirectory)
      set(state => ({
        files: state.files.map(f => f.id === id ? updated : f),
        loading: false
      }))
      return updated
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to move file',
        loading: false
      })
      throw error
    }
  },
  
  fetchDirectories: async (parentPath) => {
    try {
      set({ loading: true, error: null })
      const dirs = await apiGetDirectories(parentPath)
      set({ directories: dirs, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch directories',
        loading: false
      })
    }
  },
  
  fetchDirectory: async (path) => {
    try {
      set({ loading: true, error: null })
      const dir = await apiGetDirectory(path)
      set({ currentDirectory: dir, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch directory',
        loading: false
      })
    }
  },
  
  createDirectory: async (path) => {
    try {
      set({ loading: true, error: null })
      const dir = await apiCreateDirectory(path)
      set(state => ({
        directories: [...state.directories, dir],
        loading: false
      }))
      return dir
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create directory',
        loading: false
      })
      throw error
    }
  },
  
  deleteDirectory: async (path, recursive = false) => {
    try {
      set({ loading: true, error: null })
      await apiDeleteDirectory(path, recursive)
      set(state => ({
        directories: state.directories.filter(d => d.path !== path),
        loading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete directory',
        loading: false
      })
      throw error
    }
  },
  
  searchFiles: (query, type) => {
    const filter: FileFilter = {}
    if (query) {
      filter.searchQuery = query
    }
    if (type && type !== 'all') {
      filter.mimeType = type
    }
    get().fetchFiles(filter)
  },
  
  getAllTags: () => {
    const files = get().files
    const tagSet = new Set<string>()
    files.forEach(file => {
      file.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  },
}))
