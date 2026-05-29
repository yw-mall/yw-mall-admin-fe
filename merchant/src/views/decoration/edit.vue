<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import ImageUploader from '@/components/ImageUploader.vue'
import { useUserStore } from '@/stores/user'
import { getDecoration, updateDecoration } from '@/api/decoration'

const user = useUserStore()
const loading = ref(false)
const saving = ref(false)

// 内部用数组，提交时 join(',')；从后端 csv 字符串 split 进来
const banners = ref<string[]>([])
const announcement = ref('')
const featuredPidsStr = ref('') // 用户输入的逗号分隔，例: "81,79,77"

const canEdit = computed(() => user.hasPerm('decoration.write'))

async function reload() {
  loading.value = true
  try {
    const d = await getDecoration()
    banners.value = (d.banners ?? '').split(',').filter(Boolean)
    announcement.value = d.announcement ?? ''
    featuredPidsStr.value = d.featuredPids ?? ''
  } finally {
    loading.value = false
  }
}

onMounted(reload)

async function save() {
  if (!canEdit.value) {
    ElMessage.warning('当前角色无装修编辑权限（需 owner）')
    return
  }
  // 简单校验：featuredPids 必须是逗号分隔的数字
  const pidsTrim = featuredPidsStr.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (pidsTrim.some((p) => !/^\d+$/.test(p))) {
    ElMessage.error('推荐商品 ID 必须是数字，用逗号分隔')
    return
  }
  if (pidsTrim.length > 10) {
    ElMessage.error('最多 10 个推荐商品')
    return
  }
  saving.value = true
  try {
    await updateDecoration({
      banners: banners.value.join(','),
      announcement: announcement.value,
      featuredPids: pidsTrim.join(','),
    })
    ElMessage.success('装修已保存')
    await reload()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageContainer title="店铺装修" v-loading="loading">
    <el-alert
      v-if="!canEdit"
      type="warning"
      :closable="false"
      title="只读模式：当前角色没有 decoration.write 权限，仅店主可编辑"
      style="margin-bottom: 16px"
    />

    <el-form label-width="120px" style="max-width: 800px">
      <el-form-item label="Banner 轮播图">
        <ImageUploader v-model="banners" :max="5" />
        <p class="hint">最多 5 张；jpg/png/webp，单张 5MB 内；按上传顺序展示</p>
      </el-form-item>

      <el-form-item label="店铺公告">
        <el-input
          v-model="announcement"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="如：本店全场满 99 包邮；新品 8 折，限时 3 天 ..."
          :disabled="!canEdit"
        />
      </el-form-item>

      <el-form-item label="推荐商品 ID">
        <el-input
          v-model="featuredPidsStr"
          placeholder="如：81,79,77（最多 10 个）"
          :disabled="!canEdit"
        />
        <p class="hint">商品 ID 逗号分隔；C 端店铺主页按顺序展示</p>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="saving" :disabled="!canEdit" @click="save">
          保存装修
        </el-button>
        <el-button @click="reload">重置</el-button>
      </el-form-item>
    </el-form>
  </PageContainer>
</template>

<style scoped>
.hint {
  color: #999;
  font-size: 12px;
  margin: 4px 0 0;
}
</style>
