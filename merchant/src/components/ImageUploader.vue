<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { uploadImage } from '@/api/upload'

const props = defineProps<{ modelValue: string[]; max?: number }>()
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const maxCount = props.max ?? 5

async function beforeUpload(file: File): Promise<boolean | undefined> {
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片超过 5MB')
    return false
  }
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    ElMessage.error('只支持 jpg/jpeg/png/webp')
    return false
  }
  return true
}

async function handle(option: { file: File }) {
  try {
    const r = await uploadImage(option.file)
    emit('update:modelValue', [...props.modelValue, r.url])
    ElMessage.success('上传成功')
  } catch (e) {
    ElMessage.error('上传失败')
    console.error('upload failed', e)
  }
}

function remove(idx: number) {
  const next = [...props.modelValue]
  next.splice(idx, 1)
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="img-uploader">
    <div v-for="(url, idx) in modelValue" :key="idx" class="img-tile">
      <el-image :src="url" fit="cover" style="width: 100px; height: 100px; border-radius: 6px" />
      <span class="del" @click="remove(idx)">×</span>
    </div>
    <el-upload
      v-if="modelValue.length < maxCount"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :http-request="handle"
      accept="image/jpeg,image/png,image/webp"
      :multiple="false"
    >
      <div class="add-tile">
        <el-icon><Plus /></el-icon>
      </div>
    </el-upload>
  </div>
</template>

<style scoped>
.img-uploader {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.img-tile {
  position: relative;
  width: 100px;
  height: 100px;
}
.img-tile .del {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #000;
  color: #fff;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  text-align: center;
  line-height: 18px;
  cursor: pointer;
  font-size: 14px;
  user-select: none;
}
.add-tile {
  width: 100px;
  height: 100px;
  border: 1px dashed #ccc;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #999;
  font-size: 24px;
}
.add-tile:hover {
  border-color: #e1251b;
  color: #e1251b;
}
</style>
