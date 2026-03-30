let totalCalories = 0
let totalProtein = 0
let totalCarbs = 0
let totalFat = 0
let meals = []
let proteinGoal = 0

function loadState() {
    const saved = localStorage.getItem("nutrifit_state")
    if (saved) {
        const state = JSON.parse(saved)
        totalCalories = state.totalCalories || 0
        totalProtein = state.totalProtein || 0
        totalCarbs = state.totalCarbs || 0
        totalFat = state.totalFat || 0
        meals = state.meals || []
        updateUI()
        // Re-render saved meals into the result div
        const result = document.querySelector(".meal-result")
        if (result) {
            meals.forEach(m => {
                result.innerHTML += `
                <div class="food-item">
                    <strong>${m.food}</strong> x ${m.qty}<br>
                    Calories: ${m.calories} | Protein: ${m.protein}g
                </div>`
            })
        }
    }
}

function saveState() {
    localStorage.setItem("nutrifit_state", JSON.stringify({
        totalCalories, totalProtein, totalCarbs, totalFat, meals
    }))
}

// SET GOAL FROM HTML
function setGoal(value) {
    proteinGoal = Number(value)
    updateUI()
}

function updateUI() {
    const elCal = document.getElementById("total-calories")
    const elPro = document.getElementById("total-protein")
    const elCarb = document.getElementById("total-carbs")
    const elFat = document.getElementById("total-fat")
    const elRem = document.getElementById("remaining-protein")
    const elStatus = document.getElementById("protein-status")

    if (elCal) elCal.innerText = totalCalories.toFixed(2)
    if (elPro) elPro.innerText = totalProtein.toFixed(2)
    if (elCarb) elCarb.innerText = totalCarbs.toFixed(2)
    if (elFat) elFat.innerText = totalFat.toFixed(2)

    const remaining = Math.max(0, proteinGoal - totalProtein)
    if (elRem) elRem.innerText = remaining.toFixed(2)

    if (elStatus) {
        if (proteinGoal === 0) {
            elStatus.innerText = ""
        } else if (totalProtein >= proteinGoal) {
            elStatus.innerText = "🎉 Protein goal reached for today!"
            elStatus.style.color = "#22c55e"
        } else {
            elStatus.innerText = "You are behind by " + remaining.toFixed(0) + "g protein"
            elStatus.style.color = "#facc15"
        }
    }
}

// ================= ADD FOOD =================

function addFood(button) {

    const meal = button.parentElement
    const food = meal.querySelector(".food-input").value
    const qty = meal.querySelector(".food-qty").value

    if (food.trim() === "") {
        alert("Enter food first")
        return
    }

    fetch("/get_food_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food: food, quantity: qty })
    })
    .then(res => res.json())
    .then(data => {

        const result = meal.querySelector(".meal-result")

        if (data.calories === 0) {
            result.innerHTML += "<div class='food-not-found'>Food not found. Try a different name.</div>"
            return
        }

        result.innerHTML += `
        <div class="food-item">
            <strong>${food}</strong> x ${qty} serving(s)<br>
            Calories: ${data.calories} kcal | Protein: ${data.protein}g
        </div>`

        totalCalories += data.calories
        totalProtein += data.protein
        totalCarbs += data.carbs
        totalFat += data.fat

        meals.push({
            food: food,
            qty: qty,
            protein: data.protein,
            calories: data.calories
        })

        updateUI()
        saveState() 

        meal.querySelector(".food-input").value = ""
        meal.querySelector(".food-qty").value = 1
        meal.querySelector(".suggestions").innerHTML = ""

    })
    .catch(err => {
        const result = meal.querySelector(".meal-result")
        result.innerHTML += "<div class='food-not-found'>Could not reach server. Please try again.</div>"
        console.error("Add food error:", err)
    })
}

// ================= AUTOCOMPLETE =================

function getSuggestions(input) {

    const query = input.value
    const box = input.nextElementSibling

    if (query.length === 0) {
        box.innerHTML = ""
        return
    }

    fetch("/suggest_food?q=" + query)
    .then(res => res.json())
    .then(data => {

        box.innerHTML = ""

        data.forEach(food => {
            const div = document.createElement("div")
            div.innerText = food
            div.onclick = () => {
                input.value = food
                box.innerHTML = ""
            }
            box.appendChild(div)
        })

    })
    .catch(err => {
        console.error("Suggestion error:", err)
    })
}

// ================= NUTRIBOT =================

document.addEventListener("DOMContentLoaded", () => {

    loadState() 

    const toggle = document.getElementById("nutriToggle")
    const closeBtn = document.getElementById("nutriClose")

    if (toggle) {
        toggle.onclick = () => {
            document.getElementById("nutriWindow").style.display = "flex"

            if (!document.getElementById("nutriMessages").dataset.greeted) {
                document.getElementById("nutriMessages").innerHTML += `
                <div class="chat-msg bot">
                    <div class="chat-avatar">🤖</div>
                    <div>
                        <div class="chat-bubble">
                            Hey! I'm NutriBot 🥗<br><br>
                            How can I help you today?
                        </div>
                    </div>
                </div>`
                document.getElementById("nutriMessages").dataset.greeted = "true"
            }
        }
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById("nutriWindow").style.display = "none"
        }
    }

    const inputBox = document.getElementById("nutriInput")
    if (inputBox) {
        inputBox.addEventListener("keypress", function (e) {
            if (e.key === "Enter") sendMessage()
        })
    }

    document.querySelectorAll(".food-input").forEach(input => {
        input.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                const addBtn = this.closest(".meal").querySelector("button")
                if (addBtn) addFood(addBtn)
            }
        })
    })

})

// QUICK SUGGESTION CLICK
function quickMsg(text) {
    document.getElementById("nutriInput").value = text
    sendMessage()
}

// ================= SEND MESSAGE =================

function sendMessage() {

    const input = document.getElementById("nutriInput")
    const message = input.value

    if (message.trim() === "") return

    const chatBox = document.getElementById("nutriMessages")

    chatBox.innerHTML += `
    <div class="chat-msg user">
        <div class="chat-bubble">${message}</div>
    </div>`

    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: message,
            protein: totalProtein,
            goal: proteinGoal,
            meals: meals
        })
    })
    .then(res => res.json())
    .then(data => {

        chatBox.innerHTML += `
        <div class="chat-msg bot">
            <div class="chat-avatar">🤖</div>
            <div>
                <div class="chat-bubble">${data.reply}</div>
            </div>
        </div>`

        chatBox.scrollTop = chatBox.scrollHeight

    })
    .catch(err => {
        chatBox.innerHTML += `
        <div class="chat-msg bot">
            <div class="chat-avatar">🤖</div>
            <div>
                <div class="chat-bubble">Sorry, I couldn't connect. Please try again.</div>
            </div>
        </div>`
        console.error("Chat error:", err)
    })

    input.value = ""
}
