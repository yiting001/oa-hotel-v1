import {
  Alert,
  Avatar,
  Badge,
  Button,
  Checkbox,
  ConfigProvider,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Popconfirm,
  Radio,
  Result,
  Select,
  Skeleton,
  Space,
  Spin,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Upload,
} from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import ElementPlus from 'element-plus';
import elementZhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import RootApp from './app/App.vue';
import { router } from './app/router';
import './style.css';

const app = createApp(RootApp);
const uiComponents = [
  Alert,
  Avatar,
  Badge,
  Button,
  Checkbox,
  ConfigProvider,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Popconfirm,
  Radio,
  Result,
  Select,
  Skeleton,
  Space,
  Spin,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Upload,
];

uiComponents.forEach((component) => app.use(component));
app.use(ElementPlus, { locale: elementZhCn }).use(createPinia()).use(router).mount('#app');
