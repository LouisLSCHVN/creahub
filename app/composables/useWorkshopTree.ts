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
  const { currentBranch, username, workshop } = useWorkshopState()

  const tree = useState<TreeNode[] | null>(`${username}/${workshop.value?.name}/${currentBranch.value?.name}`, () => null)

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
  }

  const fetchBranchTree = async (user: string, workshop: string, branchName: string) => {
    try {
      const res = await $fetch(`/api/get/${user}/${workshop}/${branchName}/`)
      return (res as HttpResponseOptions).data.tree as TreeNode[]
    } catch (error) {
      console.error('Error while fetching tree:', error)
      throw error
    }
  }

  const updateTreeData = async () => {
    if (currentBranch.value) {
      tree.value = await fetchBranchTree(username, workshop.value!.name, currentBranch.value.name)
    } else {
      tree.value = null
    }
  }

  watch(
    () => currentBranch.value,
    () => {
      updateTreeData()
    },
    { immediate: true }
  )

  return {
    createFolder,
    fetchBranchTree,
    tree
  }
}