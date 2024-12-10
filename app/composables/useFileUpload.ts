export function useFileUpload() {
  const progress = ref<{ [key: string]: number }>({})

  const uploadFiles = (files: File[], url: string, branchId: number, workshopId: number, folderId?: number) => {
    return new Promise((resolve, reject) => {
      // Calcul de la taille totale de tous les fichiers
      const totalSize = files.reduce((sum, file) => sum + file.size, 0)

      // Initialiser la progression des fichiers à 0
      files.forEach(file => {
        progress.value[file.name] = 0
      })

      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)

      // Suivi de la progression globale
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const globalRatio = event.loaded / event.total
          let cumulative = 0
          for (const file of files) {
            const fileRatio = ((cumulative + file.size) <= (totalSize * globalRatio))
              ? 1
              : Math.max(0, (totalSize * globalRatio - cumulative) / file.size)

            progress.value[file.name] = Math.round(fileRatio * 100)

            cumulative += file.size
          }
        }
      })

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response)
        } else {
          reject(xhr.statusText)
        }
      }

      xhr.onerror = () => reject(xhr.statusText)

      // Création du FormData avec tous les fichiers et les identifiants supplémentaires
      const formData = new FormData()
      for (const file of files) {
        formData.append('file', file)
      }
      formData.append('branchId', branchId.toString())
      formData.append('workshopId', workshopId.toString())
      if (folderId !== undefined) {
        formData.append('folderId', folderId.toString())
      }

      xhr.send(formData)
    })
  }

  const uploadZip = (zipFile: File, url: string, branchId: number, workshopId: number, folderId?: number) => {
    return new Promise((resolve, reject) => {
      // On gère ici la progression d’un seul fichier ZIP
      progress.value[zipFile.name] = 0

      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const ratio = event.loaded / event.total
          progress.value[zipFile.name] = Math.round(ratio * 100)
        }
      })

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response)
        } else {
          reject(xhr.statusText)
        }
      }

      xhr.onerror = () => reject(xhr.statusText)

      // Création du FormData avec le fichier ZIP et les identifiants supplémentaires
      const formData = new FormData()
      formData.append('file', zipFile)
      formData.append('branchId', branchId.toString())
      formData.append('workshopId', workshopId.toString())
      if (folderId !== undefined) {
        formData.append('folderId', folderId.toString())
      }

      xhr.send(formData)
    })
  }

  return {
    progress,
    uploadFiles,
    uploadZip
  }
}
