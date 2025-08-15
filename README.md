# Diet Code - AI 饮食规划系统

基于 Mastra 框架构建的智能饮食规划助手，提供个性化营养建议和餐食计划。

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装与运行

1. 克隆项目
```bash
git clone https://github.com/Jane900928/diet-code.git
cd diet-code
```

2. 后端设置
```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 文件，添加你的 OpenAI API Key
npm run dev
```

3. 前端设置
```bash
cd frontend
npm install
npm run dev
```

## 🔧 技术栈

- **后端**: Node.js + TypeScript + Mastra
- **前端**: React + TypeScript + Vite + Tailwind CSS
- **AI**: OpenAI GPT-4
- **营养计算**: Harris-Benedict 公式

## 📊 功能特性

- ✅ 个性化 BMR 计算
- ✅ 智能餐食推荐
- ✅ 营养成分分析
- ✅ AI 营养顾问对话
- ✅ 饮食限制适配
- ✅ 健康目标设定

## 📄 许可证

MIT License