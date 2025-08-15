import React, { useState, useEffect } from 'react';
import { AlertCircle, User, Calendar, Utensils, Target, Clock, ChefHat } from 'lucide-react';

const DietPlanningApp = () => {
  const [currentStep, setCurrentStep] = useState('profile');
  const [userProfile, setUserProfile] = useState({
    age: '',
    gender: '',
    weight: '',
    height: '',
    activityLevel: '',
    dietaryRestrictions: [],
    healthGoals: [],
    allergies: []
  });
  const [dietPlan, setDietPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');

  // 模拟 BMR 计算
  const calculateBMR = (profile) => {
    const { age, gender, weight, height, activityLevel } = profile;
    
    if (!age || !weight || !height || !gender || !activityLevel) return null;
    
    let bmr;
    if (gender === 'male') {
      bmr = 88.362 + (13.397 * parseFloat(weight)) + (4.799 * parseFloat(height)) - (5.677 * parseFloat(age));
    } else {
      bmr = 447.593 + (9.247 * parseFloat(weight)) + (3.098 * parseFloat(height)) - (4.330 * parseFloat(age));
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very_active: 1.725,
      extra_active: 1.9,
    };

    const totalCalories = bmr * activityMultipliers[activityLevel];
    
    return {
      bmr: Math.round(bmr),
      totalCaloriesNeeded: Math.round(totalCalories),
    };
  };

  // 生成示例饮食计划
  const generateSampleDietPlan = (calories) => {
    const breakfastCalories = Math.round(calories * 0.25);
    const lunchCalories = Math.round(calories * 0.35);
    const dinnerCalories = Math.round(calories * 0.30);
    const snackCalories = Math.round(calories * 0.10);

    const sampleMeals = [
      {
        type: '早餐',
        name: '燕麦粥配浆果',
        calories: breakfastCalories,
        ingredients: ['燕麦片', '牛奶', '蓝莓', '草莓', '蜂蜜'],
        prepTime: 10,
        nutrition: {
          protein: Math.round(breakfastCalories * 0.15 / 4),
          carbs: Math.round(breakfastCalories * 0.55 / 4),
          fat: Math.round(breakfastCalories * 0.30 / 9),
        }
      },
      {
        type: '午餐',
        name: '鸡胸肉沙拉',
        calories: lunchCalories,
        ingredients: ['鸡胸肉', '混合绿叶菜', '番茄', '黄瓜', '橄榄油'],
        prepTime: 20,
        nutrition: {
          protein: Math.round(lunchCalories * 0.25 / 4),
          carbs: Math.round(lunchCalories * 0.35 / 4),
          fat: Math.round(lunchCalories * 0.40 / 9),
        }
      },
      {
        type: '晚餐',
        name: '蔬菜炒面',
        calories: dinnerCalories,
        ingredients: ['全麦面条', '彩椒', '洋葱', '豆腐', '生抽'],
        prepTime: 20,
        nutrition: {
          protein: Math.round(dinnerCalories * 0.18 / 4),
          carbs: Math.round(dinnerCalories * 0.60 / 4),
          fat: Math.round(dinnerCalories * 0.22 / 9),
        }
      },
      {
        type: '零食',
        name: '坚果酸奶',
        calories: snackCalories,
        ingredients: ['希腊酸奶', '混合坚果', '蜂蜜'],
        prepTime: 5,
        nutrition: {
          protein: Math.round(snackCalories * 0.20 / 4),
          carbs: Math.round(snackCalories * 0.30 / 4),
          fat: Math.round(snackCalories * 0.50 / 9),
        }
      }
    ];

    return sampleMeals;
  };

  const handleProfileSubmit = () => {
    const bmrData = calculateBMR(userProfile);
    if (bmrData) {
      const meals = generateSampleDietPlan(bmrData.totalCaloriesNeeded);
      setDietPlan({
        bmr: bmrData.bmr,
        totalCalories: bmrData.totalCaloriesNeeded,
        meals: meals,
        date: new Date().toLocaleDateString('zh-CN')
      });
      setCurrentStep('plan');
    }
  };

  const handleDietaryRestrictionChange = (restriction, checked) => {
    setUserProfile(prev => ({
      ...prev,
      dietaryRestrictions: checked 
        ? [...prev.dietaryRestrictions, restriction]
        : prev.dietaryRestrictions.filter(r => r !== restriction)
    }));
  };

  const handleHealthGoalChange = (goal, checked) => {
    setUserProfile(prev => ({
      ...prev,
      healthGoals: checked 
        ? [...prev.healthGoals, goal]
        : prev.healthGoals.filter(g => g !== goal)
    }));
  };

  const sendMessage = () => {
    if (!currentMessage.trim()) return;
    
    const newMessage = { role: 'user', content: currentMessage };
    setChatMessages(prev => [...prev, newMessage]);
    
    // 模拟 AI 回复
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: `根据您的询问"${currentMessage}"，我建议您${getAIResponse(currentMessage)}`
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
    
    setCurrentMessage('');
  };

  const getAIResponse = (message) => {
    if (message.includes('减重')) {
      return '适当减少碳水化合物摄入，增加蛋白质比例，同时保持规律运动。建议每餐控制在当前计划的80-90%热量。';
    } else if (message.includes('增肌')) {
      return '增加蛋白质摄入量到每公斤体重1.6-2.2克，在训练后30分钟内补充蛋白质，同时确保充足的碳水化合物支持训练。';
    } else if (message.includes('素食')) {
      return '可以用豆类、坚果、种子和全谷物来替代肉类蛋白质。建议多样化植物蛋白来源，确保氨基酸完整性。';
    } else {
      return '保持均衡饮食，定期监测身体状况，必要时咨询专业营养师。我会根据您的具体需求调整饮食计划。';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            <ChefHat className="text-green-600" />
            AI 饮食规划助手
          </h1>
          <p className="text-gray-600 text-lg">基于 Mastra 框架的个性化营养规划系统</p>
        </div>

        {currentStep === 'profile' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="text-blue-600" />
              <h2 className="text-2xl font-semibold">个人信息设置</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">年龄</label>
                  <input
                    type="number"
                    value={userProfile.age}
                    onChange={(e) => setUserProfile(prev => ({...prev, age: e.target.value}))}
                    className="w-full p-2 border rounded-md"
                    placeholder="请输入年龄"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">性别</label>
                  <select
                    value={userProfile.gender}
                    onChange={(e) => setUserProfile(prev => ({...prev, gender: e.target.value}))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">请选择性别</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">体重 (kg)</label>
                  <input
                    type="number"
                    value={userProfile.weight}
                    onChange={(e) => setUserProfile(prev => ({...prev, weight: e.target.value}))}
                    className="w-full p-2 border rounded-md"
                    placeholder="请输入体重"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">身高 (cm)</label>
                  <input
                    type="number"
                    value={userProfile.height}
                    onChange={(e) => setUserProfile(prev => ({...prev, height: e.target.value}))}
                    className="w-full p-2 border rounded-md"
                    placeholder="请输入身高"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">活动水平</label>
                  <select
                    value={userProfile.activityLevel}
                    onChange={(e) => setUserProfile(prev => ({...prev, activityLevel: e.target.value}))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">请选择活动水平</option>
                    <option value="sedentary">久坐（办公室工作，很少运动）</option>
                    <option value="light">轻度活动（每周1-3次轻度运动）</option>
                    <option value="moderate">中度活动（每周3-5次中等运动）</option>
                    <option value="very_active">高度活动（每周6-7次高强度运动）</option>
                    <option value="extra_active">极度活动（每天2次训练或体力劳动）</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">饮食限制</label>
                  <div className="space-y-2">
                    {['素食主义', '严格素食主义', '无麸质', '低钠', '低糖'].map(restriction => (
                      <label key={restriction} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={userProfile.dietaryRestrictions.includes(restriction)}
                          onChange={(e) => handleDietaryRestrictionChange(restriction, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">{restriction}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">健康目标</label>
                  <div className="space-y-2">
                    {['减重', '增肌', '维持体重', '改善消化', '增加能量', '降低胆固醇'].map(goal => (
                      <label key={goal} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={userProfile.healthGoals.includes(goal)}
                          onChange={(e) => handleHealthGoalChange(goal, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">{goal}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">过敏信息</label>
                  <textarea
                    value={userProfile.allergies.join(', ')}
                    onChange={(e) => setUserProfile(prev => ({...prev, allergies: e.target.value.split(', ').filter(a => a.trim())}))}
                    className="w-full p-2 border rounded-md"
                    rows="3"
                    placeholder="请输入过敏食物，用逗号分隔"
                  />
                </div>
              </div>
            </div>
            
            <button
              onClick={handleProfileSubmit}
              disabled={!userProfile.age || !userProfile.gender || !userProfile.weight || !userProfile.height || !userProfile.activityLevel}
              className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              生成饮食计划
            </button>
          </div>
        )}

        {currentStep === 'plan' && dietPlan && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="text-green-600" />
                <h2 className="text-2xl font-semibold">您的营养需求</h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800">基础代谢率</h3>
                  <p className="text-2xl font-bold text-blue-600">{dietPlan.bmr} 卡</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800">每日总需求</h3>
                  <p className="text-2xl font-bold text-green-600">{dietPlan.totalCalories} 卡</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800">计划日期</h3>
                  <p className="text-lg font-semibold text-purple-600">{dietPlan.date}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Utensils className="text-orange-600" />
                <h2 className="text-2xl font-semibold">今日饮食计划</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {dietPlan.meals.map((meal, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-lg">{meal.type}</span>
                    </div>
                    
                    <h3 className="font-medium text-gray-800 mb-2">{meal.name}</h3>
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">食材：</p>
                      <div className="flex flex-wrap gap-1">
                        {meal.ingredients.map((ingredient, i) => (
                          <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>热量:</span>
                        <span className="font-semibold">{meal.calories} 卡</span>
                      </div>
                      <div className="flex justify-between">
                        <span>蛋白质:</span>
                        <span>{meal.nutrition.protein}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>碳水:</span>
                        <span>{meal.nutrition.carbs}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>脂肪:</span>
                        <span>{meal.nutrition.fat}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>准备时间:</span>
                        <span>{meal.prepTime} 分钟</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="text-indigo-600" />
                <h2 className="text-2xl font-semibold">AI 营养顾问</h2>
              </div>
              
              <div className="mb-4 h-64 overflow-y-auto border rounded-md p-4 bg-gray-50">
                {chatMessages.length === 0 ? (
                  <p className="text-gray-500 text-center">
                    您好！我是您的 AI 营养顾问。有什么关于饮食的问题可以问我！
                  </p>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div key={index} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block p-3 rounded-lg max-w-xs ${
                        msg.role === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white border text-gray-800'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 p-2 border rounded-md"
                  placeholder="询问营养问题或请求调整饮食计划..."
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  发送
                </button>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setCurrentStep('profile')}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 mr-4"
              >
                修改个人信息
              </button>
              <button
                onClick={() => {
                  const newPlan = generateSampleDietPlan(dietPlan.totalCalories);
                  setDietPlan(prev => ({...prev, meals: newPlan}));
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
              >
                重新生成计划
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-gray-500">
          <p className="flex items-center justify-center gap-1">
            <AlertCircle className="w-4 h-4" />
            本系统仅供参考，如有特殊健康状况请咨询专业医生或营养师
          </p>
        </div>
      </div>
    </div>
  );
};

export default DietPlanningApp;