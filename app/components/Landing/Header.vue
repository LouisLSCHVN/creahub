<template>
    <p v-if="loggedIn">
        Welcome back, {{ user.name }}
    </p>
    <p v-else>
        Welcome to creahub
    </p>
    <br />
    <NuxtLink to="/login">
        Login
    </NuxtLink>
    <NuxtLink to="/signup">
        Signup
    </NuxtLink>
    <NuxtLink to="/new">
        New Workshop
    </NuxtLink>
    <NuxtLink v-if="loggedIn && user" :to="`/${user.name}`">
        Signin as {{ user.name }}
    </NuxtLink>
    <NuxtLink v-if="loggedIn" @click="clear" to="/login">
        Logout
    </NuxtLink>
</template>
<script setup lang="ts">
const { user, loggedIn, clear } = useUserSession()
</script>