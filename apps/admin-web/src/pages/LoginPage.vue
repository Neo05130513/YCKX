<template>
  <div class="login-page">
    <section class="login-hero">
      <div class="login-brand">
        <span>延</span>
        <div>
          <h1>延成科讯管理系统</h1>
          <p>锂电池资产全生命周期与租赁履约管理平台</p>
        </div>
      </div>
      <div class="login-metrics">
        <div><strong>1280</strong><span>电池资产</span></div>
        <div><strong>930</strong><span>租赁中</span></div>
        <div><strong>18</strong><span>待处理告警</span></div>
      </div>
    </section>
    <section class="login-card">
      <h2>登录后台</h2>
      <p>使用内部员工账号进入业务运营中心</p>
      <el-form label-position="top">
        <el-form-item label="账号">
          <el-input v-model.trim="username" size="large" autocomplete="username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
            size="large"
            autocomplete="current-password"
            show-password
            @keyup.enter="login"
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="login"
          >登录后台</el-button
        >
      </el-form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { postMock } from "../api/http";
import { saveAdminSession, type AdminLoginResult } from "../api/session";

const route = useRoute();
const router = useRouter();
const username = ref("admin");
const password = ref("admin123");
const loading = ref(false);

async function login() {
  if (!username.value || !password.value) {
    ElMessage.warning("请输入账号和密码");
    return;
  }
  loading.value = true;
  try {
    const result = await postMock<AdminLoginResult>("/auth/login", {
      username: username.value,
      password: password.value,
    });
    if (result.profile.type !== "INTERNAL") {
      ElMessage.error("当前账号不是内部后台账号");
      return;
    }
    saveAdminSession(result);
    const redirect =
      typeof route.query.redirect === "string" ? route.query.redirect : "/dashboard";
    await router.replace(redirect);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  align-items: center;
  gap: 72px;
  padding: 64px min(8vw, 112px);
  background:
    linear-gradient(180deg, rgba(22, 119, 255, 0.06), transparent 36%),
    #f5f7fa;
}
.login-hero {
  max-width: 680px;
}
.login-brand {
  display: flex;
  align-items: center;
  gap: 18px;
}
.login-brand > span {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  color: #fff;
  background: #1677ff;
  border-radius: 10px;
  font-size: 24px;
  font-weight: 700;
  box-shadow: 0 12px 30px rgba(22, 119, 255, 0.22);
}
.login-brand h1 {
  margin: 0 0 8px;
  color: #1f2329;
  font-size: 32px;
  font-weight: 600;
  line-height: 1.25;
}
.login-brand p {
  margin: 0;
  color: #646a73;
  font-size: 15px;
}
.login-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 56px;
}
.login-metrics div {
  padding: 20px;
  background: #fff;
  border: 1px solid #edf0f4;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
.login-metrics strong {
  display: block;
  color: #1677ff;
  font-size: 28px;
  font-weight: 600;
}
.login-metrics span {
  display: block;
  margin-top: 8px;
  color: #646a73;
  font-size: 13px;
}
.login-card {
  background: #fff;
  border: 1px solid #edf0f4;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}
.login-card h2 {
  margin: 0 0 8px;
  color: #1f2329;
  font-size: 22px;
  font-weight: 600;
}
.login-card p {
  margin: 0 0 24px;
  color: #646a73;
}
.el-button {
  width: 100%;
}
@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 32px 20px;
  }
  .login-metrics {
    margin-top: 32px;
  }
}
@media (max-width: 640px) {
  .login-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
