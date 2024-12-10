import { eq, and, desc } from 'drizzle-orm'

// Signatures ZIP en hexa (4 octets)
const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_DIR_SIGNATURE = 0x02014b50
const LOCAL_FILE_SIGNATURE = 0x04034b50

interface ZipCentralFile {
  fileName: string;
  localHeaderOffset: number;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
}

export default defineEventHandler(async (event) => {
  console.log('Début du traitement du ZIP avec support DEFLATE.')

  try {
    const { user } = await getUserSession(event)
    if (!user) {
      return createHttpResponse({ status: 401, message: 'Unauthorized' })
    }

    const body = await readMultipartFormData(event)
    if (!body) {
      return createHttpResponse({ status: 400, message: 'No data provided' })
    }

    const branchIdRaw = body.find(item => item.name === 'branchId')?.data
    const workshopIdRaw = body.find(item => item.name === 'workshopId')?.data
    let folderIdRaw = body.find(item => item.name === 'folderId')?.data
    const zipItem = body.find(item => item.name === 'file' && item.filename && item.data)

    if (!zipItem) {
      return createHttpResponse({ status: 400, message: 'No zip file provided' })
    }

    const branchId = branchIdRaw ? parseInt(Buffer.from(branchIdRaw).toString()) : NaN
    const workshopId = workshopIdRaw ? parseInt(Buffer.from(workshopIdRaw).toString()) : NaN

    if (isNaN(branchId) || isNaN(workshopId)) {
      return createHttpResponse({ status: 400, message: 'Missing or invalid required fields (branchId, workshopId)' })
    }

    let folderId: number | null
    if (folderIdRaw && folderIdRaw.length > 0) {
      folderId = Number(Buffer.from(folderIdRaw).toString())
    } else {
      folderId = null
    }

    const db = useDrizzle();

    const [branch, workshop] = await Promise.all([
      db.select().from(tables.branch).where(eq(tables.branch.id, branchId)).get(),
      db.select().from(tables.workshop).where(eq(tables.workshop.id, workshopId)).get()
    ])

    if (!branch) {
      return createHttpResponse({ status: 404, message: 'Branch not found' })
    }
    if (!workshop) {
      return createHttpResponse({ status: 404, message: 'Workshop not found' })
    }

    const workshopOwner = await db.select().from(tables.user).where(eq(tables.user.id, workshop.ownerId)).get()
    if (!workshopOwner) {
      return createHttpResponse({ status: 404, message: 'Workshop owner not found' })
    }

    // Récupérer le dossier root si folderId non spécifié
    if (!folderId) {
      const rootFolder = await db
        .select()
        .from(tables.folder)
        .where(and(
          eq(tables.folder.name, 'root'),
          eq(tables.folder.branchId, branchId)
        ))
        .get()
      if (!rootFolder) {
        return createHttpResponse({ status: 400, message: 'Root folder not found' })
      }
      folderId = rootFolder.id
    } else {
      const folderExists = await db
        .select({ id: tables.folder.id })
        .from(tables.folder)
        .where(eq(tables.folder.id, folderId))
        .get()
      if (!folderExists) {
        return createHttpResponse({ status: 400, message: 'Invalid folder' })
      }
    }

    const zipBuffer = zipItem.data as Buffer

    // Trouver l'End Of Central Directory (EOCD)
    const eocdOffset = findEOCD(zipBuffer)
    if (eocdOffset < 0) {
      return createHttpResponse({ status: 400, message: 'Invalid ZIP format: EOCD not found' })
    }

    // Lire le EOCD
    const { centralDirOffset, totalEntries } = readEOCD(zipBuffer, eocdOffset)
    // Lire la central directory
    const files = readCentralDirectory(zipBuffer, centralDirOffset, totalEntries)

    // Parcourir les fichiers, créer dossiers et extraire
    const createdFoldersCache = new Map<string, number>()
    createdFoldersCache.set('', folderId!)

    async function ensureFolder(pathSegments: string[]): Promise<number> {
      let currentPath = ''
      let parentId = folderId!
      for (const segment of pathSegments) {
        currentPath = currentPath ? currentPath + '/' + segment : segment
        if (createdFoldersCache.has(currentPath)) {
          parentId = createdFoldersCache.get(currentPath)!
        } else {
          const inserted = await db.insert(tables.folder).values({
            branchId: branchId,
            name: segment,
            userId: user!.id,
            parentFolderId: parentId,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning({ id: tables.folder.id }).get()

          createdFoldersCache.set(currentPath, inserted.id)
          parentId = inserted.id
        }
      }
      return parentId
    }

    async function insertFile(
      fileName: string,
      fileType: string,
      fileBuffer: Buffer,
      targetFolderId: number
    ) {
      const existingFiles = await db.select().from(tables.file)
        .where(
          and(
            eq(tables.file.branchId, branchId),
            eq(tables.file.folderId, targetFolderId),
            eq(tables.file.name, fileName)
          )
        )
        .orderBy(desc(tables.file.version))
        .all()

      let version = 1
      let previousVersionId = null
      if (existingFiles.length > 0) {
        version = existingFiles[0].version + 1
        previousVersionId = existingFiles[0].id
      }

      const fileBlob = new Blob([fileBuffer], { type: fileType })
      ensureBlob(fileBlob, { maxSize: '1GB' })

      const folderPath = await getFolderPath(db, targetFolderId)
      const extIndex = fileName.lastIndexOf('.')
      const baseName = extIndex === -1 ? fileName : fileName.substring(0, extIndex)
      const ext = extIndex === -1 ? '' : fileName.substring(extIndex)
      const versionedFileName = `${baseName}_v${version}${ext}`

      const blobPath = `${workshopOwner!.name}/${workshop!.name}/${branch!.name}/${folderPath ? folderPath + '/' : ''}${versionedFileName}`
      const blobResult = await hubBlob().put(blobPath, fileBlob, { addRandomSuffix: false })

      let fileCategory: 'image' | 'video' | 'link' = 'link'
      if (fileType.startsWith('image/')) fileCategory = 'image'
      else if (fileType.startsWith('video/')) fileCategory = 'video'

      const newFile = {
        workshopId: workshopId,
        branchId: branchId,
        name: fileName,
        path: blobResult.pathname,
        folderId: targetFolderId,
        fileType: fileCategory,
        size: fileBuffer.length,
        version,
        previousVersionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.insert(tables.file).values(newFile)
      return newFile
    }

    const fileResults: any[] = []

    for (const f of files) {
      const pathSegments = f.fileName.split('/').filter(Boolean)
      if (f.fileName.endsWith('/')) {
        // dossier
        await ensureFolder(pathSegments)
        continue
      } else {
        const fileName = pathSegments.pop()!
        const targetFolderId = await ensureFolder(pathSegments)

        let fileData = extractFileData(zipBuffer, f)
        // Gérer la compression
        if (f.compressionMethod === 8) {
          // DEFLATE -> on décompresse
          fileData = await decompressDeflate(fileData)
        } else if (f.compressionMethod !== 0) {
          console.warn(`Skipping ${f.fileName}, compressionMethod=${f.compressionMethod} not supported`)
          continue
        }

        const fileType = '' // Déduisez via l'extension si besoin
        const insertedFile = await insertFile(fileName, fileType, fileData, targetFolderId)
        fileResults.push(insertedFile)
      }
    }

    return {
      status: 200,
      message: 'ZIP decompressed (stored and deflate) and files uploaded successfully',
      data: fileResults
    }

  } catch (error) {
    console.error('Erreur lors du traitement du ZIP :', error)
    return createHttpResponse({ status: 500, message: 'Internal Server Error' })
  }
})

async function getFolderPath(db: ReturnType<typeof useDrizzle>, folderId: number): Promise<string> {
  const folders: string[] = []
  let currentFolderId = folderId
  while (currentFolderId) {
    const folder = await db.select().from(tables.folder)
        .where(eq(tables.folder.id, currentFolderId))
        .get()
    if (!folder) break
    if (folder.name !== 'root') {
      folders.push(folder.name)
    }
    currentFolderId = folder.parentFolderId!
  }
  return folders.reverse().join('/')
}

function findEOCD(buffer: Buffer): number {
  const length = buffer.length
  for (let i = length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      return i
    }
  }
  return -1
}

function readEOCD(buffer: Buffer, offset: number) {
  const totalEntries = buffer.readUInt16LE(offset + 10)
  const centralDirOffset = buffer.readUInt32LE(offset + 16)
  return { totalEntries, centralDirOffset }
}

function readCentralDirectory(buffer: Buffer, cdOffset: number, totalEntries: number): ZipCentralFile[] {
  const files: ZipCentralFile[] = []
  let offset = cdOffset
  for (let i = 0; i < totalEntries; i++) {
    const sig = buffer.readUInt32LE(offset)
    if (sig !== CENTRAL_DIR_SIGNATURE) {
      throw new Error('Invalid central directory signature')
    }
    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const uncompressedSize = buffer.readUInt32LE(offset + 24)
    const fileNameLen = buffer.readUInt16LE(offset + 28)
    const extraLen = buffer.readUInt16LE(offset + 30)
    const commentLen = buffer.readUInt16LE(offset + 32)
    const localHeaderRelOffset = buffer.readUInt32LE(offset + 42)

    const fileName = buffer.slice(offset + 46, offset + 46 + fileNameLen).toString('utf-8')

    files.push({
      fileName,
      localHeaderOffset: localHeaderRelOffset,
      compressedSize,
      uncompressedSize,
      compressionMethod
    })

    offset += 46 + fileNameLen + extraLen + commentLen
  }
  return files
}

function extractFileData(buffer: Buffer, file: ZipCentralFile): Buffer {
  const sig = buffer.readUInt32LE(file.localHeaderOffset)
  if (sig !== LOCAL_FILE_SIGNATURE) {
    throw new Error('Invalid local file header signature')
  }
  const fileNameLen = buffer.readUInt16LE(file.localHeaderOffset + 26)
  const extraFieldLen = buffer.readUInt16LE(file.localHeaderOffset + 28)
  const dataStart = file.localHeaderOffset + 30 + fileNameLen + extraFieldLen
  const dataEnd = dataStart + file.compressedSize
  return buffer.slice(dataStart, dataEnd)
}

// Décompression DEFLATE à l'aide de DecompressionStream (supporté par Cloudflare Workers)
async function decompressDeflate(fileData: Buffer): Promise<Buffer> {
  const blob = new Blob([fileData])
  // 'deflate-raw' correspond au mode DEFLATE brut utilisé par ZIP
  const ds = new DecompressionStream('deflate-raw')
  const decompressedArrayBuffer = await new Response(blob.stream().pipeThrough(ds)).arrayBuffer()
  return Buffer.from(new Uint8Array(decompressedArrayBuffer))
}
