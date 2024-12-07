<template>
    <div>
        <h1>
            Add to the Workshop
        </h1>
        <form @submit="">
            <button>
                Add a Folder
            </button>
        </form>
    </div>
</template>
<script setup lang="ts">
const { workshop, fetchWorkshop } = useWorkshopState()
await fetchWorkshop()
</script>