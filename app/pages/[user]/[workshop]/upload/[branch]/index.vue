<template>
    <div>
        <pre v-if="tree">
            {{ tree }}
        </pre>
        <h1>
            Add to the Workshop
        </h1>
        <form @submit.prevent="handleFolderCreation">
            <h2>Add a folder</h2>
            <select v-model="folderToInsert.parentFolderId">
                <option :value="0">Pas de dossier (racine)</option>
                <option v-for="folder in tree"
                        :key="folder.id"
                        :value="folder.id">
                    {{ folder.name }}
                </option>
            </select>
            <input v-model="folderToInsert.title" placeholder="Folder Name" />
            <input v-model="folderToInsert.description" placeholder="Folder Description" />
            <input v-model="folderToInsert.icon" placeholder="Folder Icon" />
            <button type="submit">
                Add a Folder
            </button>
        </form>
        <form>
            <h2>Add a file</h2>
            <input type="file" multiple />
            <button type="submit">
                Add a File
            </button>
        </form>
    </div>
</template>
<script setup lang="ts">
const { currentBranch, workshop, fetchWorkshop, username } = useWorkshopState()
const { createFolder, tree, fetchBranchTree } = useWorkshopTree()

await fetchWorkshop()

onMounted(async () => {
    await fetchBranchTree(username, workshop.value!.name, currentBranch.value!.name)
})

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