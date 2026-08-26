# 🥗 NutriFit

NutriFit is a full-stack nutrition and fitness tracking web application built with Python, Flask, SQLite, HTML, CSS, and JavaScript.

The application helps users manage their fitness profile, calculate personalized calorie and macronutrient goals, track daily meals, search food nutrition data, monitor progress, and interact with an AI-powered nutrition assistant.

## ✨ Features

- 🔐 User registration and secure login
- 👤 Personalized fitness profile
- 🎯 BMR and TDEE-based calorie calculation
- 💪 Personalized protein, carbohydrate, and fat targets
- 🍽️ Daily meal tracking
- 🔎 Food nutrition lookup using the USDA FoodData Central API
- 📊 Daily calorie and macronutrient progress
- 💧 Water intake tracking
- 🤖 AI-powered NutriBot using the Groq API
- 💬 Persistent NutriBot chat history
- 🗂️ Multiple conversations
- 🔒 Environment-based API key management

## 🛠️ Tech Stack

- **Backend:** Python, Flask
- **Database:** SQLite
- **Frontend:** HTML5, CSS3, JavaScript
- **AI:** Groq API
- **Nutrition Data:** USDA FoodData Central API
- **Authentication:** Flask Sessions + Werkzeug password hashing
- **Configuration:** python-dotenv
- **Version Control:** Git & GitHub

## 🧮 Nutrition System

NutriFit uses the Mifflin-St Jeor equation to estimate Basal Metabolic Rate (BMR).

The estimated Total Daily Energy Expenditure (TDEE) is then calculated using the user's selected activity level.

Based on the user's fitness goal, NutriFit generates personalized calorie and macronutrient targets.

Supported goals include:

- Cutting
- Recomposition
- Lean Bulk
- Bulk

## 🤖 NutriBot

NutriBot is an AI nutrition assistant integrated using the Groq API.

It can use the user's NutriFit data, including:

- Current fitness goal
- Daily calorie target
- Protein target
- Carbohydrate target
- Fat target
- Today's logged meals
- Remaining daily nutrition targets

Chat conversations are stored in SQLite so users can return to previous conversations.

## 🍽️ Food Tracking

Users can search for foods through the USDA FoodData Central API and retrieve nutritional information such as:

- Calories
- Protein
- Carbohydrates
- Fat

Meals can then be added to the user's daily nutrition log and removed when required.

## 🔐 Security

- Passwords are securely hashed using Werkzeug.
- API keys are stored in environment variables.
- `.env` is excluded from Git.
- User-specific data is associated with authenticated user IDs.
- SQL queries use parameterized statements.

flask
python
sqlite
javascript
nutrition
fitness
ai
groq
usda-api
full-stack
```bash
git clone https://github.com/ADITYATANAYASAHOO/NutriFit.git
cd NutriFit
