<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import { useUserStore } from '@/stores/user'
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type FreightTemplate,
} from '@/api/freight'

const user = useUserStore()
const items = ref<FreightTemplate[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editing = ref<FreightTemplate | null>(null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = ref({
  name: '',
  calcType: 1,
  firstValue: 1,
  firstFee: 0,
  extraValue: 1,
  extraFee: 0,
  regions: '全国',
  isDefault: false,
})

const rules: FormRules = {
  name: [{ required: true, message: '模板名必填', trigger: 'blur' }],
  regions: [{ required: true, message: '至少填一个地区', trigger: 'blur' }],
}

const CALC_LABEL: Record<number, string> = { 1: '按件数', 2: '按重量(g)' }

async function reload() {
  loading.value = true
  try {
    items.value = (await listTemplates()).templates
  } finally {
    loading.value = false
  }
}
onMounted(reload)

function openNew() {
  editing.value = null
  form.value = {
    name: '',
    calcType: 1,
    firstValue: 1,
    firstFee: 0,
    extraValue: 1,
    extraFee: 0,
    regions: '全国',
    isDefault: false,
  }
  dialogVisible.value = true
}

function openEdit(row: FreightTemplate) {
  editing.value = row
  form.value = {
    name: row.name,
    calcType: row.calcType,
    firstValue: row.firstValue,
    firstFee: row.firstFee,
    extraValue: row.extraValue,
    extraFee: row.extraFee,
    regions: row.regions,
    isDefault: row.isDefault,
  }
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    if (editing.value) {
      await updateTemplate(editing.value.id, form.value)
      ElMessage.success('已保存')
    } else {
      await createTemplate(form.value)
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    await reload()
  } finally {
    submitting.value = false
  }
}

async function onDelete(row: FreightTemplate) {
  try {
    await ElMessageBox.confirm(`确定删除模板「${row.name}」？`, '删除模板', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await deleteTemplate(row.id)
  ElMessage.success('已删除')
  await reload()
}

function fmtFee(f: number) {
  return '¥' + (f / 100).toFixed(2)
}
</script>

<template>
  <PageContainer title="物流模板">
    <div class="header-bar">
      <span class="muted">共 {{ items.length }} 个模板（默认模板显示在最前）</span>
      <el-button v-if="user.hasPerm('freight.write')" type="primary" @click="openNew">
        + 新建模板
      </el-button>
    </div>

    <el-table v-loading="loading" :data="items" border>
      <el-table-column prop="name" label="名称" min-width="180">
        <template #default="{ row }">
          {{ row.name }}
          <el-tag v-if="row.isDefault" size="small" type="success" style="margin-left: 4px">
            默认
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="计费方式" width="120">
        <template #default="{ row }">{{ CALC_LABEL[row.calcType] }}</template>
      </el-table-column>
      <el-table-column label="首段" min-width="140">
        <template #default="{ row }">
          {{ row.firstValue }} → {{ fmtFee(row.firstFee) }}
        </template>
      </el-table-column>
      <el-table-column label="续段" min-width="160">
        <template #default="{ row }">
          +{{ row.extraValue }} → +{{ fmtFee(row.extraFee) }}
        </template>
      </el-table-column>
      <el-table-column prop="regions" label="覆盖地区" min-width="180" />
      <el-table-column label="操作" width="180" v-if="user.hasPerm('freight.write')">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" link @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑模板' : '新建模板'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="模板名" prop="name">
          <el-input v-model="form.name" placeholder="如：全国包邮 / 江浙沪满 99 包邮" />
        </el-form-item>
        <el-form-item label="计费方式">
          <el-radio-group v-model="form.calcType">
            <el-radio :value="1">按件数</el-radio>
            <el-radio :value="2">按重量(g)</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="首段">
          <el-input-number v-model="form.firstValue" :min="1" style="width: 100px" />
          <span class="inline-label">单价 (元):</span>
          <el-input
            :model-value="(form.firstFee / 100).toFixed(2)"
            @update:model-value="(v: string) => (form.firstFee = Math.round(Number(v || 0) * 100))"
            style="width: 120px"
            placeholder="0.00"
          />
        </el-form-item>
        <el-form-item label="续段每增">
          <el-input-number v-model="form.extraValue" :min="1" style="width: 100px" />
          <span class="inline-label">加价 (元):</span>
          <el-input
            :model-value="(form.extraFee / 100).toFixed(2)"
            @update:model-value="(v: string) => (form.extraFee = Math.round(Number(v || 0) * 100))"
            style="width: 120px"
            placeholder="0.00"
          />
        </el-form-item>
        <el-form-item label="覆盖地区" prop="regions">
          <el-input v-model="form.regions" placeholder="如：广东,浙江 / 全国" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<style scoped>
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.muted {
  color: #999;
  font-size: 13px;
}
.inline-label {
  margin: 0 8px;
  color: #666;
}
</style>
