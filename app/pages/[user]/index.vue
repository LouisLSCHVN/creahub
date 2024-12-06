<template>
    <pre>
        {{ user }}
    </pre>
    <pre>
        {{ workshops }}
    </pre>
</template>
<script setup lang="ts">
const username = useRoute().params.user
const { user, workshops } = await fetchUser(username as string)
</script>
