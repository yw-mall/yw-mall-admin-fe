<script setup lang="ts">
import PageContainer from '@/components/PageContainer.vue'
import { useUserStore } from '@/stores/user'

const user = useUserStore()
</script>

<template>
  <PageContainer title="商家工作台">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="用户名">{{ user.username || '-' }}</el-descriptions-item>
      <el-descriptions-item label="店铺 ID">{{ user.shopId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="角色">{{ user.staffRole || user.role || '-' }}</el-descriptions-item>
      <el-descriptions-item label="UID">{{ user.uid }}</el-descriptions-item>
    </el-descriptions>

    <el-row :gutter="24" style="margin-top: 24px">
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-num">—</div>
          <div class="metric-label">今日营业额 (M6)</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-num">—</div>
          <div class="metric-label">今日订单 (M6)</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-num">—</div>
          <div class="metric-label">待发货 (M6)</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-num">—</div>
          <div class="metric-label">钱包余额 (M6)</div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert
      style="margin-top: 24px"
      title="M1 — 商家登录 + 员工 RBAC 已就绪"
      type="success"
      :closable="false"
      description="左侧「员工管理」可邀请/管理本店员工。商品、订单、退款、财务、装修等模块将随 M2-M6 逐步上线。"
    />
  </PageContainer>
</template>

<style scoped>
.metric-card {
  text-align: center;
  border-radius: 12px;
}
.metric-num {
  font-size: 32px;
  font-weight: 600;
  color: #e1251b;
  line-height: 1.4;
}
.metric-label {
  margin-top: 4px;
  color: #999;
  font-size: 13px;
}
</style>
