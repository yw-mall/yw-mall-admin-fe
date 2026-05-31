<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import {
  createPromotion,
  getPromotion,
  updatePromotion,
  type PromotionAction,
  type PromotionTarget,
} from '@/api/promotions'

const route = useRoute()
const router = useRouter()

// 路由：/promotions/new?type=fullreduce|fixprice 或 /promotions/:id/edit
const isEdit = computed(() => !!route.params.id)
const isView = ref(false) // 非草稿态进入 = 只读
const editId = computed(() => Number(route.params.id || 0))
const initType = (route.query.type as string) || 'fullreduce'

const form = ref({
  type: initType,
  name: '',
  startTime: 0,
  endTime: 0,
  priority: 100,
  stackable: true,
  description: '',
  // 满减：阶梯 actions
  // 直降：每个 SKU 一行 fixprice
  targetType: 'shop' as 'shop' | 'sku' | 'category' | 'all',
  shopTargetId: 0, // 自动填入 user.shopId
  skuIds: '' as string, // 直降时 SKU id 列表（逗号分隔，每个 sku 一行 action）
  fixprices: '' as string, // 直降时各 SKU 对应价格（分，与 skuIds 一一对应）
  // 满减专用：阶梯
  steps: [{ thresholdValue: 19900, benefitValue: 3000 }] as { thresholdValue: number; benefitValue: number }[],
})

const dateRange = ref<[Date, Date] | null>(null)
const loading = ref(false)
const saving = ref(false)

import { useUserStore } from '@/stores/user'
const user = useUserStore()

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    try {
      const p = await getPromotion(editId.value)
      form.value.type = p.type
      form.value.name = p.name
      form.value.startTime = p.startTime
      form.value.endTime = p.endTime
      form.value.priority = p.priority
      form.value.stackable = p.stackable
      form.value.description = p.description
      dateRange.value = [new Date(p.startTime * 1000), new Date(p.endTime * 1000)]
      if (p.status !== 0) isView.value = true

      const t = p.targets?.[0]
      if (t) {
        form.value.targetType = t.targetType as any
        if (t.targetType === 'shop') form.value.shopTargetId = t.targetId
      }
      if (p.type === 'fullreduce') {
        form.value.steps = (p.actions || []).map((a) => ({
          thresholdValue: a.thresholdValue ?? 0,
          benefitValue: a.benefitValue,
        }))
      } else if (p.type === 'fixprice') {
        // 多个 sku targets + 多个 fixprice actions 反序列化
        const skus = (p.targets || []).filter((x) => x.targetType === 'sku').map((x) => x.targetId)
        const prices = (p.actions || []).map((a) => a.benefitValue)
        form.value.skuIds = skus.join(',')
        form.value.fixprices = prices.join(',')
      }
    } finally {
      loading.value = false
    }
  } else {
    form.value.shopTargetId = user.shopId || 1
  }
})

function addStep() {
  form.value.steps.push({ thresholdValue: 0, benefitValue: 0 })
}
function rmStep(i: number) {
  form.value.steps.splice(i, 1)
}

function buildPayload(): { targets: PromotionTarget[]; actions: PromotionAction[] } {
  if (form.value.type === 'fullreduce') {
    return {
      targets: [{ targetType: 'shop', targetId: form.value.shopTargetId }],
      actions: form.value.steps.map((s, idx) => ({
        actionType: 'reduce',
        thresholdType: 'amount',
        thresholdValue: s.thresholdValue,
        benefitValue: s.benefitValue,
        stepOrder: idx + 1,
      })),
    }
  }
  // fixprice 直降：N 个 sku，每个一行 target + 一行 action
  const skus = form.value.skuIds.split(',').map((s) => Number(s.trim())).filter((n) => n > 0)
  const prices = form.value.fixprices.split(',').map((s) => Number(s.trim()))
  if (skus.length !== prices.length || skus.length === 0) {
    throw new Error('SKU ID 与价格数量必须一一对应且不能为空')
  }
  return {
    targets: skus.map((id) => ({ targetType: 'sku' as const, targetId: id })),
    actions: skus.map((_id, i) => ({
      actionType: 'fixprice',
      thresholdType: 'none',
      thresholdValue: 0,
      benefitValue: prices[i],
      stepOrder: i + 1,
    })),
  }
}

async function save() {
  if (!form.value.name.trim()) {
    ElMessage.error('请填写活动名称')
    return
  }
  if (!dateRange.value || dateRange.value.length < 2) {
    ElMessage.error('请选择活动时间')
    return
  }
  form.value.startTime = Math.floor(dateRange.value[0].getTime() / 1000)
  form.value.endTime = Math.floor(dateRange.value[1].getTime() / 1000)
  if (form.value.endTime <= form.value.startTime) {
    ElMessage.error('结束时间必须晚于开始时间')
    return
  }

  saving.value = true
  try {
    const payload = buildPayload()
    if (isEdit.value) {
      await updatePromotion(editId.value, {
        name: form.value.name,
        startTime: form.value.startTime,
        endTime: form.value.endTime,
        priority: form.value.priority,
        stackable: form.value.stackable,
        description: form.value.description,
        ...payload,
      })
      ElMessage.success('已保存')
    } else {
      const { id } = await createPromotion({
        type: form.value.type,
        name: form.value.name,
        startTime: form.value.startTime,
        endTime: form.value.endTime,
        priority: form.value.priority,
        stackable: form.value.stackable,
        description: form.value.description,
        ...payload,
      })
      ElMessage.success(`已创建草稿 #${id}，去列表上线`)
    }
    router.push('/promotions')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageContainer
    :title="isEdit ? (isView ? '活动详情' : '编辑活动') : (form.type === 'fullreduce' ? '新建满减活动' : '新建直降活动')"
    v-loading="loading"
  >
    <el-alert
      v-if="isView"
      type="info"
      :closable="false"
      title="只读模式：活动已上线或已结束，不可编辑"
      style="margin-bottom: 16px"
    />

    <el-form label-width="120px" style="max-width: 720px" :disabled="isView">
      <el-form-item label="活动类型">
        <el-tag>{{ form.type === 'fullreduce' ? '满减' : form.type === 'fixprice' ? '直降' : form.type }}</el-tag>
        <span class="hint">类型创建后不可改</span>
      </el-form-item>

      <el-form-item label="活动名称" required>
        <el-input v-model="form.name" maxlength="100" show-word-limit placeholder="如：双 11 全店满 199 减 30" />
      </el-form-item>

      <el-form-item label="活动时间" required>
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="~"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="优先级">
        <el-input-number v-model="form.priority" :min="0" :max="1000" />
        <span class="hint">数字大优先生效（互斥场景）</span>
      </el-form-item>

      <el-form-item label="可叠加">
        <el-switch v-model="form.stackable" />
        <span class="hint">关闭后此活动与其他活动互斥</span>
      </el-form-item>

      <el-form-item label="活动描述">
        <el-input v-model="form.description" type="textarea" :rows="2" maxlength="500" />
      </el-form-item>

      <!-- 满减阶梯 -->
      <template v-if="form.type === 'fullreduce'">
        <el-form-item label="适用范围">
          <el-tag>全店商品</el-tag>
          <span class="hint">满减默认全店生效</span>
        </el-form-item>

        <el-form-item label="阶梯满减" required>
          <div v-for="(s, i) in form.steps" :key="i" class="step-row">
            <span>满</span>
            <el-input-number
              v-model="s.thresholdValue"
              :min="100"
              :step="100"
              controls-position="right"
              style="width: 140px"
            />
            <span>分（¥{{ (s.thresholdValue / 100).toFixed(2) }}）减</span>
            <el-input-number
              v-model="s.benefitValue"
              :min="1"
              :step="100"
              controls-position="right"
              style="width: 120px"
            />
            <span>分（¥{{ (s.benefitValue / 100).toFixed(2) }}）</span>
            <el-button
              v-if="form.steps.length > 1"
              link
              type="danger"
              size="small"
              @click="rmStep(i)"
            >删</el-button>
          </div>
          <el-button text type="primary" @click="addStep">+ 添加阶梯</el-button>
        </el-form-item>
      </template>

      <!-- 直降 -->
      <template v-if="form.type === 'fixprice'">
        <el-form-item label="SKU IDs" required>
          <el-input
            v-model="form.skuIds"
            placeholder="如：81,79,77（逗号分隔）"
          />
          <span class="hint">每个 SKU 创建一条 fixprice action</span>
        </el-form-item>
        <el-form-item label="对应价格(分)" required>
          <el-input
            v-model="form.fixprices"
            placeholder="如：8900,5900,2900 与 SKU IDs 一一对应"
          />
          <span class="hint">单位：分；¥99.00 写 9900</span>
        </el-form-item>
      </template>

      <el-form-item v-if="!isView">
        <el-button type="primary" :loading="saving" @click="save">
          {{ isEdit ? '保存' : '创建草稿' }}
        </el-button>
        <el-button @click="router.push('/promotions')">取消</el-button>
      </el-form-item>
    </el-form>
  </PageContainer>
</template>

<style scoped>
.hint {
  color: #999;
  font-size: 12px;
  margin-left: 8px;
}
.step-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
