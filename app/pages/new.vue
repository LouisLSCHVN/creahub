<template>
    <div>
        <h1>Create a Workshop</h1>
        <form @submit.prevent="submitWorkshopCreation">
            <div v-for="(field, index) in workshopCreationFormTemplate" :key="index">
                <label :for="field.label">{{ field.label }}</label>

                <!-- Input normal pour les champs texte -->
                <input
                    v-if="field.type === 'text'"
                    :type="field.type"
                    :placeholder="field.placeholder"
                    v-model="WorkshopCreationForm[field.key]"
                    :id="field.label"
                />

                <!-- Select pour le champ visibilité -->
                <select
                    v-if="field.type === 'select'"
                    v-model="WorkshopCreationForm[field.key]"
                    :id="field.label"
                >
                    <option
                        v-for="option in visibilityOptions"
                        :key="option.value"
                        :value="option.value"
                    >
                        <div>
                            {{ option.label }}
                        </div>
                    </option>
                </select>

                <p v-if="WorkshopCreationForm.errors[field.key]">
                    {{ WorkshopCreationForm.errors[field.key] }}
                </p>
            </div>
            <button type="submit">Submit</button>
        </form>
    </div>
</template>

<script setup lang="ts">
const visibilityOptions = [
    {
        label: 'Public',
        value: 'public',
        description: 'Anyone can see this workshop'
    },
    {
        label: 'Private',
        value: 'private',
        description: 'Only you can see this workshop'
    }
]

const WorkshopCreationForm = useForm({
    name: '',
    description: '',
    visibility: 'public'
})

const workshopCreationFormTemplate = [
    {
        key: 'name',
        type: 'text',
        label: 'Workshop Name',
        placeholder: 'Your Workshop Name'
    },
    {
        key: 'description',
        type: 'text',
        label: 'Description',
        placeholder: 'Workshop Description'
    },
    {
        key: 'visibility',
        type: 'select',
        label: 'Visibility',
        placeholder: 'Select visibility',
        options: visibilityOptions
    }
]

function submitWorkshopCreation() {
    WorkshopCreationForm.post('/api/workshop/new', {
        onError: (err) => {
            console.log(err)
        },
        onSuccess: () => {
            console.log('Success')
        }
    })
}
</script>