import { gql } from 'urql';
import type { Client } from 'urql';
import { getClient } from './helpers/api-client';

// GraphQL Types
export interface File {
  id: string;
  filename: string;
  originalFilename: string;
  directory: string;
  mimeType: string;
  fileSize: number;
  description?: string;
  tags: string[];
  telegramFileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Directory {
  path: string;
  parent?: string;
  subdirectories: string[];
  fileCount: number;
}

export interface FileConnection {
  nodes: File[];
  totalCount: number;
  hasMore: boolean;
}

export interface FileFilter {
  directory?: string;
  mimeType?: string;
  tags?: string[];
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

// GraphQL Queries
const FILES_QUERY = gql`
  query Files($filter: FileFilter, $limit: Int, $offset: Int) {
    files(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        id
        filename
        originalFilename
        directory
        mimeType
        fileSize
        description
        tags
        telegramFileId
        createdAt
        updatedAt
      }
      totalCount
      hasMore
    }
  }
`;

const FILE_QUERY = gql`
  query File($id: UUID!) {
    file(id: $id) {
      id
      filename
      originalFilename
      directory
      mimeType
      fileSize
      description
      tags
      telegramFileId
      storagePath
      createdAt
      updatedAt
    }
  }
`;

const DIRECTORIES_QUERY = gql`
  query Directories($parentPath: String) {
    directories(parentPath: $parentPath) {
      path
      parent
      subdirectories
      fileCount
    }
  }
`;

const DIRECTORY_QUERY = gql`
  query Directory($path: String!) {
    directory(path: $path) {
      path
      parent
      subdirectories
      fileCount
    }
  }
`;

const UPDATE_FILE_MUTATION = gql`
  mutation UpdateFile($id: UUID!, $input: UpdateFileInput!) {
    updateFile(id: $id, input: $input) {
      id
      filename
      originalFilename
      directory
      description
      tags
      updatedAt
    }
  }
`;

const DELETE_FILE_MUTATION = gql`
  mutation DeleteFile($id: UUID!, $removeFromStorage: Boolean) {
    deleteFile(id: $id, removeFromStorage: $removeFromStorage)
  }
`;

const MOVE_FILE_MUTATION = gql`
  mutation MoveFile($id: UUID!, $newDirectory: String!) {
    moveFile(id: $id, newDirectory: $newDirectory) {
      id
      directory
      updatedAt
    }
  }
`;

const CREATE_DIRECTORY_MUTATION = gql`
  mutation CreateDirectory($path: String!) {
    createDirectory(path: $path) {
      path
      subdirectories
      fileCount
    }
  }
`;

const DELETE_DIRECTORY_MUTATION = gql`
  mutation DeleteDirectory($path: String!, $recursive: Boolean) {
    deleteDirectory(path: $path, recursive: $recursive)
  }
`;

// API Functions
export async function getFiles(
  filter?: FileFilter,
  limit?: number,
  offset?: number,
  client?: Client
): Promise<FileConnection> {
  const c = client || getClient();
  const result = await c.query(FILES_QUERY, {
    filter,
    limit: limit || 50,
    offset: offset || 0,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.files;
}

export async function getFile(id: string, client?: Client): Promise<File> {
  const c = client || getClient();
  const result = await c.query(FILE_QUERY, { id });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.file;
}

export async function getDirectories(
  parentPath?: string,
  client?: Client
): Promise<Directory[]> {
  const c = client || getClient();
  const result = await c.query(DIRECTORIES_QUERY, { parentPath });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.directories;
}

export async function getDirectory(
  path: string,
  client?: Client
): Promise<Directory> {
  const c = client || getClient();
  const result = await c.query(DIRECTORY_QUERY, { path });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.directory;
}

export async function updateFile(
  id: string,
  input: {
    filename?: string;
    directory?: string;
    tags?: string[];
    description?: string;
  },
  client?: Client
): Promise<File> {
  const c = client || getClient();
  const result = await c.mutation(UPDATE_FILE_MUTATION, { id, input });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.updateFile;
}

export async function deleteFile(
  id: string,
  removeFromStorage: boolean = true,
  client?: Client
): Promise<boolean> {
  const c = client || getClient();
  const result = await c.mutation(DELETE_FILE_MUTATION, {
    id,
    removeFromStorage,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.deleteFile;
}

export async function moveFile(
  id: string,
  newDirectory: string,
  client?: Client
): Promise<File> {
  const c = client || getClient();
  const result = await c.mutation(MOVE_FILE_MUTATION, {
    id,
    newDirectory,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.moveFile;
}

export async function createDirectory(
  path: string,
  client?: Client
): Promise<Directory> {
  const c = client || getClient();
  const result = await c.mutation(CREATE_DIRECTORY_MUTATION, { path });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.createDirectory;
}

export async function deleteDirectory(
  path: string,
  recursive: boolean = false,
  client?: Client
): Promise<boolean> {
  const c = client || getClient();
  const result = await c.mutation(DELETE_DIRECTORY_MUTATION, {
    path,
    recursive,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.deleteDirectory;
}

// Helper functions
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📄';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return '📽️';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  if (mimeType.includes('text')) return '📝';
  return '📎';
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
