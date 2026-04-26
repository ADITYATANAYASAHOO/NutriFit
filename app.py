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
        return render_template("account.html", error="All fields are required.")

    session["user"] = {
        "name": name,
        "email": email
    }

    return redirect("/profile")


# =========================
# FITNESS PROFILE PAGE
# =========================

@app.route("/profile")
def profile():
    if "user" not in session:
        return redirect("/account")

    return render_template(
        "profile.html",
        profile_data=session.get("profile_data", {})
    )


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
            "profile.html",
            error="Please enter valid details."
        )

    # Validation

    if age <= 0 or age > 120:
        return render_template(
            "profile.html",
            error="Invalid age"
        )

    if height <= 50 or height > 280:
        return render_template(
            "profile.html",
            error="Invalid height"
        )

    if weight <= 10 or weight > 500:
        return render_template(
            "profile.html",
            error="Invalid weight"
        )

    # BMR Calculation

    if gender == "male":
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
    else:
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161

    maintenance_calories = bmr * activity

    # Macro Goals

    protein_goal = weight * 2
    fat_goal = weight * 0.8
    carbs_goal = (
        maintenance_calories
        - (protein_goal * 4 + fat_goal * 9)
    ) / 4

    goals = {
        "calories": round(maintenance_calories),
        "protein": round(protein_goal),
        "carbs": round(carbs_goal),
        "fat": round(fat_goal)
    }

    # Save dashboard goals

    session["goals"] = goals

    # Save profile details

    session["profile_data"] = {
        "age": int(age),
        "height": round(height, 1),
        "weight": round(weight, 1),
        "gender": gender.capitalize(),
        "activity": activity
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
        return render_template("profile.html", error="Set profile first")

    return render_template("dashboard.html", **goals)


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
        return jsonify({"calories": 0, "protein": 0, "carbs": 0, "fat": 0})

    try:
        qty = float(data.get("quantity", 1))
        if qty <= 0:
            qty = 1
    except ValueError:
        qty = 1

    match = foods[
        foods["food"].str.lower().str.contains(food_text, na=False, regex=False)
    ]

    if match.empty:
        return jsonify({"calories": 0, "protein": 0, "carbs": 0, "fat": 0})

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
# DELETE / LOGOUT
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
        return jsonify({"reply": "Please login first."})

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

    return jsonify({"reply": reply})


# =========================
# RUN
# =========================

if __name__ == "__main__":
    app.run(debug=True)
