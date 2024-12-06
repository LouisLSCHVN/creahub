import type { HttpResponseOptions } from "~~/shared/types/http"

export async function fetchUser(username: string) {
    const { data } = await useFetch(`/api/get/${username}`)
    if (!data.value) throw createError({
        statusMessage: "User not found",
        statusCode: 404
    })
    console.log(data.value)
    return {
        user: (data.value as HttpResponseOptions).data.user,
        workshops: (data.value as HttpResponseOptions).data.workshops
    }
}

export async function fetchWorkshop(username: string, workshopName: string) {
    const { data } = await useFetch(`/api/get/${username}/${workshopName}`)
    if (!data.value) throw createError({
        statusMessage: "Workshop not found",
        statusCode: 404
    })
    return {
        workshop: (data.value as HttpResponseOptions).data
    }
  }