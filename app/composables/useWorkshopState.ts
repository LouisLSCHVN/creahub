interface DisplayWorkshop extends Workshop {
    branches: Branch[]
}

export function useWorkshopState() {
  const route = useRoute()
  const router = useRouter()

  const workshopName = route.params.workshop as string
  const username = route.params.user as string
  const action = route.params.action as string
  const branchParam = route.params.branch as string

  const workshop = useState<DisplayWorkshop | null>(`${username}/${workshopName}`, () => null)
  const currentBranch = useState<Branch | null>('currentBranch', () => null)

  // Surveille les changements de branche dans l'URL ou le workshop
  watch([() => route.params.branch, () => workshop.value], ([newBranch]) => {
    if (!workshop.value?.branches.length) return

    // Si pas de branche dans l'URL, utiliser 'main'
    const branchName = newBranch || 'main'
    const branch = workshop.value.branches.find(b => b.name === branchName)

    if (branch) {
      currentBranch.value = branch
    } else {
      throw createError({
        statusMessage: 'Branch not found',
        statusCode: 404
      })
    }
  }, { immediate: true })

  const updateCurrentBranch = async (name: string) => {
    currentBranch.value = workshop.value?.branches.find(b => b.name === name) || null
    await router.push(`/${username}/${workshopName}/${action}/${name}`)
  }

  async function fetchWorkshop() {
      try {
        let data: HttpResponseOptions

        if (import.meta.server) {
          const { data: fetchData } = await useFetch(`/api/get/${username}/${workshopName}`)
          console.log('Fetch data:', fetchData)
          if (!fetchData.value) throw createError({
            statusMessage: "Workshop not found",
            statusCode: 404
          })
          data = fetchData.value as HttpResponseOptions
        } else {
          const response = await $fetch(`/api/get/${username}/${workshopName}`)
          console.log('Fetch response:', response)
          if (!response) throw createError({
            statusMessage: "Workshop not found",
            statusCode: 404
          })
          data = response as HttpResponseOptions
        }

        workshop.value = data.data

        // Met à jour currentBranch après chargement du workshop
        if (workshop.value?.branches.length) {
          const branchName = branchParam || 'main'
          const branch = workshop.value.branches.find(b => b.name === branchName)
          if (branch) {
            currentBranch.value = branch
          }
        }
      } catch (error) {
        throw createError({
          statusMessage: (error as any).message || 'Error fetching workshop',
          statusCode: (error as any).status || 500
        })
      }
  }

  const createBranch = async (name: string) => {
    if (!workshop.value) return
    try {
      const response = await $fetch(`/api/branch/new`, {
        method: 'POST',
        body: { name, workshopId: workshop.value.id },
      }) as unknown as HttpResponseOptions

      console.log('Réponse de l\'API lors de la création de la branche :', response)

      workshop.value.branches.push(response.data)
    } catch (error) {
      console.error('Error creating branch', error)
    }
  }

  const deleteBranch = async (branchId: number) => {
    if (!workshop.value) return
    try {
      await $fetch(`/api/branch/${branchId}`, {
        method: 'DELETE',
      })
      workshop.value.branches = workshop.value.branches.filter(
        (branch) => branch.id !== branchId
      )
    } catch (error) {
      console.error('Error deleting branch', error)
    }
  }

  return {
    workshop,
    currentBranch,
    fetchWorkshop,
    createBranch,
    deleteBranch,
    updateCurrentBranch,
    workshopName,
    username,
    branchParam,
  }
}