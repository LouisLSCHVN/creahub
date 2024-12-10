<!-- TreeView.vue -->
<template>
  <div>
    <h1>
      <span v-for="(segment, index) in pathSegments" :key="index">
        / {{ segment }}
      </span>
    </h1>

    <!-- Ajouter un lien pour remonter d'un niveau -->
    <div v-if="pathSegments.length > 0">
      <NuxtLink :to="getFolderLink('..')">..</NuxtLink>
    </div>

    <div v-if="tree">
      <ul>
        <li v-for="node in tree" :key="node.id">
          <template v-if="node.type === 'folder'">
            <NuxtLink :to="getFolderLink(node.name)">
              📁 {{ node.name }}
            </NuxtLink>
          </template>
          <template v-else>
            📄 {{ node.name }}
          </template>
        </li>
      </ul>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWorkshopTree } from '~/composables/useWorkshopTree'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkshopState } from '~/composables/useWorkshopState'

const route = useRoute()
const { username, workshopName, branchParam } = useWorkshopState()
const { tree, updateTreePathData, fetchTreePath } = useWorkshopTree()

const pathSegments = computed(() => {
  const p = route.params.path
  if (!p) return []
  return Array.isArray(p) ? p : [p]
})

// Améliorer la fonction de création de lien
function getFolderLink(folderName: string) {
  const basePath = `/${username}/${workshopName}/tree/${branchParam}`
  const currentPath = pathSegments.value
  const newPath = [...currentPath, folderName]
  return basePath + '/' + newPath.join('/')
}

// Surveiller les changements de chemin et mettre à jour l'arbre
watch([pathSegments], async ([newPath]) => {
  if (username && workshopName) {
    try {
      await updateTreePathData(newPath)
    } catch (error) {
      console.error('Erreur lors du chargement du dossier:', error)
    }
  }
}, { immediate: true })
</script>
