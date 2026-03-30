from flask import Flask, render_template, request, jsonify, session
from flask import redirect
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

    return redirect("/profile")


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
    return redirect("/dashboard")


@app.route("/dashboard")
def dashboard():
    goals = session.get("goals")

    if not goals:
        return redirect("/profile") 

    return render_template("dashboard.html", **goals)


@app.route("/get_food_data", methods=["POST"])
def get_food_data():

    data = request.get_json()
    food_text = data.get("food", "").lower()

    if not food_text:
        return jsonify({"calories": 0, "protein": 0, "carbs": 0, "fat": 0})

    try:
        qty = float(data.get("quantity", 1))
        if qty <= 0:  # CHANGED: guard against 0 or negative quantity
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

    msg = data.get("message", "").lower()
    protein = float(data.get("protein", 0))
    goal = float(data.get("goal", 120))
    meals = data.get("meals", [])

    remaining = goal - protein

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

    if "how to complete" in msg or "what should i eat" in msg:

        if remaining <= 0:
            reply = f"{intro}\nYou're already done for today! Great job 💪"
        elif remaining <= 20:
            reply = f"{intro}\nYou only need {remaining:.0f}g more protein.\nTry 2 eggs or a bowl of dal."
        elif remaining <= 40:
            reply = f"{intro}\nYou need {remaining:.0f}g protein.\nGo for paneer bhurji or 3 eggs."
        else:
            reply = f"{intro}\nYou're short by {remaining:.0f}g protein.\nBest option: chicken breast or a protein smoothie."

    elif "protein" in msg or "status" in msg:
        reply = f"{intro}\n{meal_summary}\nYou still need {remaining:.0f}g protein today."

    elif "hello" in msg or "hi" in msg:
        reply = "Hey 👋 I'm NutriBot! Tell me what you've eaten or ask for suggestions."

    elif "plan" in msg:
        reply = f"""{intro}

Here's a simple plan for you:

Breakfast:
Oats + Milk + Banana

Lunch:
Roti + Dal + Paneer

Dinner:
Chicken / Paneer + Rice

This will help you hit your protein goal easily.
"""

    else:
        reply = "I can help you with protein goals, meals, and diet planning. Just ask 👍"

    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run()
