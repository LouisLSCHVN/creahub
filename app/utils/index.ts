import type { HttpResponseOptions } from "~~/shared/types/http"

export async function fetchUser(username: string) {
    if (import.meta.server) {
      const { data } = await useFetch(`/api/get/${username}`)
      if (!data.value) throw createError({
        statusMessage: "User not found",
        statusCode: 404
      })
      return {
        user: (data.value as HttpResponseOptions).data.user,
        workshops: (data.value as HttpResponseOptions).data.workshops
      }
    }

    const response = await $fetch(`/api/get/${username}`)
    if (!response) throw createError({
      statusMessage: "User not found",
      statusCode: 404
    })
    return {
      user: (response as HttpResponseOptions).data.user,
      workshops: (response as HttpResponseOptions).data.workshops
    }
}