<template>
    <div>
        {{ currentBranch }}
        <tree-view v-if="tree && tree.length && tree[0].children" :nodes="tree[0].children" />
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