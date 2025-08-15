# Diet Code Backend - AI 饮食规划 Agent

基于 Mastra 框架构建的智能饮食规划后端服务。

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- OpenAI API Key

### 安装步骤

1. **安装依赖**
```bash
npm install
```

2. **环境配置**
```bash
cp .env.example .env
```

3. **编辑 .env 文件**
```bash
# 添加你的 OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here
```

4. **启动开发服务器**
```bash
npm run dev
```

服务器将在 http://localhost:3001 启动

## 📋 可用脚本

- `npm run dev` - 启动开发服务器（热重载）
- `npm run build` - 构建生产版本
- `npm start` - 启动生产服务器
- `npm test` - 运行测试

## 🔧 技术栈

- **框架**: Express.js + TypeScript
- **AI Agent**: Mastra Framework
- **AI 模型**: OpenAI GPT-4
- **内存管理**: Mastra MemoryManager
- **安全**: Helmet + CORS
- **开发工具**: ts-node-dev

## 📊 API 端点

### POST /api/chat
与 AI 营养顾问聊天

**请求体**:
```json
{
  "userId": "string",
  "message": "string"
}
```

**响应**:
```json
{
  "response": "AI回复内容"
}
```

### GET /api/health
健康检查端点

**响应**:
```json
{
  "status": "OK",
  "timestamp": "2025-08-15T14:56:25.000Z"
}
```

## 🤖 Mastra Agent 功能

### 内置工具 (Tools)

1. **calculateBMR** - 基础代谢率计算
   - 使用 Harris-Benedict 公式
   - 考虑年龄、性别、体重、身高、活动水平

2. **generateMeal** - 餐食生成
   - 基于卡路里需求
   - 考虑饮食限制和过敏信息
   - 营养成分自动计算

3. **saveUserPreferences** - 用户偏好存储
   - 本地内存存储
   - 支持持久化（可扩展到数据库）

4. **getUserPreferences** - 用户偏好获取
   - 快速检索用户设置
   - 自动缓存管理

5. **generateDietPlan** - 完整饮食计划生成
   - 多天计划支持
   - 营养均衡分析
   - 个性化建议

### Agent 特性

- 🧠 智能对话理解
- 📊 科学营养计算
- 🍽️ 个性化餐食推荐
- 💾 用户偏好记忆
- 🔄 持续学习优化

## 🏗️ 项目结构

```
backend/
├── src/
│   ├── diet-planning-agent.ts  # 主 Agent 实现
│   ├── server.ts              # Express 服务器
│   └── types/
│       └── index.ts           # TypeScript 类型定义
├── package.json               # 依赖配置
├── tsconfig.json             # TypeScript 配置
├── .env.example              # 环境变量模板
└── README.md                 # 本文件
```

## 🔒 环境变量

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI API 密钥 |
| `PORT` | ❌ | 服务器端口 (默认: 3001) |
| `NODE_ENV` | ❌ | 环境模式 (默认: development) |
| `FRONTEND_URL` | ❌ | 前端 URL (默认: http://localhost:3000) |

## 🔧 配置说明

### Mastra 配置
- 使用 OpenAI GPT-4 作为语言模型
- 本地内存存储（可扩展到 Redis/Database）
- 支持工具调用和记忆管理

### Express 配置
- CORS 跨域支持
- Helmet 安全头
- JSON 请求体解析
- 错误处理中间件

## 🚧 开发注意事项

1. **API Key**: 确保设置有效的 OpenAI API Key
2. **内存管理**: 当前使用本地内存，生产环境建议使用 Redis
3. **错误处理**: 所有 API 调用都有适当的错误处理
4. **类型安全**: 全程使用 TypeScript 确保类型安全

## 📈 扩展计划

- [ ] 数据库集成 (PostgreSQL/MongoDB)
- [ ] 用户认证系统 (JWT)
- [ ] 营养数据库 API 集成
- [ ] 更多饮食计划模板
- [ ] 健康数据追踪
- [ ] 多语言支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！