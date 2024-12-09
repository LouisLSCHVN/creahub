export function useFileUpload() {
  const progress = ref<{ [key: string]: number }>({})

  /**
   * Upload multiple files with additional data (branchId and workshopId)
   * @param files Array of File objects to upload
   * @param url Endpoint URL for uploading files
   * @param branchId ID of the branch
   * @param workshopId ID of the workshop
   */
  const uploadFiles = (files: File[], url: string, branchId: number, workshopId: number) => {
    return Promise.all(files.map(file => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', url)

        // Suivi de la progression du téléchargement
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            progress.value[file.name] = Math.round((event.loaded / event.total) * 100)
          }
        })

        // Gestion de la réponse de la requête
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response)
          } else {
            reject(xhr.statusText)
          }
        }

        xhr.onerror = () => reject(xhr.statusText)

        // Création du FormData avec les fichiers et les identifiants supplémentaires
        const formData = new FormData()
        formData.append('file', file)
        formData.append('branchId', branchId.toString())
        formData.append('workshopId', workshopId.toString())
        xhr.send(formData)
      })
    }))
  }

  return {
    progress,
    uploadFiles
  }
}