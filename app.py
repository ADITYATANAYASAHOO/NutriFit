from flask import Flask, render_template, request, jsonify, session, redirect
import pandas as pd
import random

app = Flask(__name__)
app.secret_key = "nutrifit-secret-key-2024"

# Load food database
foods = pd.read_csv("foods.csv")


# =========================
# HOME PAGE
# =========================

@app.route("/")
def home():
    return render_template("index.html")


# =========================
# ACCOUNT / LOGIN PAGE
# =========================

@app.route("/account")
def account():
    return render_template("account.html")


@app.route("/register", methods=["POST"])
def register():
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip()
    password = request.form.get("password", "").strip()

    if not name or not email or not password:
        return render_template(
            "account.html",
            error="All fields are required."
        )

    session["user"] = {
        "name": name,
        "email": email
    }

    return redirect("/setup-profile")


# =========================
# SETUP FITNESS PROFILE PAGE
# =========================

@app.route("/setup-profile")
def setup_profile():
    if "user" not in session:
        return redirect("/account")

    return render_template("setup_profile.html")


# =========================
# PROFILE PAGE (VIEW ONLY)
# =========================

@app.route("/profile")
def profile():
    if "user" not in session:
        return redirect("/account")

    if "profile_data" not in session:
        return redirect("/setup-profile")

    return render_template(
        "profile.html",
        profile_data=session.get("profile_data", {}),
        goals=session.get("goals", {})
    )


# =========================
# CALCULATE GOALS
# =========================

@app.route("/calculate", methods=["POST"])
def calculate():
    if "user" not in session:
        return redirect("/account")

    try:
        age = float(request.form["age"])
        height = float(request.form["height"])
        weight = float(request.form["weight"])
        gender = request.form["gender"]
        activity = float(request.form["activity"])

    except (ValueError, KeyError):
        return render_template(
            "setup_profile.html",
            error="Please enter valid details."
        )

    # Validation

    if age <= 0 or age > 120:
        return render_template(
            "setup_profile.html",
            error="Invalid age"
        )

    if height <= 50 or height > 280:
        return render_template(
            "setup_profile.html",
            error="Invalid height"
        )

    if weight <= 10 or weight > 500:
        return render_template(
            "setup_profile.html",
            error="Invalid weight"
        )

    # BMR Calculation

    if gender == "male":
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
    else:
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161

    maintenance_calories = bmr * activity

    goal = request.form["goal"]

    if goal == "cut":
        calories = maintenance_calories * 0.80   # 20% deficit

    elif goal == "lean_bulk":
        calories = maintenance_calories * 1.08   # slight surplus

    elif goal == "bulk":
        calories = maintenance_calories * 1.15   # higher surplus

    elif goal == "recomp":
        calories = maintenance_calories * 0.92   # slight deficit

    else:
        calories = maintenance_calories

    # Macro Goals

    protein_goal = weight * 2
    fat_goal = weight * 0.8
    carbs_goal = (calories - (protein_goal * 4 + fat_goal * 9)) / 4

    goals = {
        "calories": round(calories),
        "protein": round(protein_goal),
        "carbs": round(carbs_goal),
        "fat": round(fat_goal),
        "goal": goal
    }

    # Save Dashboard Goals

    session["goals"] = goals

    # Save Profile Details
    activity_map = {
        1.2: "Sedentary (No exercise)",
        1.375: "Light Activity",
        1.55: "Moderate (Gym 3–5 days/week)",
        1.725: "Active (Daily Workout)",
        1.9: "Very Active (Athlete)"
    }

    goal_map = {
        "cut": "Fat Loss",
        "lean_bulk": "Lean Bulk",
        "bulk": "Muscle Gain",
        "recomp": "Body Recomposition",
        "maintain": "Maintenance"
    }

    session["profile_data"] = {
        "age": age,
        "height": height,
        "weight": weight,
        "gender": gender,
        "activity": activity_map.get(activity, "Not Set"),
        "goal": goal_map.get(goal, goal)
    }

    session.modified = True

    return redirect("/dashboard")


# =========================
# DASHBOARD
# =========================

@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect("/account")

    goals = session.get("goals")

    if not goals:
        return redirect("/setup-profile")

    return render_template(
    "dashboard.html",
    calories=goals["calories"],
    protein=goals["protein"],
    carbs=goals["carbs"],
    fat=goals["fat"],
    goal=goals["goal"]
)


# =========================
# WORKOUT PAGE
# =========================

@app.route("/workout")
def workout():
    if "user" not in session:
        return redirect("/account")

    return "<h2>Workout section coming soon 💪</h2>"


# =========================
# FOOD API
# =========================

@app.route("/get_food_data", methods=["POST"])
def get_food_data():
    data = request.get_json()

    food_text = data.get("food", "").lower()

    if not food_text:
        return jsonify({
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fat": 0
        })

    try:
        qty = float(data.get("quantity", 1))
        if qty <= 0:
            qty = 1

    except ValueError:
        qty = 1

    match = foods[
        foods["food"].str.lower().str.contains(
            food_text,
            na=False,
            regex=False
        )
    ]

    if match.empty:
        return jsonify({
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fat": 0
        })

    row = match.iloc[0]

    return jsonify({
        "calories": round((row["calories"] * qty) / 100, 2),
        "protein": round((row["protein"] * qty) / 100, 2),
        "carbs": round((row["carbs"] * qty) / 100, 2),
        "fat": round((row["fat"] * qty) / 100, 2)
    })


# =========================
# AUTOCOMPLETE
# =========================

@app.route("/suggest_food")
def suggest_food():
    query = request.args.get("q", "").lower()

    suggestions = foods[
        foods["food"].str.lower().str.contains(query, na=False)
    ]["food"].tolist()

    return jsonify(suggestions[:5])


# =========================
# DELETE ACCOUNT / LOGOUT
# =========================

@app.route("/delete_account", methods=["POST"])
def delete_account():
    session.clear()
    return redirect("/")


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


# =========================
# CHATBOT
# =========================

@app.route("/chat", methods=["POST"])
def chat():
    if "user" not in session:
        return jsonify({
            "reply": "Please login first."
        })

    data = request.get_json()

    msg = data.get("message", "").strip().lower()
    protein = float(data.get("protein", 0))
    goal = float(data.get("goal", 120))

    remaining = goal - protein

    if "protein" in msg:
        if remaining <= 0:
            reply = "🎉 Protein goal completed!"
        else:
            reply = f"You need {remaining:.0f}g more protein."

    elif "eat" in msg:
        reply = "Try paneer, eggs, chicken, or dal."

    else:
        reply = "Ask me about protein or diet."

    return jsonify({
        "reply": reply
    })

@app.route("/dev")
def dev():

    session["user"] = {
        "name": "Aditya",
        "email": "test@nutrifit.com"
    }

    session["profile_data"] = {
        "age": 21,
        "height": 175,
        "weight": 74,
        "gender": "male",
        "activity": "Moderate (Gym 3–5 days/week)",
        "goal": "Body Recomposition"
    }

    session["goals"] = {
        "calories": 2300,
        "protein": 140,
        "carbs": 250,
        "fat": 70,
        "goal": "recomp"
    }

    return redirect("/dashboard")


# =========================
# RUN APP
# =========================

if __name__ == "__main__":
    app.run(debug=True)
