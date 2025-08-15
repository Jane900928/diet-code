// 安装依赖
// npm install @mastra/core @mastra/memory dotenv

// diet-planning-agent.ts
import { Mastra, Agent, Tool } from '@mastra/core';
import { MemoryManager } from '@mastra/memory';
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

class DietPlanningAgent {
  private mastra: Mastra;
  private memoryManager: MemoryManager;

  constructor() {
    this.mastra = new Mastra({
      name: 'diet-planning-agent',
      llm: {
        provider: 'openai',
        name: 'gpt-4',
        config: {
          apiKey: process.env.OPENAI_API_KEY,
        },
      },
    });

    this.memoryManager = new MemoryManager({
      provider: 'local', // 使用本地存储，生产环境可以切换到数据库
    });

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
        
        return {
          bmr: Math.round(bmr),
          totalCaloriesNeeded: Math.round(totalCalories),
        };
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
        
        // 这里可以集成食谱 API 或使用预定义的餐食数据库
        // 为了演示，我们使用简单的餐食模板
        const mealTemplates = this.getMealTemplates(mealType, dietaryRestrictions, allergies);
        const selectedMeal = this.selectMealBasedOnCalories(mealTemplates, calories);
        
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
        await this.memoryManager.store(`user_preferences_${userId}`, preferences);
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
        const preferences = await this.memoryManager.retrieve(`user_preferences_${userId}`);
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
        
        const preferences = await this.memoryManager.retrieve(`user_preferences_${userId}`) as UserPreferences;
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
        await this.memoryManager.store(`diet_plan_${userId}`, dietPlan);
        
        return dietPlan;
      },
    });

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
    // 这里应该是一个完整的餐食数据库，为了演示简化处理
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
      // 晚餐
      {
        name: '蔬菜炒面',
        type: 'dinner',
        ingredients: ['全麦面条', '彩椒', '洋葱', '豆腐', '生抽'],
        nutrition: { calories: 420, protein: 16, carbs: 65, fat: 12, fiber: 8 },
        prepTime: 20,
        instructions: ['煮面条', '炒制蔬菜和豆腐', '调味拌炒', '装盘食用'],
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
      if (dietaryRestrictions.includes('vegetarian')) {
        const meatIngredients = ['鸡胸肉', '三文鱼', '鸡蛋'];
        if (meal.ingredients.some(ingredient => meatIngredients.includes(ingredient))) {
          return false;
        }
      }

      if (dietaryRestrictions.includes('vegan')) {
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
        nutrition: { calories: targetCalories, protein: targetCalories * 0.15 / 4, carbs: targetCalories * 0.55 / 4, fat: targetCalories * 0.30 / 9, fiber: 25 },
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
    console.log('饮食规划 Agent 已启动!');
    return this.mastra;
  }

  // 处理用户消息
  public async handleUserMessage(userId: string, message: string) {
    const agent = this.mastra.getAgent('dietPlanningAgent');
    if (!agent) {
      throw new Error('Agent 未找到');
    }

    const response = await agent.generate([{ role: 'user', content: message }], {
      userId,
    });

    return response;
  }
}

// 导出 Agent 类
export { DietPlanningAgent };

// 使用示例
async function main() {
  const dietAgent = new DietPlanningAgent();
  await dietAgent.start();

  // 示例：设置用户偏好
  const userPreferences: UserPreferences = {
    age: 30,
    gender: 'female',
    weight: 65,
    height: 165,
    activityLevel: 'moderate',
    dietaryRestrictions: [],
    healthGoals: ['减重', '增加肌肉'],
    allergies: [],
  };

  // 处理用户交互
  console.log('Agent 准备就绪，可以开始对话...');
  
  // 示例对话
  const response1 = await dietAgent.handleUserMessage('user123', '我想要一个7天的饮食计划');
  console.log('AI回复:', response1);
}