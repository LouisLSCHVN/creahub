<template>
    <div> <!-- Root element wrapper -->
        <h1>Signup</h1>
        <form @submit.prevent="submitSignupForm">
            <div v-for="(field, index) in signupFormTemplate" :key="index">
                <label :for="field.label">{{ field.label }}</label>
                <input
                    :type="field.type"
                    :placeholder="field.placeholder"
                    v-model="signupForm[field.key]"
                    :id="field.label"
                />
                <p v-if="signupForm.errors[field.key]">{{ signupForm.errors[field.key] }}</p>
            </div>
            <button type="submit">Submit</button>
        </form>
    </div>
</template>

<script setup lang="ts">
const signupForm = useForm({
    name: '',
    email: '',
    password: ''
})

const signupFormTemplate = [
    {
        key: 'name',
        type: 'text',
        label: 'Username',
        placeholder: 'Your Username Here'
    },
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

function submitSignupForm() {
    signupForm.post('/api/user/signup', {
        onError: (err) => {
            console.log(err)
            signupForm.reset('password')
        },
        onSuccess: () => {
            console.log('Success')
        }
    })
}
</script>