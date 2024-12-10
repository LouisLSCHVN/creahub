<!-- TreeView.vue -->
<template>
    <ul>
      <li v-for="node in nodes" :key="node.id">
        <span v-if="node.type === 'folder'">
          📁 {{ node.name }}
        </span>
        <span v-else>
          📄 {{ node.name }}
        </span>
        <tree-view v-if="node.type === 'folder' && node.children && node.children.length" :nodes="node.children" />
      </li>
    </ul>
  </template>

  <script setup lang="ts">
  interface Node {
    id: number;
    name: string;
    type: string;
    children?: Node[];
  }

  const props = defineProps<{
    nodes: Node[]
  }>()
  </script>
