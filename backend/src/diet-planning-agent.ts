// 安装依赖
// npm install @mastra/core dotenv

// diet-planning-agent.ts
import { Mastra, Agent, Tool } from '@mastra/core';
import * as dotenv from 'dotenv';

dotenv.config();

// 定义用户偏好接口
interface UserPreferences {
  age: number;
  gender: 'male' | 'female';
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  dietaryRestrictions: string[];
  healthGoals: string[];
  allergies: string[];
}

// 定义营养信息接口
interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

// 定义餐食接口
interface Meal {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: string[];
  nutrition: NutritionInfo;
  prepTime: number;
  instructions: string[];
}

// 定义饮食计划接口
interface DietPlan {
  date: string;
  meals: Meal[];
  totalNutrition: NutritionInfo;
  notes: string[];
}

// 简单的内存存储类
class SimpleMemoryStore {
  private storage: Map<string, any> = new Map();

  async store(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
    console.log(`Stored data for key: ${key}`);
  }

  async retrieve(key: string): Promise<any> {
    const value = this.storage.get(key);
    console.log(`Retrieved data for key: ${key}:`, value ? 'found' : 'not found');
    return value;
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
    console.log(`Deleted data for key: ${key}`);
  }
}

class DietPlanningAgent {
  private mastra: Mastra;
  private memoryStore: SimpleMemoryStore;

  constructor() {
    // 检查 OpenAI API Key
    if (!process.env.OPENAI_API_KEY) {
      console.warn('警告: OPENAI_API_KEY 未设置，某些功能可能无法正常工作');
    }

    this.mastra = new Mastra({
      name: 'diet-planning-agent',
      llm: {
        provider: 'openai',
        name: 'gpt-4',
        config: {
          apiKey: process.env.OPENAI_API_KEY || 'demo-key',
        },
      },
    });

    this.memoryStore = new SimpleMemoryStore();
    this.setupAgent();
  }

  private setupAgent() {
    // 创建计算基础代谢率的工具
    const calculateBMRTool = new Tool({
      name: 'calculateBMR',
      description: '计算用户的基础代谢率（BMR）',
      parameters: {
        type: 'object',
        properties: {
          age: { type: 'number' },
          gender: { type: 'string', enum: ['male', 'female'] },
          weight: { type: 'number' },
          height: { type: 'number' },
          activityLevel: { 
            type: 'string', 
            enum: ['sedentary', 'light', 'moderate', 'very_active', 'extra_active'] 
          },
        },
        required: ['age', 'gender', 'weight', 'height', 'activityLevel'],
      },
      handler: async (params: any) => {
        const { age, gender, weight, height, activityLevel } = params;
        console.log('计算 BMR，参数:', params);
        
        // 使用 Harris-Benedict 公式计算 BMR
        let bmr: number;
        if (gender === 'male') {
          bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
        } else {
          bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        }

        // 根据活动水平调整
        const activityMultipliers = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          very_active: 1.725,
          extra_active: 1.9,
        };

        const totalCalories = bmr * activityMultipliers[activityLevel as keyof typeof activityMultipliers];
        
        const result = {
          bmr: Math.round(bmr),
          totalCaloriesNeeded: Math.round(totalCalories),
        };

        console.log('BMR 计算结果:', result);
        return result;
      },
    });

    // 创建生成餐食建议的工具
    const generateMealTool = new Tool({
      name: 'generateMeal',
      description: '基于用户偏好生成餐食建议',
      parameters: {
        type: 'object',
        properties: {
          mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          calories: { type: 'number' },
          dietaryRestrictions: { type: 'array', items: { type: 'string' } },
          allergies: { type: 'array', items: { type: 'string' } },
          preferences: { type: 'array', items: { type: 'string' } },
        },
        required: ['mealType', 'calories'],
      },
      handler: async (params: any) => {
        const { mealType, calories, dietaryRestrictions = [], allergies = [], preferences = [] } = params;
        console.log('生成餐食，参数:', params);
        
        const mealTemplates = this.getMealTemplates(mealType, dietaryRestrictions, allergies);
        const selectedMeal = this.selectMealBasedOnCalories(mealTemplates, calories);
        
        console.log('生成的餐食:', selectedMeal.name);
        return selectedMeal;
      },
    });

    // 创建保存用户偏好的工具
    const saveUserPreferencesTool = new Tool({
      name: 'saveUserPreferences',
      description: '保存用户的饮食偏好和健康信息',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          preferences: { type: 'object' },
        },
        required: ['userId', 'preferences'],
      },
      handler: async (params: any) => {
        const { userId, preferences } = params;
        console.log('保存用户偏好:', userId);
        await this.memoryStore.store(`user_preferences_${userId}`, preferences);
        return { success: true, message: '用户偏好已保存' };
      },
    });

    // 创建获取用户偏好的工具
    const getUserPreferencesTool = new Tool({
      name: 'getUserPreferences',
      description: '获取用户的饮食偏好和健康信息',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId'],
      },
      handler: async (params: any) => {
        const { userId } = params;
        console.log('获取用户偏好:', userId);
        const preferences = await this.memoryStore.retrieve(`user_preferences_${userId}`);
        return preferences || null;
      },
    });

    // 创建生成完整饮食计划的工具
    const generateDietPlanTool = new Tool({
      name: 'generateDietPlan',
      description: '为用户生成完整的日常饮食计划',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          days: { type: 'number', default: 7 },
          startDate: { type: 'string' },
        },
        required: ['userId'],
      },
      handler: async (params: any) => {
        const { userId, days = 7, startDate = new Date().toISOString().split('T')[0] } = params;
        console.log('生成饮食计划:', { userId, days, startDate });
        
        const preferences = await this.memoryStore.retrieve(`user_preferences_${userId}`) as UserPreferences;
        if (!preferences) {
          return { error: '请先设置用户偏好信息' };
        }

        const bmrData = await calculateBMRTool.handler(preferences);
        const dailyCalories = bmrData.totalCaloriesNeeded;

        const dietPlan = [];
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          
          const dayPlan = await this.generateDayPlan(dailyCalories, preferences, date.toISOString().split('T')[0]);
          dietPlan.push(dayPlan);
        }

        // 保存饮食计划
        await this.memoryStore.store(`diet_plan_${userId}`, dietPlan);
        
        console.log(`生成了 ${days} 天的饮食计划`);
        return dietPlan;
      },
    });

    try {
      // 注册所有工具
      this.mastra.registerTool(calculateBMRTool);
      this.mastra.registerTool(generateMealTool);
      this.mastra.registerTool(saveUserPreferencesTool);
      this.mastra.registerTool(getUserPreferencesTool);
      this.mastra.registerTool(generateDietPlanTool);

      // 创建主 Agent
      this.mastra.createAgent({
        name: 'dietPlanningAgent',
        instructions: `
          你是一个专业的饮食规划助手。你的主要职责是：
          1. 收集用户的基本健康信息和饮食偏好
          2. 基于科学的营养学原理计算用户的营养需求
          3. 生成个性化的饮食计划和餐食建议
          4. 提供营养均衡、美味且符合用户限制条件的餐食
          5. 跟踪用户的饮食历史并提供改进建议

          请始终保持友好、专业的态度，并确保所有建议都基于健康的营养学原理。
          如果用户有特殊的健康状况，建议他们咨询专业的营养师或医生。
        `,
        tools: [
          calculateBMRTool,
          generateMealTool,
          saveUserPreferencesTool,
          getUserPreferencesTool,
          generateDietPlanTool,
        ],
      });

      console.log('Agent 设置完成');
    } catch (error) {
      console.error('设置 Agent 时出错:', error);
      throw error;
    }
  }

  // 生成一天的饮食计划
  private async generateDayPlan(dailyCalories: number, preferences: UserPreferences, date: string): Promise<DietPlan> {
    // 分配卡路里：早餐25%，午餐35%，晚餐30%，零食10%
    const breakfastCalories = Math.round(dailyCalories * 0.25);
    const lunchCalories = Math.round(dailyCalories * 0.35);
    const dinnerCalories = Math.round(dailyCalories * 0.30);
    const snackCalories = Math.round(dailyCalories * 0.10);

    const meals: Meal[] = [];
    let totalNutrition: NutritionInfo = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

    // 生成各餐
    const mealTypes: Array<{ type: 'breakfast' | 'lunch' | 'dinner' | 'snack', calories: number }> = [
      { type: 'breakfast', calories: breakfastCalories },
      { type: 'lunch', calories: lunchCalories },
      { type: 'dinner', calories: dinnerCalories },
      { type: 'snack', calories: snackCalories },
    ];

    for (const mealInfo of mealTypes) {
      const meal = this.selectMealBasedOnCalories(
        this.getMealTemplates(mealInfo.type, preferences.dietaryRestrictions, preferences.allergies),
        mealInfo.calories
      );
      meals.push(meal);
      
      // 累计营养信息
      totalNutrition.calories += meal.nutrition.calories;
      totalNutrition.protein += meal.nutrition.protein;
      totalNutrition.carbs += meal.nutrition.carbs;
      totalNutrition.fat += meal.nutrition.fat;
      totalNutrition.fiber += meal.nutrition.fiber;
    }

    return {
      date,
      meals,
      totalNutrition,
      notes: this.generateNutritionalNotes(totalNutrition, preferences),
    };
  }

  // 获取餐食模板
  private getMealTemplates(mealType: string, dietaryRestrictions: string[], allergies: string[]): Meal[] {
    // 餐食数据库
    const allMeals: Meal[] = [
      // 早餐
      {
        name: '燕麦粥配浆果',
        type: 'breakfast',
        ingredients: ['燕麦片', '牛奶', '蓝莓', '草莓', '蜂蜜'],
        nutrition: { calories: 350, protein: 12, carbs: 65, fat: 8, fiber: 8 },
        prepTime: 10,
        instructions: ['将燕麦片用牛奶煮制', '加入新鲜浆果', '淋上蜂蜜即可'],
      },
      {
        name: '全麦吐司配鸡蛋',
        type: 'breakfast',
        ingredients: ['全麦面包', '鸡蛋', '牛油果', '番茄'],
        nutrition: { calories: 400, protein: 18, carbs: 35, fat: 22, fiber: 6 },
        prepTime: 15,
        instructions: ['煎蛋', '烤面包', '切牛油果和番茄', '组合装盘'],
      },
      {
        name: '豆浆配全麦面包',
        type: 'breakfast',
        ingredients: ['豆浆', '全麦面包', '花生酱', '香蕉'],
        nutrition: { calories: 380, protein: 15, carbs: 55, fat: 12, fiber: 7 },
        prepTime: 8,
        instructions: ['热豆浆', '涂抹花生酱在面包上', '切片香蕉装饰'],
      },
      // 午餐
      {
        name: '鸡胸肉沙拉',
        type: 'lunch',
        ingredients: ['鸡胸肉', '混合绿叶菜', '番茄', '黄瓜', '橄榄油'],
        nutrition: { calories: 450, protein: 35, carbs: 15, fat: 25, fiber: 5 },
        prepTime: 20,
        instructions: ['烤制鸡胸肉', '准备蔬菜', '制作沙拉酱', '组合成沙拉'],
      },
      {
        name: '糙米鱼肉套餐',
        type: 'lunch',
        ingredients: ['三文鱼', '糙米', '西兰花', '胡萝卜'],
        nutrition: { calories: 500, protein: 30, carbs: 45, fat: 18, fiber: 6 },
        prepTime: 25,
        instructions: ['蒸煮糙米', '烤制三文鱼', '蒸蔬菜', '搭配装盘'],
      },
      {
        name: '豆腐蔬菜炒饭',
        type: 'lunch',
        ingredients: ['豆腐', '糙米', '胡萝卜', '豌豆', '生抽'],
        nutrition: { calories: 420, protein: 18, carbs: 60, fat: 12, fiber: 8 },
        prepTime: 18,
        instructions: ['炒制豆腐块', '加入蔬菜翻炒', '加入米饭炒匀', '调味装盘'],
      },
      // 晚餐
      {
        name: '蔬菜炒面',
        type: 'dinner',
        ingredients: ['全麦面条', '彩椒', '洋葱', '豆腐', '生抽'],
        nutrition: { calories: 420, protein: 16, carbs: 65, fat: 12, fiber: 8 },
        prepTime: 20,
        instructions: ['煮面条', '炒制蔬菜和豆腐', '调味拌炒', '装盘食用'],
      },
      {
        name: '蒸蛋羹配蔬菜',
        type: 'dinner',
        ingredients: ['鸡蛋', '牛奶', '西兰花', '胡萝卜', '香菇'],
        nutrition: { calories: 280, protein: 20, carbs: 15, fat: 16, fiber: 4 },
        prepTime: 25,
        instructions: ['制作蒸蛋羹', '蒸制蔬菜', '摆盘装饰'],
      },
      {
        name: '素食汤面',
        type: 'dinner',
        ingredients: ['全麦面条', '白菜', '豆腐', '香菇', '紫菜'],
        nutrition: { calories: 350, protein: 15, carbs: 55, fat: 8, fiber: 6 },
        prepTime: 22,
        instructions: ['煮制面条', '制作蔬菜汤', '组合装碗'],
      },
      // 零食
      {
        name: '坚果酸奶',
        type: 'snack',
        ingredients: ['希腊酸奶', '混合坚果', '蜂蜜'],
        nutrition: { calories: 200, protein: 10, carbs: 15, fat: 12, fiber: 3 },
        prepTime: 5,
        instructions: ['在酸奶中加入坚果', '淋上少量蜂蜜即可'],
      },
      {
        name: '水果拼盘',
        type: 'snack',
        ingredients: ['苹果', '香蕉', '橙子', '葡萄'],
        nutrition: { calories: 150, protein: 2, carbs: 38, fat: 1, fiber: 6 },
        prepTime: 5,
        instructions: ['清洗水果', '切片装盘'],
      },
      {
        name: '全麦饼干配茶',
        type: 'snack',
        ingredients: ['全麦饼干', '绿茶'],
        nutrition: { calories: 120, protein: 3, carbs: 22, fat: 3, fiber: 3 },
        prepTime: 3,
        instructions: ['泡制绿茶', '搭配全麦饼干'],
      },
    ];

    // 根据饮食限制过滤餐食
    return allMeals.filter(meal => {
      if (meal.type !== mealType) return false;
      
      // 检查过敏原
      if (allergies.some(allergy => 
        meal.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes(allergy.toLowerCase())
        )
      )) {
        return false;
      }

      // 检查饮食限制
      if (dietaryRestrictions.includes('素食主义')) {
        const meatIngredients = ['鸡胸肉', '三文鱼', '鸡蛋'];
        if (meal.ingredients.some(ingredient => meatIngredients.includes(ingredient))) {
          return false;
        }
      }

      if (dietaryRestrictions.includes('严格素食主义')) {
        const animalProducts = ['鸡胸肉', '三文鱼', '鸡蛋', '牛奶', '酸奶', '蜂蜜'];
        if (meal.ingredients.some(ingredient => animalProducts.includes(ingredient))) {
          return false;
        }
      }

      return true;
    });
  }

  // 基于卡路里需求选择餐食
  private selectMealBasedOnCalories(meals: Meal[], targetCalories: number): Meal {
    if (meals.length === 0) {
      // 如果没有合适的餐食，返回默认餐食
      return {
        name: '自定义餐食',
        type: 'breakfast',
        ingredients: ['请根据您的限制条件自行准备'],
        nutrition: { 
          calories: targetCalories, 
          protein: Math.round(targetCalories * 0.15 / 4), 
          carbs: Math.round(targetCalories * 0.55 / 4), 
          fat: Math.round(targetCalories * 0.30 / 9), 
          fiber: 25 
        },
        prepTime: 0,
        instructions: ['根据营养需求自行准备餐食'],
      };
    }

    // 找到最接近目标卡路里的餐食
    return meals.reduce((closest, meal) => {
      const currentDiff = Math.abs(meal.nutrition.calories - targetCalories);
      const closestDiff = Math.abs(closest.nutrition.calories - targetCalories);
      return currentDiff < closestDiff ? meal : closest;
    });
  }

  // 生成营养建议
  private generateNutritionalNotes(nutrition: NutritionInfo, preferences: UserPreferences): string[] {
    const notes: string[] = [];

    // 检查蛋白质摄入
    const proteinPerKg = nutrition.protein / preferences.weight;
    if (proteinPerKg < 0.8) {
      notes.push('建议增加蛋白质摄入，每公斤体重需要至少0.8-1.2克蛋白质');
    }

    // 检查纤维摄入
    if (nutrition.fiber < 25) {
      notes.push('建议增加膳食纤维摄入，成人每日推荐25-35克');
    }

    // 检查总热量
    if (nutrition.calories < 1200) {
      notes.push('注意：当前热量摄入较低，请确保营养充足');
    }

    return notes;
  }

  // 启动 Agent
  public async start() {
    try {
      console.log('饮食规划 Agent 启动中...');
      console.log('Agent 已成功启动!');
      return this.mastra;
    } catch (error) {
      console.error('启动 Agent 失败:', error);
      throw error;
    }
  }

  // 处理用户消息
  public async handleUserMessage(userId: string, message: string) {
    try {
      const agent = this.mastra.getAgent('dietPlanningAgent');
      if (!agent) {
        throw new Error('Agent 未找到');
      }

      console.log(`处理用户 ${userId} 的消息: ${message}`);
      
      // 如果没有 API Key，返回模拟响应
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo-key') {
        return this.generateMockResponse(message);
      }

      const response = await agent.generate([{ role: 'user', content: message }], {
        userId,
      });

      return response;
    } catch (error) {
      console.error('处理用户消息时出错:', error);
      return '抱歉，处理您的请求时遇到了问题。请稍后再试。';
    }
  }

  // 生成模拟响应（用于演示）
  private generateMockResponse(message: string): string {
    if (message.includes('BMR') || message.includes('基础代谢')) {
      return '我可以帮您计算基础代谢率！请提供您的年龄、性别、体重、身高和活动水平信息。';
    } else if (message.includes('饮食计划') || message.includes('meal plan')) {
      return '我将为您制定个性化的饮食计划。首先需要了解您的基本信息和健康目标。请告诉我您的年龄、体重、身高、活动水平以及任何饮食限制。';
    } else if (message.includes('减重') || message.includes('减肥')) {
      return '减重需要创造热量赤字。我建议适当降低热量摄入，增加蛋白质比例，并结合规律运动。让我为您制定一个科学的减重饮食计划。';
    } else if (message.includes('增肌')) {
      return '增肌需要充足的蛋白质和适当的热量盈余。建议每公斤体重摄入1.6-2.2克蛋白质，并在训练后及时补充营养。';
    } else {
      return '您好！我是AI营养师，可以帮您制定个性化的饮食计划、计算营养需求、提供健康饮食建议。请告诉我您需要什么帮助？';
    }
  }
}

// 导出 Agent 类
export { DietPlanningAgent };

// 使用示例
async function main() {
  try {
    const dietAgent = new DietPlanningAgent();
    await dietAgent.start();

    // 示例对话
    const response1 = await dietAgent.handleUserMessage('user123', '我想要一个7天的饮食计划');
    console.log('AI回复:', response1);
  } catch (error) {
    console.error('运行示例时出错:', error);
  }
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  main();
}