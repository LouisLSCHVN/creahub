interface DisplayWorkshop extends Workshop {
    branches: Branch[]
}

export function useWorkshopState() {
  const route = useRoute()
  const workshopName = route.params.workshop as string
  const username = route.params.user as string

  const workshop = useState(`${username}/${workshopName}`, () => null) as Ref<DisplayWorkshop | null>

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
    fetchWorkshop,
    createBranch,
    deleteBranch,
  }
}