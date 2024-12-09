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
        <form @submit.prevent="createFiles">
            <h2>Ajouter des fichiers</h2>
            <input type="file" multiple @change="handleFileSelection" />
            <div v-for="(file, index) in files" :key="index">
                <p>{{ file.name }}</p>
                <progress :value="progress[file.name] || 0" max="100"></progress>
            </div>
            <button type="submit">Ajouter les fichiers</button>
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

// Gestion des fichiers
const files = ref<File[]>([])
const { progress, uploadFiles } = useFileUpload()

function handleFileSelection(event: Event) {
    const selectedFiles = (event.target as HTMLInputElement).files
    if (selectedFiles) {
        files.value = Array.from(selectedFiles)
    }
}

async function createFiles() {
    try {
        await uploadFiles(files.value, '/api/file/new', currentBranch.value!.id, workshop.value!.id)
        // Gérer le succès (par exemple, afficher un message ou rafraîchir la liste des fichiers)
    } catch (error) {
        // Gérer les erreurs (par exemple, afficher un message d'erreur)
        console.error('Erreur lors du téléchargement des fichiers :', error)
    }
}

console.log('current',currentBranch.value)
</script>