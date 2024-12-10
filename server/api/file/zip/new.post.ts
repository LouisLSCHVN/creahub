import JSZip from 'jszip'
import { eq, and, inArray, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    console.log('Début du traitement de l\'upload d\'un ZIP.')

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

        // Si pas de folderId fourni, on prend le root
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
            // Vérifier l'existence du folder
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
        const zip = await JSZip.loadAsync(zipBuffer)

        // On va créer une fonction récursive pour parcourir l'arborescence du ZIP
        // et créer les dossiers/fichiers dans la BDD.
        const createdFoldersCache = new Map<string, number>() // cache pour éviter de recréer des dossiers
        createdFoldersCache.set('', folderId) // Le dossier racine du ZIP (préfixe "") = folderId de base

        // Une fonction pour créer un dossier dans la DB et retourner son ID.
        async function ensureFolder(pathSegments: string[]): Promise<number> {
            // pathSegments = ['folderA', 'folderB', ...]
            let currentPath = ''
            let parentId = folderId!
            for (const segment of pathSegments) {
                currentPath = currentPath ? currentPath + '/' + segment : segment
                if (createdFoldersCache.has(currentPath)) {
                    parentId = createdFoldersCache.get(currentPath)!
                } else {
                    // Créer le dossier dans la DB
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

        // Fonction pour insérer un fichier. Réutilise la logique de versionnement.
        async function insertFile(
            fileName: string,
            fileType: string,
            fileBuffer: Buffer,
            targetFolderId: number
        ) {
            // Vérifier les versions existantes
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

            // Construction du chemin pour le blob
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

        // Parcourir le contenu du zip
        // zip.files est un object {filename: JSZipObject}
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) {
                // C'est un dossier. On le crée dans la DB si besoin
                const pathSegments = relativePath.split('/').filter(Boolean)
                await ensureFolder(pathSegments)
            } else {
                // C'est un fichier
                const pathSegments = relativePath.split('/')
                const fileName = pathSegments.pop()!
                const parentPathSegments = pathSegments.filter(Boolean)

                // Créer le dossier parent si besoin
                const targetFolderId = await ensureFolder(parentPathSegments)

                // Lire le contenu du fichier
                const fileBuffer = await zipEntry.async('nodebuffer')
                const fileType = '' // Vous pouvez essayer de déduire le type via 'mime-types' selon l'extension

                const insertedFile = await insertFile(fileName, fileType, fileBuffer, targetFolderId)
                fileResults.push(insertedFile)
            }
        }

        return {
            status: 200,
            message: 'ZIP decompressed and files uploaded successfully',
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
