<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import SkuMatrix from '@/components/SkuMatrix.vue'
import ImageUploader from '@/components/ImageUploader.vue'
import {
  getProduct,
  createProduct,
  updateProduct,
  batchUpsertSkus,
  type SkuInput,
} from '@/api/products'

const route = useRoute()
const router = useRouter()
const productId = ref<number>(0)
const isEdit = ref(false)
const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = ref({
  name: '',
  description: '',
  brand: '',
  categoryId: 1,
  detail: '',
  images: [] as string[],
})
const skus = ref<SkuInput[]>([])

const rules: FormRules = {
  name: [{ required: true, message: '商品名必填', trigger: 'blur' }],
  categoryId: [{ required: true, message: '分类必选', trigger: 'change' }],
}

onMounted(async () => {
  const idStr = route.params.id as string | undefined
  if (idStr && idStr !== 'new') {
    isEdit.value = true
    productId.value = Number(idStr)
    loading.value = true
    try {
      const p = await getProduct(productId.value)
      form.value = {
        name: p.name,
        description: p.description ?? '',
        brand: p.brand ?? '',
        categoryId: p.categoryId,
        detail: p.detail ?? '',
        images: (p.images ?? '').split(',').filter(Boolean),
      }
      skus.value = (p.skus ?? []).map((s) => ({
        id: s.id,
        skuCode: s.skuCode,
        specText: s.specText,
        specJson: s.specJson,
        price: s.price,
        stock: s.stock,
        image: s.image,
        status: s.status,
      }))
    } finally {
      loading.value = false
    }
  }
})

async function onSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (skus.value.length === 0) {
    ElMessage.warning('至少 1 个 SKU；如无规格请点「无规格（单 SKU）」生成 1 行 default')
    return
  }
  submitting.value = true
  try {
    const imagesStr = form.value.images.join(',')
    if (isEdit.value) {
      await updateProduct(productId.value, {
        name: form.value.name,
        description: form.value.description,
        brand: form.value.brand,
        detail: form.value.detail,
        categoryId: form.value.categoryId,
        images: imagesStr,
      })
      await batchUpsertSkus(productId.value, skus.value)
      ElMessage.success('已保存')
    } else {
      const r = await createProduct({
        name: form.value.name,
        description: form.value.description,
        brand: form.value.brand,
        detail: form.value.detail,
        categoryId: form.value.categoryId,
        images: imagesStr,
        skus: skus.value,
      })
      ElMessage.success(`已创建商品 #${r.id}`)
    }
    router.replace('/products')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PageContainer :title="isEdit ? '编辑商品' : '新建商品'" v-loading="loading">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      style="max-width: 900px"
    >
      <el-form-item label="商品名" prop="name">
        <el-input v-model="form.name" placeholder="商品名称" />
      </el-form-item>

      <el-form-item label="简介">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="一句话简介"
        />
      </el-form-item>

      <el-form-item label="品牌">
        <el-input v-model="form.brand" style="width: 240px" placeholder="可选" />
      </el-form-item>

      <el-form-item label="分类" prop="categoryId">
        <el-input-number v-model="form.categoryId" :min="1" />
        <span class="hint">（分类树 M3 接，先填 id）</span>
      </el-form-item>

      <el-form-item label="主图">
        <ImageUploader v-model="form.images" :max="5" />
        <p class="hint">最多 5 张；jpg/png/webp，单张 5MB 内</p>
      </el-form-item>

      <el-form-item label="详情">
        <el-input
          v-model="form.detail"
          type="textarea"
          :rows="6"
          placeholder="商品详情，支持 HTML 或纯文本"
        />
      </el-form-item>

      <el-form-item label="SKU 规格">
        <SkuMatrix v-model="skus" style="width: 100%" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="onSubmit">
          {{ isEdit ? '保存修改' : '创建商品' }}
        </el-button>
        <el-button @click="$router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </PageContainer>
</template>

<style scoped>
.hint {
  color: #999;
  font-size: 12px;
  margin: 4px 0 0;
  margin-left: 12px;
}
</style>
