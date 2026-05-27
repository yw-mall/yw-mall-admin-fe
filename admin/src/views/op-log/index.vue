<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import PageContainer from '@/components/PageContainer.vue'
import { queryOpLog, type OpLogEntryDTO, type OpLogQueryParams } from '@/api/oplog'
import { formatTime } from '@/utils/format'

const loading = ref(false)
const list = ref<OpLogEntryDTO[]>([])
const total = ref(0)

const filter = reactive({
  actorId: undefined as number | undefined,
  actorRole: '',
  method: '',
  path: '',
  statusMin: undefined as number | undefined,
  statusMax: undefined as number | undefined,
  timeRange: null as [Date, Date] | null,
  page: 1,
  pageSize: 20,
})

function buildParams(): OpLogQueryParams {
  const p: OpLogQueryParams = {
    page: filter.page,
    pageSize: filter.pageSize,
  }
  if (filter.actorId) p.actorId = filter.actorId
  if (filter.actorRole) p.actorRole = filter.actorRole
  if (filter.method) p.method = filter.method
  if (filter.path) p.path = filter.path
  if (filter.statusMin != null) p.statusMin = filter.statusMin
  if (filter.statusMax != null) p.statusMax = filter.statusMax
  if (filter.timeRange) {
    p.since = Math.floor(filter.timeRange[0].getTime() / 1000)
    p.until = Math.floor(filter.timeRange[1].getTime() / 1000)
  }
  return p
}

async function fetchList() {
  loading.value = true
  try {
    const resp = await queryOpLog(buildParams())
    list.value = resp.items ?? []
    total.value = resp.total ?? 0
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function onSearch() {
  filter.page = 1
  fetchList()
}

function onReset() {
  filter.actorId = undefined
  filter.actorRole = ''
  filter.method = ''
  filter.path = ''
  filter.statusMin = undefined
  filter.statusMax = undefined
  filter.timeRange = null
  filter.page = 1
  fetchList()
}

function statusTagType(code: number): 'success' | 'warning' | 'danger' | 'info' {
  if (code >= 200 && code < 300) return 'success'
  if (code >= 300 && code < 400) return 'warning'
  if (code >= 400 && code < 500) return 'warning'
  if (code >= 500) return 'danger'
  return 'info'
}

onMounted(fetchList)
</script>

<template>
  <PageContainer title="操作日志">
    <el-form inline style="margin-bottom: 8px">
      <el-form-item label="操作者 ID">
        <el-input-number
          v-model="filter.actorId"
          :controls="false"
          placeholder="全部"
          style="width: 110px"
        />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="filter.actorRole" placeholder="全部" clearable style="width: 110px">
          <el-option label="admin" value="admin" />
          <el-option label="merchant" value="merchant" />
        </el-select>
      </el-form-item>
      <el-form-item label="方法">
        <el-select v-model="filter.method" placeholder="全部" clearable style="width: 110px">
          <el-option label="GET" value="GET" />
          <el-option label="POST" value="POST" />
          <el-option label="PUT" value="PUT" />
          <el-option label="DELETE" value="DELETE" />
          <el-option label="PATCH" value="PATCH" />
        </el-select>
      </el-form-item>
      <el-form-item label="路径">
        <el-input v-model="filter.path" placeholder="模糊匹配" clearable style="width: 160px" />
      </el-form-item>
      <el-form-item label="状态码">
        <el-input-number
          v-model="filter.statusMin"
          :controls="false"
          placeholder="最小"
          style="width: 80px"
        />
        <span style="margin: 0 4px">-</span>
        <el-input-number
          v-model="filter.statusMax"
          :controls="false"
          placeholder="最大"
          style="width: 80px"
        />
      </el-form-item>
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="filter.timeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          style="width: 360px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="时间" width="180">
        <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作者" width="160">
        <template #default="{ row }">{{ row.actorRole }}#{{ row.actorId }}</template>
      </el-table-column>
      <el-table-column prop="method" label="方法" width="90" />
      <el-table-column prop="path" label="路径" show-overflow-tooltip />
      <el-table-column label="状态码" width="90">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.statusCode)" size="small">{{ row.statusCode }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="ip" label="IP" width="140" />
      <el-table-column label="请求体" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.requestBody ? row.requestBody.slice(0, 80) : '' }}
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无数据" /></template>
    </el-table>

    <div style="margin-top: 16px; text-align: right">
      <el-pagination
        v-model:current-page="filter.page"
        v-model:page-size="filter.pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </div>
  </PageContainer>
</template>
