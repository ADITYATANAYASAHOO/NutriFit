<<<<<<< HEAD
from flask import Flask, render_template, request, jsonify, session 
=======
from flask import Flask, render_template, request, jsonify, session
>>>>>>> d27401a480c65169b1b9118eaf77ebe7d96996ef
import pandas as pd
import random  
app = Flask(__name__)
app.secret_key = "nutrifit-secret-key-2024"  

foods = pd.read_csv("foods.csv")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/account")
def account():
    return render_template("account.html")


@app.route("/register", methods=["POST"])  
def register():
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip()
    password = request.form.get("password", "").strip()

    if not name or not email or not password:
        return render_template("account.html", error="All fields are required.")

    session["user"] = {"name": name, "email": email}

    return render_template("profile.html")


@app.route("/profile")
def profile():
    return render_template("profile.html")


@app.route("/calculate", methods=["POST"])
def calculate():

    try:
        age = float(request.form["age"])
        height = float(request.form["height"])
        weight = float(request.form["weight"])
    except (ValueError, KeyError):
        return render_template("profile.html", error="Please enter valid numbers.")

    if age <= 0 or age > 120:
        return render_template("profile.html", error="Please enter a valid age (1–120).")
    if height <= 50 or height > 280:
        return render_template("profile.html", error="Please enter a valid height in cm.")
    if weight <= 10 or weight > 500:
        return render_template("profile.html", error="Please enter a valid weight in kg.")

    gender = request.form["gender"]
    activity = float(request.form["activity"])

    if gender == "male":
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161

    maintenance_calories = bmr * activity

    protein_goal = weight * 2
    fat_goal = weight * 0.8
    carbs_goal = (maintenance_calories - (protein_goal * 4 + fat_goal * 9)) / 4

    goals = {
        "calories": round(maintenance_calories),
        "protein": round(protein_goal),
        "carbs": round(carbs_goal),
        "fat": round(fat_goal)
    }

    session["goals"] = goals

    return render_template("dashboard.html", **goals)


@app.route("/dashboard")
def dashboard():
    goals = session.get("goals")
    if not goals:
        return render_template("profile.html", error="Please set your profile first.")
    return render_template("dashboard.html", **goals)


@app.route("/get_food_data", methods=["POST"])
def get_food_data():

    data = request.get_json()
    food_text = data.get("food", "").lower()

    if not food_text:
        return jsonify({"calories": 0, "protein": 0, "carbs": 0, "fat": 0})

    try:
        qty = float(data.get("quantity", 1))
        if qty <= 0: 
            qty = 1
    except:
        qty = 1

    match = foods[foods["food"].str.lower().str.contains(food_text, na=False, regex=False)]

    if match.empty:
        return jsonify({"calories": 0, "protein": 0, "carbs": 0, "fat": 0})

    row = match.iloc[0]

    return jsonify({
        "calories": round(row["calories"] * qty, 2),
        "protein": round(row["protein"] * qty, 2),
        "carbs": round(row["carbs"] * qty, 2),
        "fat": round(row["fat"] * qty, 2)
    })


@app.route("/suggest_food")
def suggest_food():

    query = request.args.get("q", "").lower()

    suggestions = foods[
        foods["food"].str.lower().str.contains(query, na=False)
    ]["food"].tolist()

    return jsonify(suggestions[:5])


@app.route("/chat", methods=["POST"])
def chat():

    data = request.get_json()

    # Normalize: strip whitespace, convert to lowercase so casing never matters
    raw_msg = data.get("message", "")
    msg = raw_msg.strip().lower()

    protein = float(data.get("protein", 0))
    goal    = float(data.get("goal", 120))
    meals   = data.get("meals", [])

    remaining = goal - protein

    # Build meal summary string
    meal_summary = ""
    if meals:
        meal_summary = "So far you've had:\n"
        for m in meals:
            meal_summary += f"- {m['food']}\n"

    tones = [
        "Alright, here's what I think 👇",
        "Got you 💪",
        "Let's break it down 👇",
        "Here's the situation 👇"
    ]
    intro = random.choice(tones)

    # ── Helper: check if ANY keyword from a list appears in the message ──
    def has(keywords):
        return any(k in msg for k in keywords)

    # ── GREETING ──
    if has(["hello", "hi", "hey", "good morning", "good evening", "good afternoon",
            "what's up", "whats up", "howdy", "yo", "namaste", "hii", "helo", "sup"]):
        name = ""
        if "goals" in data:
            name = ""
        reply = "Hey! 👋 I'm NutriBot, your personal nutrition assistant 🥗\n\nYou can ask me things like:\n• What should I eat today?\n• Give me a meal plan\n• How much protein do I have left?\n• Tips for weight loss\n• High protein foods list"

    # ── PROTEIN STATUS ──
    elif has(["protein", "how much protein", "protein left", "protein status",
              "protein remaining", "protein today", "protein intake", "protein progress"]):
        if remaining <= 0:
            reply = f"{intro}\n{meal_summary}\n🎉 You've already hit your protein goal for today! Great work!"
        else:
            reply = f"{intro}\n{meal_summary}\nYou still need {remaining:.0f}g more protein today.\n\nYour goal: {goal:.0f}g\nConsumed: {protein:.0f}g\nRemaining: {remaining:.0f}g"

    # ── WHAT TO EAT / FOOD SUGGESTIONS ──
    elif has(["what should i eat", "what to eat", "suggest food", "food suggestion",
              "recommend food", "what can i eat", "food ideas", "meal ideas",
              "how to complete", "complete my protein", "finish my protein",
              "what food", "suggest something", "suggest me", "food recommend"]):
        if remaining <= 0:
            reply = f"{intro}\nYou've already hit your protein goal today! 💪\n\nFeel free to eat light — fruits, salads, or a small snack work great."
        elif remaining <= 20:
            reply = f"{intro}\nYou only need {remaining:.0f}g more protein — almost there!\n\nQuick options:\n• 2 boiled eggs (~12g)\n• 1 cup Greek yogurt (~10g)\n• 1 bowl dal (~8g)"
        elif remaining <= 40:
            reply = f"{intro}\nYou need {remaining:.0f}g more protein today.\n\nGood options:\n• Paneer bhurji (100g) ~18g protein\n• 3 boiled eggs ~18g protein\n• Chicken tikka (100g) ~25g protein"
        else:
            reply = f"{intro}\nYou're still short by {remaining:.0f}g protein — let's fix that!\n\nBest options:\n• Chicken breast (200g) ~50g protein\n• Protein shake ~25g protein\n• Paneer + Dal combo ~30g protein\n• Soya chunks (50g) ~25g protein"

    # ── MEAL PLAN ──
    elif has(["meal plan", "diet plan", "plan my diet", "plan my meals", "full plan",
              "give me a plan", "create a plan", "daily plan", "weekly plan",
              "what should i eat today", "today's plan", "plan for today"]):
        reply = f"""{intro}

Here's a simple high-protein daily plan:

🌅 Breakfast:
• Oats + Milk + Banana
• 2 Boiled Eggs

☀️ Lunch:
• Roti + Dal + Paneer
• 1 cup Curd

🌙 Dinner:
• Chicken / Paneer + Rice
• Salad on the side

🥤 Snacks:
• Protein shake or handful of peanuts
• Greek yogurt

This plan gives roughly {round(goal)}g protein. Adjust portions based on your remaining goal of {remaining:.0f}g."""

    # ── CALORIES ──
    elif has(["calorie", "calories", "how many calories", "calorie goal",
              "calorie intake", "kcal", "caloric", "energy intake"]):
        reply = f"{intro}\nYour daily calorie goal is set on your dashboard.\n\nGeneral tips to manage calories:\n• Eat more protein — it keeps you full longer\n• Avoid sugary drinks\n• Prefer home-cooked meals\n• Don't skip breakfast"

    # ── WEIGHT LOSS ──
    elif has(["lose weight", "weight loss", "fat loss", "burn fat", "reduce weight",
              "slim down", "get lean", "cut weight", "lose fat", "cutting"]):
        reply = f"""{intro}

Here are effective tips for weight loss:

🔥 Diet:
• Eat in a calorie deficit (eat less than you burn)
• Increase protein intake — helps preserve muscle
• Cut sugary foods and processed snacks
• Drink 2-3 litres of water daily

🏋️ Exercise:
• 30 min cardio 4-5 days/week
• Add strength training to preserve muscle

📊 Tracking:
• Log every meal using NutriFit
• Stay consistent — results take 4-8 weeks"""

    # ── WEIGHT GAIN / BULKING ──
    elif has(["gain weight", "weight gain", "bulk", "bulking", "muscle gain",
              "build muscle", "mass gain", "get bigger", "increase weight"]):
        reply = f"""{intro}

Here are tips for healthy weight/muscle gain:

🍽️ Diet:
• Eat in a calorie surplus (eat more than you burn)
• Aim for {round(goal)}g+ protein daily
• Add healthy calorie-dense foods: nuts, milk, eggs, rice

🏋️ Training:
• Focus on compound lifts: squats, deadlifts, bench press
• Progressive overload — increase weight every week

🛌 Recovery:
• Sleep 7-9 hours every night
• Rest days are important — muscles grow when you rest"""

    # ── HIGH PROTEIN FOODS ──
    elif has(["high protein", "protein rich", "protein foods", "best protein",
              "protein sources", "good protein", "protein list", "foods with protein"]):
        reply = """Here are the best high-protein foods 💪

🥩 Non-Veg:
• Chicken breast — 31g per 100g
• Eggs — 6g per egg
• Tuna / Fish — 25g per 100g
• Paneer — 18g per 100g

🌱 Veg / Vegan:
• Soya chunks — 52g per 100g (dry)
• Tofu — 8g per 100g
• Dal / Lentils — 9g per cup
• Greek yogurt — 10g per 100g
• Peanuts / Peanut butter — 25g per 100g
• Chickpeas — 15g per cup"""

    # ── BMI / BODY STATS ──
    elif has(["bmi", "body mass", "body fat", "ideal weight", "am i healthy",
              "healthy weight", "underweight", "overweight"]):
        reply = """BMI (Body Mass Index) helps estimate healthy weight ranges:

📊 BMI Categories:
• Under 18.5 → Underweight
• 18.5 – 24.9 → Normal / Healthy
• 25.0 – 29.9 → Overweight
• 30.0 and above → Obese

Your goals on NutriFit are calculated using the Mifflin-St Jeor formula which accounts for your age, height, weight and activity level — that's more accurate than BMI alone."""

    # ── WATER / HYDRATION ──
    elif has(["water", "hydration", "how much water", "drink water", "hydrate",
              "fluid intake", "dehydrated"]):
        reply = """💧 Hydration Tips:

• Aim for 2.5 – 3 litres of water per day
• Drink 1 glass of water before every meal
• Increase intake on workout days
• Signs of dehydration: dark urine, fatigue, headaches

Water helps with digestion, energy levels, and even controlling hunger — don't skip it!"""

    # ── SLEEP / RECOVERY ──
    elif has(["sleep", "rest", "recovery", "how much sleep", "tired", "fatigue"]):
        reply = """😴 Sleep & Recovery:

• Aim for 7-9 hours of quality sleep per night
• Muscles grow and repair during sleep — it's as important as your workout
• Poor sleep increases hunger hormones (ghrelin) — leading to overeating
• Avoid screens 1 hour before bed for better sleep quality"""

    # ── MOTIVATION / ENCOURAGEMENT ──
    elif has(["motivate", "motivation", "encourage", "i feel lazy", "not motivated",
              "give up", "tired of dieting", "help me", "i cant", "i can't"]):
        reply = """You've got this! 💪

Remember:
• Progress is progress — even 1% better every day adds up
• Missing one meal doesn't ruin your progress
• The hardest part is starting — you've already done that
• Your future self will thank you for the effort you put in today

Keep logging your meals on NutriFit and stay consistent! 🔥"""

    # ── THANK YOU ──
    elif has(["thanks", "thank you", "thankyou", "thx", "ty", "great", "awesome",
              "nice", "helpful", "good bot", "well done"]):
        reply = "You're welcome! 😊 Keep tracking your meals and hitting those goals. I'm always here if you need help! 💪"

    # ── GOODBYE ──
    elif has(["bye", "goodbye", "see you", "later", "cya", "take care", "exit", "quit"]):
        reply = "Take care! 👋 Keep eating right and stay consistent. See you next time! 🥗"

    # ── WHO ARE YOU ──
    elif has(["who are you", "what are you", "about you", "tell me about yourself",
              "what can you do", "your features", "help", "capabilities"]):
        reply = """I'm NutriBot 🤖 — your AI nutrition assistant inside NutriFit!

Here's what I can help you with:
• 🥗 Food & meal suggestions
• 💪 Protein tracking and status
• 📋 Daily meal plans
• 🏋️ Weight loss or muscle gain tips
• 🍎 High protein food lists
• 💧 Hydration and recovery tips
• 📊 BMI and calorie info

Just ask me anything related to your diet and nutrition!"""

    # ── FALLBACK — unrecognized input ──
    else:
        reply = f"""Hmm, I didn't quite get that 🤔

Here are some things you can ask me:
• "What should I eat today?"
• "How much protein do I have left?"
• "Give me a meal plan"
• "High protein foods list"
• "Tips for weight loss"
• "How much water should I drink?"

Try asking something from the list above! 💬"""

    return jsonify({"reply": reply})


# CHANGED: removed webbrowser.open() — not suitable outside personal dev testing
if __name__ == "__main__":
    app.run(debug=True)
