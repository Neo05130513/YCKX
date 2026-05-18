import "vant/lib/index.css";
import "./styles/main.css";
import { createPinia } from "pinia";
import Vant from "vant";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";

createApp(App).use(createPinia()).use(Vant).use(router).mount("#app");
