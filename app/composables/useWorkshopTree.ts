interface WorkshopData extends Workshop {
  branch: Branch;
  tree: TreeNode[];
}

type TreeNode = FolderNode | FileNode;

interface FolderNode extends Folder {
  type: 'folder';
  children: TreeNode[];
}

interface FileNode extends File {
  type: 'file';
}

export function useWorkshopTree() {
  const { branchParam, username, workshopName } = useWorkshopState()

  const tree = useState<TreeNode[] | null>(`${username}/${workshopName}/${branchParam}`, () => null)

  const createFolder = async (payload: InsertFolder) => {
    try {
      if(!payload.parentFolderId) {
        payload.parentFolderId = 0
      }
      const response = await $fetch<HttpResponseOptions>('/api/folder/new', {
        method: 'POST',
        body: payload
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error)
      throw error
    }
  }

  const createFiles = async () => {
    // Logique d'upload de fichiers
  }

  // Méthode existante : charge la racine de la branche
  const fetchBranchTree = async (user: string, workshopName: string, branchName: string) => {
    try {
      const res = await $fetch(`/api/get/${user}/${workshopName}/${branchName}/`)
      return (res as HttpResponseOptions).data.tree as TreeNode[]
    } catch (error) {
      console.error('Error while fetching tree:', error)
      throw error
    }
  }

  // Nouvelle méthode pour récupérer un chemin spécifique à l'intérieur de la branche
  // pathSegments représente le chemin des sous-dossiers (ex: ['app', 'components'])
  const fetchTreePath = async (user: string, workshopName: string, branchName: string, pathSegments: string[]) => {
    const pathStr = pathSegments.length > 0 ? '/' + pathSegments.join('/') : ''
    const url = `/api/get/${user}/${workshopName}/${branchName}${pathStr}`
    console.log('fetching', url)
    try {
      const res = await $fetch(url)
      console.log(res)
      return (res as HttpResponseOptions).data.tree as TreeNode[]
    } catch (error) {
      console.error('Error while fetching sub-path tree:', error)
      throw error
    }
  }

  // Méthode existante : met à jour la racine
  const updateTreeData = async () => {
    console.log('Updating tree data')
    console.log(branchParam)
    if (branchParam && workshopName) {
      tree.value = await fetchBranchTree(username, workshopName, branchParam)
      console.log(tree.value)
    } else {
      tree.value = null
    }
  }

  // Nouvelle méthode optionnelle pour mettre à jour la vue selon un chemin spécifique
  // sans casser l'existant.
  const updateTreePathData = async (pathSegments: string[]) => {
    if (branchParam && workshopName) {
      tree.value = await fetchTreePath(username, workshopName, branchParam, pathSegments)
    } else {
      tree.value = null
    }
  }

  watch(
    () => branchParam,
    () => {
      updateTreeData()
    },
    { immediate: true }
  )

  return {
    createFolder,
    fetchBranchTree,
    fetchTreePath, // nouvelle méthode pour récupérer un chemin spécifique
    updateTreeData,
    updateTreePathData, // nouvelle méthode pour mettre à jour l'état selon un chemin
    tree
  }
}
