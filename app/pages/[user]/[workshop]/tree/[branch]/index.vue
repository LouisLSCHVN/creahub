<template>
    <div>
        {{ currentBranch }}
        <tree-view />
    </div>
</template>
<script setup lang="ts">
const { currentBranch, fetchWorkshop, username, workshop } = useWorkshopState()
const { fetchBranchTree, tree } = useWorkshopTree()
await fetchWorkshop()

onMounted(async () => {
    await fetchBranchTree(username, workshop.value!.name, currentBranch.value!.name)
})
</script>