<template>
    <div>
        <pre>
            {{ user }}
        </pre>
        <pre>
            {{ workshops }}
        </pre>
        <pre>
            {{
                data
            }}
        </pre>
        <NuxtLink v-for="workshop in workshops" :key="workshop.id" :to="`/${user.name}/${workshop.name}`">
            {{ workshop.name }}
        </NuxtLink>
    </div>
</template>
<script setup lang="ts">
const username = useRoute().params.user
const { user, workshops, data } = await fetchUser(username as string)
</script>
