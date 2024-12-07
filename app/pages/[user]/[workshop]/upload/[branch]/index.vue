<template>
    <div>
        <h1>
            Add to the Workshop
        </h1>
        <form @submit.prevent="handleFolderCreation">
            <input v-model="folderToInsert.title" placeholder="Folder Name" />
            <input v-model="folderToInsert.description" placeholder="Folder Description" />
            <input v-model="folderToInsert.icon" placeholder="Folder Icon" />
            <button type="submit">
                Add a Folder
            </button>
        </form>
    </div>
</template>
<script setup lang="ts">
const { currentBranch, workshop, fetchWorkshop } = useWorkshopState()
const { createFolder } = useWorkshopTree()
await fetchWorkshop()

const folderToInsert = ref({
    branchId: currentBranch.value!.id,
    title: '',
    description: "",
    icon: '',
    parentFolderId: 0,
    tags: [],
})

async function handleFolderCreation() {
    await createFolder(folderToInsert.value)
}

console.log('current',currentBranch.value)
</script>