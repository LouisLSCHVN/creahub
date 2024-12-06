<template>
    <pre>
        {{ workshop }}
    </pre>
</template>
<script setup lang="ts">
const workshopName = useRoute().params.workshop as string
const username = useRoute().params.user as string

const { workshop } = await fetchWorkshop(username, workshopName)
</script>