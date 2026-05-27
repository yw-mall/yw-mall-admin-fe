<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElInput, ElInputNumber, ElTag, ElTable, ElTableColumn, ElMessage } from 'element-plus'
import type { SkuInput } from '@/api/products'

interface AttrGroup {
  name: string
  values: string[]
}

const props = defineProps<{ modelValue: SkuInput[] }>()
const emit = defineEmits<{ 'update:modelValue': [SkuInput[]] }>()

const groups = ref<AttrGroup[]>([])
const newValueDraft = ref<Record<number, string>>({})

function addGroup() {
  groups.value.push({ name: '', values: [] })
}
function removeGroup(idx: number) {
  groups.value.splice(idx, 1)
}
function addValue(idx: number) {
  const v = (newValueDraft.value[idx] ?? '').trim()
  if (!v) return
  if (groups.value[idx].values.includes(v)) {
    ElMessage.warning('属性值已存在')
    return
  }
  groups.value[idx].values.push(v)
  newValueDraft.value[idx] = ''
}
function removeValue(gIdx: number, vIdx: number) {
  groups.value[gIdx].values.splice(vIdx, 1)
}

// Cartesian product of attribute values → SKU list
function cartesian(): SkuInput[] {
  if (!groups.value.length) return props.modelValue
  if (groups.value.some((g) => !g.name || g.values.length === 0)) {
    ElMessage.error('每个属性必须有名称且至少 1 个值')
    return props.modelValue
  }
  let combos: string[][] = [[]]
  for (const g of groups.value) {
    combos = combos.flatMap((c) => g.values.map((v) => [...c, v]))
  }
  return combos.map((c) => {
    const specText = c.join('/')
    const specJson = JSON.stringify(
      Object.fromEntries(groups.value.map((g, i) => [g.name, c[i]])),
    )
    // 保留已有 SKU 的 price/stock/id（按 specText 匹配） — 避免重新生成丢已填数据
    const existing = props.modelValue.find((s) => s.specText === specText)
    return (
      existing ?? {
        specText,
        specJson,
        price: 0,
        stock: 0,
        image: '',
        status: 1,
      }
    )
  })
}

function regenerate() {
  emit('update:modelValue', cartesian())
}

function addSingleSku() {
  // 用于"无规格"的单 SKU 商品
  if (props.modelValue.length > 0) {
    ElMessage.warning('已有 SKU；要无规格请先清空')
    return
  }
  emit('update:modelValue', [
    { specText: '默认', specJson: '', price: 0, stock: 0, image: '', status: 1 },
  ])
}

function clearAll() {
  emit('update:modelValue', [])
}

function updateField(idx: number, field: 'price' | 'stock' | 'image', value: number | string) {
  const next = [...props.modelValue]
  next[idx] = { ...next[idx], [field]: value } as SkuInput
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="sku-matrix">
    <div class="groups">
      <h4>规格属性</h4>
      <div v-for="(g, gIdx) in groups" :key="gIdx" class="group-row">
        <el-input v-model="g.name" placeholder="属性名（颜色/容量）" style="width: 140px" />
        <span class="colon">:</span>
        <el-tag
          v-for="(v, vIdx) in g.values"
          :key="vIdx"
          closable
          @close="removeValue(gIdx, vIdx)"
          style="margin-right: 6px"
        >
          {{ v }}
        </el-tag>
        <el-input
          v-model="newValueDraft[gIdx]"
          placeholder="加值后回车"
          style="width: 140px"
          @keyup.enter="addValue(gIdx)"
        />
        <el-button link type="danger" @click="removeGroup(gIdx)">删除属性</el-button>
      </div>
      <div class="actions">
        <el-button @click="addGroup">+ 加属性</el-button>
        <el-button type="primary" plain @click="regenerate">生成 SKU 矩阵</el-button>
        <el-button @click="addSingleSku">无规格（单 SKU）</el-button>
        <el-button link type="danger" @click="clearAll">清空</el-button>
      </div>
    </div>

    <h4 style="margin-top: 24px">SKU 列表（{{ modelValue.length }} 个）</h4>
    <el-table :data="modelValue" border>
      <el-table-column prop="specText" label="规格" min-width="180" />
      <el-table-column label="价格 (元)" width="160">
        <template #default="{ row, $index }">
          <el-input
            :model-value="(row.price / 100).toFixed(2)"
            @change="(v: string) => updateField($index, 'price', Math.round(Number(v) * 100))"
            placeholder="0.00"
          />
        </template>
      </el-table-column>
      <el-table-column label="库存" width="140">
        <template #default="{ row, $index }">
          <el-input-number
            :model-value="row.stock"
            :min="0"
            @change="(v) => updateField($index, 'stock', v as number)"
          />
        </template>
      </el-table-column>
      <el-table-column label="SKU 主图 URL" min-width="240">
        <template #default="{ row, $index }">
          <el-input
            :model-value="row.image"
            placeholder="图片 URL（可粘贴上面上传的）"
            @change="(v: string) => updateField($index, 'image', v)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.sku-matrix {
  width: 100%;
}
.groups {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}
.groups h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #333;
}
.group-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.colon {
  color: #999;
}
.actions {
  margin-top: 8px;
}
</style>
