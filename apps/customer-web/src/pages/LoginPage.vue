<template>
  <main class="customer-login">
    <section class="login-panel">
      <div class="brand">
        <span>延成科讯</span>
        <h1>客户移动端</h1>
        <p>查看租赁订单、电池状态、账单与售后进度</p>
      </div>

      <div class="role-switch">
        <button :class="{ active: role === 'admin' }" @click="role = 'admin'">
          客户管理员
        </button>
        <button :class="{ active: role === 'staff' }" @click="role = 'staff'">
          客户员工
        </button>
      </div>

      <label>
        手机号
        <input v-model.trim="phone" placeholder="请输入手机号" />
      </label>
      <label>
        验证码
        <input v-model.trim="code" placeholder="默认 123456" />
      </label>

      <button class="primary-btn" :disabled="loading" @click="login">
        {{ loading ? "登录中..." : "进入系统" }}
      </button>
      <p class="login-tip">员工角色默认隐藏账单金额，仅保留订单、电池和报修入口。</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { showToast } from "vant";
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { postMock } from "../api/http";
import {
  saveCustomerSession,
  type CustomerLoginResult,
  type CustomerRole,
} from "../api/customerSession";

const route = useRoute();
const router = useRouter();
const role = ref<CustomerRole>("admin");
const phone = ref("13800138001");
const code = ref("123456");
const loading = ref(false);

watch(role, (nextRole) => {
  phone.value = nextRole === "staff" ? "13800138006" : "13800138001";
});

async function login() {
  if (!phone.value || !code.value) {
    showToast("请输入手机号和验证码");
    return;
  }
  loading.value = true;
  try {
    const result = await postMock<CustomerLoginResult>("/auth/customer-login", {
      phone: phone.value,
      code: code.value,
      role: role.value,
    });
    if (result.profile.type !== "CUSTOMER") {
      showToast("当前账号不是客户移动端账号");
      return;
    }
    saveCustomerSession(result);
    const redirect =
      typeof route.query.redirect === "string" ? route.query.redirect : "/home";
    await router.replace(redirect);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.customer-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: linear-gradient(180deg, #eef5ff 0%, #f8fafc 48%, #ffffff 100%);
}

.login-panel {
  width: min(100%, 390px);
  padding: 24px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
}

.brand span {
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
}

.brand h1 {
  margin: 8px 0 6px;
  font-size: 26px;
}

.brand p,
.login-tip {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.role-switch {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 22px 0 16px;
}

.role-switch button {
  height: 38px;
  border: 1px solid #dbe4f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #334155;
  font: inherit;
}

.role-switch button.active {
  border-color: var(--primary);
  background: #eff6ff;
  color: var(--primary);
  font-weight: 700;
}

label {
  display: block;
  margin-top: 12px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

input {
  width: 100%;
  height: 42px;
  margin-top: 7px;
  padding: 0 12px;
  border: 1px solid #dbe4f0;
  border-radius: 10px;
  font: inherit;
  outline: none;
}

input:focus {
  border-color: var(--primary);
}

.primary-btn {
  width: 100%;
  height: 44px;
  margin: 18px 0 10px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font: inherit;
  font-weight: 700;
}

.primary-btn:disabled {
  opacity: 0.65;
}
</style>
