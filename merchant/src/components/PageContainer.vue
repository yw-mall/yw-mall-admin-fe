<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <el-card class="page-container" shadow="never">
    <template v-if="title" #header>
      <span class="page-title">{{ title }}</span>
    </template>
    <slot />
  </el-card>
</template>

<style scoped>
.page-container {
  border-radius: 6px;
}
.page-title {
  font-weight: 600;
  font-size: 16px;
}
</style>
