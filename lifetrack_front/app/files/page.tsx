'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useFileStore } from '@/stores/fileStore'
import { useToast } from '@/stores/toastStore'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import {
  Search,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  Download,
  Trash2,
  FolderPlus,
  RefreshCw,
  X,
  Upload,
} from 'lucide-react'
import { formatFileSize, getFileIcon, getFiles, getDirectories } from '@/lib/files'
import type { File, Directory } from '@/lib/files'

interface TreeNode {
  path: string
  name: string
  type: 'folder' | 'file'
  file?: File
  children: TreeNode[]
  expanded: boolean
}

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [extensionFilter, setExtensionFilter] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']))
  const [draggedFile, setDraggedFile] = useState<File | null>(null)
  const [allFiles, setAllFiles] = useState<File[]>([])
  const [allDirectories, setAllDirectories] = useState<Directory[]>([])
  const [currentDirectory, setCurrentDirectory] = useState('/')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  const {
    loading,
    error,
    totalCount,
    deleteFile,
    moveFile,
    createDirectory,
    clearError,
  } = useFileStore()
  
  const toast = useToast()
  
  useEffect(() => {
    loadAllFiles()
  }, [])
  
  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, toast, clearError])
  
  const loadAllFiles = async () => {
    try {
      // Fetch all files and directories
      const [filesResult, directoriesResult] = await Promise.all([
        getFiles(undefined, 1000, 0),
        getDirectories()
      ])
      setAllFiles(filesResult.nodes)
      setAllDirectories(directoriesResult)
    } catch (err) {
      toast.error('Failed to load files')
    }
  }
  
  // Filter files based on search and extension
  const filteredFiles = useMemo(() => {
    let filtered = [...allFiles]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(file => 
        file.filename.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query) ||
        file.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    if (extensionFilter) {
      const ext = extensionFilter.startsWith('.') ? extensionFilter : `.${extensionFilter}`
      filtered = filtered.filter(file => 
        file.filename.toLowerCase().endsWith(ext.toLowerCase())
      )
    }
    
    return filtered
  }, [allFiles, searchQuery, extensionFilter])
  
  // Build tree structure from filtered files and directories
  const treeStructure = useMemo(() => {
    const root: TreeNode = {
      path: '/',
      name: 'Root',
      type: 'folder',
      children: [],
      expanded: expandedFolders.has('/')
    }
    
    const folderMap = new Map<string, TreeNode>()
    folderMap.set('/', root)
    
    // Create all folder nodes from directories API
    allDirectories.forEach(dir => {
      const dirPath = dir.path
      if (dirPath === '/') return // Skip root
      
      const parts = dirPath.split('/').filter(Boolean)
      let currentPath = ''
      
      parts.forEach((part, index) => {
        const parentPath = currentPath || '/'
        currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`
        
        if (!folderMap.has(currentPath)) {
          const folderNode: TreeNode = {
            path: currentPath,
            name: part,
            type: 'folder',
            children: [],
            expanded: expandedFolders.has(currentPath)
          }
          folderMap.set(currentPath, folderNode)
          
          const parent = folderMap.get(parentPath)
          if (parent) {
            parent.children.push(folderNode)
          }
        }
      })
    })
    
    // Also create folder nodes from file directories (in case directory API didn't return them)
    filteredFiles.forEach(file => {
      const dir = file.directory || '/'
      if (!folderMap.has(dir) && dir !== '/') {
        const parts = dir.split('/').filter(Boolean)
        let currentPath = ''
        
        parts.forEach((part, index) => {
          const parentPath = currentPath || '/'
          currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`
          
          if (!folderMap.has(currentPath)) {
            const folderNode: TreeNode = {
              path: currentPath,
              name: part,
              type: 'folder',
              children: [],
              expanded: expandedFolders.has(currentPath)
            }
            folderMap.set(currentPath, folderNode)
            
            const parent = folderMap.get(parentPath)
            if (parent) {
              parent.children.push(folderNode)
            }
          }
        })
      }
    })
    
    // Add file nodes
    filteredFiles.forEach(file => {
      const dir = file.directory || '/'
      const folder = folderMap.get(dir)
      
      if (folder) {
        folder.children.push({
          path: file.id,
          name: file.filename,
          type: 'file',
          file: file,
          children: [],
          expanded: false
        })
      }
    })
    
    // Sort children: folders first, then files, both alphabetically
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      node.children.forEach(sortChildren)
    }
    sortChildren(root)
    
    return root
  }, [filteredFiles, allDirectories, expandedFolders])
  
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
        // Set as current directory when expanding
        setCurrentDirectory(path)
      }
      return next
    })
  }
  
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty')
      return
    }
    
    const fullPath = `/${newFolderName}`
    
    try {
      await createDirectory(fullPath)
      toast.success('Folder created successfully')
      setShowNewFolderDialog(false)
      setNewFolderName('')
      
      // Expand the newly created folder
      setExpandedFolders(prev => new Set(prev).add(fullPath))
      
      // Reload files and directories
      await loadAllFiles()
    } catch (err) {
      toast.error('Failed to create folder')
    }
  }
  
  const handleDelete = async () => {
    if (!selectedFile) return
    
    try {
      await deleteFile(selectedFile.id, true)
      toast.success('File deleted successfully')
      setShowDeleteDialog(false)
      setSelectedFile(null)
      loadAllFiles()
    } catch (err) {
      toast.error('Failed to delete file')
    }
  }
  
  const handleDownload = async (file: File) => {
    try {
      // Get auth token
      const token = localStorage.getItem('lifetrack_auth_token')
      if (!token) {
        toast.error('Not authenticated')
        return
      }

      // Make request to download endpoint via Next.js API proxy
      const response = await fetch(`/api/files/download/${file.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      // Create blob from response
      const blob = await response.blob()
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Downloaded ${file.filename}`)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download file')
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const file = files[0] // Upload one file at a time
      const formData = new FormData()
      formData.append('file', file)
      formData.append('directory', currentDirectory)

      const token = localStorage.getItem('lifetrack_auth_token')
      if (!token) {
        toast.error('Not authenticated')
        return
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      toast.success(`File "${result.filename}" uploaded successfully`)
      
      // Reload files to show the new file
      await loadAllFiles()
    } catch (err) {
      console.error('Upload error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  const handleDragStart = (e: React.DragEvent, file: File) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedFile(file)
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const handleDrop = async (e: React.DragEvent, targetPath: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedFile) return
    
    try {
      await moveFile(draggedFile.id, targetPath)
      toast.success(`Moved ${draggedFile.filename} to ${targetPath}`)
      setDraggedFile(null)
      loadAllFiles()
    } catch (err) {
      toast.error('Failed to move file')
    }
  }
  
  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    if (node.type === 'file' && node.file) {
      return (
        <div
          key={node.path}
          draggable
          onDragStart={(e) => handleDragStart(e, node.file!)}
          className="flex items-center gap-2 py-2 px-3 hover:bg-[hsl(var(--muted)_/_0.3)] rounded cursor-move group"
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          <div className="text-2xl">{getFileIcon(node.file.mimeType)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate text-sm">{node.name}</p>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {formatFileSize(node.file.fileSize)}
              </span>
            </div>
            {node.file.tags.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {node.file.tags.map(tag => (
                  <Badge key={tag} variant="default">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(node.file!)}
            >
              <Download size={14} />
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setSelectedFile(node.file!)
                setShowDeleteDialog(true)
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      )
    }
    
    if (node.type === 'folder') {
      const isCurrentDir = node.path === currentDirectory
      return (
        <div key={node.path}>
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, node.path)}
            className={`flex items-center gap-2 py-2 px-3 rounded cursor-pointer ${
              isCurrentDir 
                ? 'bg-[hsl(var(--primary)_/_0.15)] hover:bg-[hsl(var(--primary)_/_0.2)]' 
                : 'hover:bg-[hsl(var(--muted)_/_0.3)]'
            }`}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            {node.expanded ? (
              <ChevronDown size={16} className="text-[hsl(var(--muted-foreground))]" />
            ) : (
              <ChevronRight size={16} className="text-[hsl(var(--muted-foreground))]" />
            )}
            {node.expanded ? (
              <FolderOpen size={20} className="text-[hsl(var(--primary))]" />
            ) : (
              <Folder size={20} className="text-[hsl(var(--primary))]" />
            )}
            <span className="font-medium">{node.name}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              ({node.children.length})
            </span>
          </div>
          {node.expanded && (
            <div>
              {node.children.map(child => renderTreeNode(child, level + 1))}
            </div>
          )}
        </div>
      )
    }
    
    return null
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            {filteredFiles.length} files {searchQuery || extensionFilter ? '(filtered)' : 'total'}
          </p>
          {currentDirectory !== '/' && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="info">
                <Folder size={12} className="mr-1" />
                Upload to: {currentDirectory}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={loadAllFiles}
            loading={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowNewFolderDialog(true)}
          >
            <FolderPlus size={16} />
            New Folder
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
            disabled={uploading}
          >
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>
      
      {/* Search and Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search files by name, description, or tags..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Filter by extension (e.g., .txt, .pdf)"
                value={extensionFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtensionFilter(e.target.value)}
              />
            </div>
          </div>
          {(searchQuery || extensionFilter) && (
            <div className="mt-3 flex gap-2 items-center">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">Active filters:</span>
              {searchQuery && (
                <Badge variant="info">
                  Search: {searchQuery}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-[hsl(var(--danger))]"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              )}
              {extensionFilter && (
                <Badge variant="info">
                  Extension: {extensionFilter}
                  <button
                    onClick={() => setExtensionFilter('')}
                    className="ml-1 hover:text-[hsl(var(--danger))]"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tree View */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">File Tree</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Click folders to expand/collapse. Drag files to move them between folders.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading && allFiles.length === 0 ? (
            <div className="py-8 text-center text-[hsl(var(--muted-foreground))]">
              Loading files...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-8 text-center text-[hsl(var(--muted-foreground))]">
              {searchQuery || extensionFilter ? 'No files match your filters' : 'No files uploaded yet'}
            </div>
          ) : (
            <div className="py-2">
              {renderTreeNode(treeStructure)}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewFolderDialog(false)}>
          <Card className="w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create New Folder</h3>
                <button onClick={() => setShowNewFolderDialog(false)}>
                  <X size={20} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Folder Name"
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleCreateFolder()}
              />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Folder will be created at: /{newFolderName}
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setShowNewFolderDialog(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCreateFolder}>
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Delete File Dialog */}
      {showDeleteDialog && selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteDialog(false)}>
          <Card className="w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[hsl(var(--danger))]">Delete File</h3>
                <button onClick={() => setShowDeleteDialog(false)}>
                  <X size={20} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Are you sure you want to delete <span className="font-medium">{selectedFile.filename}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
