<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: number
  labels?: Record<number, string>
}>()

const defaultLabels: Record<number, string> = {
  0: '待处理',
  1: '通过',
  2: '驳回',
}

const type = computed<'success' | 'danger' | 'info' | 'warning'>(() => {
  if (props.status === 1) return 'success'
  if (props.status === 2) return 'danger'
  return 'info'
})

const text = computed(() => {
  const labels = props.labels ?? defaultLabels
  return labels[props.status] ?? String(props.status)
})
</script>

<template>
  <el-tag :type="type" disable-transitions>{{ text }}</el-tag>
</template>
