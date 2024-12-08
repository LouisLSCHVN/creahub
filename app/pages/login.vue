<template>
    <div> <!-- Root element wrapper -->
        <h1>Login</h1>
        <form @submit.prevent="submitLoginForm">
            <div v-for="(field, index) in loginFormTemplate" :key="index">
                <label :for="field.label">{{ field.label }}</label>
                <input
                    :type="field.type"
                    :placeholder="field.placeholder"
                    v-model="loginForm[field.key]"
                    :id="field.label"
                />
                <p v-if="loginForm.errors[field.key]">{{ loginForm.errors[field.key] }}</p>
            </div>
            <button type="submit">Submit</button>
        </form>
    </div>
</template>

<script setup lang="ts">
const loginForm = useForm({
    email: '',
    password: ''
})

const loginFormTemplate = [
    {
        key: 'email',
        type: 'text',
        label: 'Email',
        placeholder: 'Your Email Here'
    },
    {
        key: 'password',
        type: 'password',
        label: 'Password',
        placeholder: '**********'
    }
]

function submitLoginForm() {
    loginForm.post('/api/user/login', {
        onError: (err) => {
            console.log(err)
            loginForm.reset('password')
        },
        onSuccess: () => {
            console.log('Success')
            reloadNuxtApp()
        }
    })
}
</script>