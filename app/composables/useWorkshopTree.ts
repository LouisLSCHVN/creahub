interface InsertFolder {
  title: string
  description: string
  branchId: number
  parentFolderId?: number
  icon?: string
  tags?: string[]
}

export function useWorkshopTree() {
  const createFolder = async (payload: InsertFolder) => {
    try {
      if(!payload.parentFolderId) payload.parentFolderId = 0
      const response = await $fetch('/api/folder/new', {
        method: 'POST',
        body: payload
      }) as HttpResponseOptions

      return response.data
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error)
      throw error
    }
  }

  return {
    createFolder
  }
}