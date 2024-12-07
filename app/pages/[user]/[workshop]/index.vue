<template>
  <div>
    <pre>
        {{ workshop }}
    </pre>
    <div v-if="workshop">
      <h1>{{ workshop.name }}</h1>
      <div v-for="branch in workshop.branches" :key="branch.id">
        <p>
          {{ branch.name }}
          <button v-if="branch.name !== 'main'" @click.prevent="handleBranchDelete(branch.id)">Supprimer la branche</button>
        </p>
      </div>
      <!-- Formulaire pour créer une nouvelle branche -->
      <input v-model="newBranchName" placeholder="Nom de la nouvelle branche" />
      <button @click="handleBranchCreation">Créer une branche</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { workshop, fetchWorkshop, createBranch, deleteBranch } = useWorkshopState()

await fetchWorkshop()
console.log(workshop.value)

const newBranchName = ref('')
const handleBranchCreation = async () => {
  if (newBranchName.value.trim() !== '') {
    await createBranch(newBranchName.value.trim())
    newBranchName.value = ''
  }
}

const handleBranchDelete = async (branchId: number) => {
  await deleteBranch(branchId)
}
</script>