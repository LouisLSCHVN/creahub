<template>
    <div>
        {{ currentBranch }}
    </div>
</template>
<script setup lang="ts">
const { currentBranch, fetchWorkshop } = useWorkshopState()
await fetchWorkshop()

interface WorkshopData extends Workshop {
    branch: Branch;
    tree: TreeNode[];
}

type TreeNode = FolderNode | FileNode;

interface FolderNode extends Folder {
    type: 'folder';
    children: TreeNode[];
}

interface FileNode extends File {
    type: 'file';
}
</script>