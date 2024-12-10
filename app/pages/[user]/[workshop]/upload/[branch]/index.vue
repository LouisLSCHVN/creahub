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

        <form @submit.prevent="createZip">
            <h2>Ajouter un ZIP</h2>
            <input type="file" @change="handleZipSelection" accept=".zip,application/zip" />            <div v-if="zipFile">
                <p>{{ zipFile.name }}</p>
                <progress :value="progress[zipFile.name] || 0" max="100"></progress>
            </div>
            <button type="submit">Ajouter le ZIP</button>
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

// Gestion des fichiers individuels
const files = ref<File[]>([])
const { progress, uploadFiles, uploadZip } = useFileUpload()

function handleFileSelection(event: Event) {
    const selectedFiles = (event.target as HTMLInputElement).files
    if (selectedFiles) {
        files.value = Array.from(selectedFiles)
    }
}

async function createFiles() {
    try {
        await uploadFiles(files.value, '/api/file/new', currentBranch.value!.id, workshop.value!.id)
        // Gérer le succès (rafraîchir la liste, afficher un message, etc.)
    } catch (error) {
        console.error('Erreur lors du téléchargement des fichiers :', error)
    }
}

// Gestion du fichier ZIP
const zipFile = ref<File | null>(null)

function handleZipSelection(event: Event) {
    const selected = (event.target as HTMLInputElement).files
    if (selected && selected.length > 0) {
        zipFile.value = selected[0]
    }
}

async function createZip() {
    if (!zipFile.value) return
    try {
        // Appelez uploadZip avec le fichier ZIP
        await uploadZip(zipFile.value, '/api/file/zip/new', currentBranch.value!.id, workshop.value!.id)
        // Gérer le succès (rafraîchir l’arborescence, afficher un message, etc.)
    } catch (error) {
        console.error('Erreur lors du téléchargement du ZIP :', error)
    }
}

console.log('current', currentBranch.value)
</script>
